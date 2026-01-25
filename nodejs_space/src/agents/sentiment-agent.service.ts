import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'anxious' | 'urgent' | 'frustrated';
  confidence: number;
  emotion: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  speechClarity: 'clear' | 'unclear' | 'mumbled';
  recommendation: string;
  adjustedTone: 'enthusiastic' | 'empathetic' | 'calming' | 'professional' | 'urgent';
}

/**
 * Voice quality assessment
 */
export interface VoiceQualityResult {
  clarity: number; // 0-1
  pacing: 'slow' | 'normal' | 'fast';
  volume: 'quiet' | 'normal' | 'loud';
  backgroundNoise: boolean;
  recommendation: string;
}

/**
 * SentimentAgentService - Analyzes patient sentiment and adjusts conversation tone
 * 
 * This agent:
 * - Analyzes speech text for emotional indicators
 * - Detects urgency and anxiety
 * - Recommends tone adjustments for AI responses
 * - Tracks sentiment changes through conversation
 */
@Injectable()
export class SentimentAgentService {
  private readonly logger = new Logger(SentimentAgentService.name);
  private readonly openai: OpenAI;
  
  // Track sentiment history per call
  private sentimentHistory: Map<string, SentimentResult[]> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Analyze sentiment from patient speech
   */
  async analyzeSentiment(callSid: string, text: string): Promise<SentimentResult> {
    this.logger.log(`Analyzing sentiment for call ${callSid}: "${text.substring(0, 50)}..."`);

    // Quick rule-based analysis for common patterns
    const quickResult = this.quickAnalysis(text);
    
    // For complex cases or when unsure, use AI
    if (quickResult.confidence < 0.7) {
      const aiResult = await this.aiSentimentAnalysis(text);
      if (aiResult) {
        quickResult.sentiment = aiResult.sentiment as any;
        quickResult.emotion = aiResult.emotion;
        quickResult.confidence = aiResult.confidence;
      }
    }

    // Track history
    const history = this.sentimentHistory.get(callSid) || [];
    history.push(quickResult);
    this.sentimentHistory.set(callSid, history);

    return quickResult;
  }

  /**
   * Quick rule-based sentiment analysis
   */
  private quickAnalysis(text: string): SentimentResult {
    const lowerText = text.toLowerCase();
    
    // Urgency indicators (highest priority)
    const urgentPatterns = [
      /emergency/i, /severe pain/i, /bleeding/i, /can't eat/i,
      /swollen/i, /infection/i, /abscess/i, /unbearable/i,
      /need to see.*today/i, /as soon as possible/i, /asap/i,
    ];
    
    const anxiousPatterns = [
      /nervous/i, /scared/i, /afraid/i, /worried/i, /anxious/i,
      /first time/i, /never been/i, /don't like dentist/i,
      /hate the dentist/i, /dental phobia/i,
    ];

    const frustratedPatterns = [
      /frustrated/i, /annoyed/i, /ridiculous/i, /unacceptable/i,
      /been waiting/i, /still waiting/i, /nobody called/i,
      /waste of time/i, /disappointed/i, /upset/i,
    ];

    const positivePatterns = [
      /thank you/i, /great/i, /wonderful/i, /perfect/i, /excellent/i,
      /appreciate/i, /love/i, /happy/i, /pleased/i, /sounds good/i,
    ];

    // Check patterns
    const isUrgent = urgentPatterns.some(p => p.test(lowerText));
    const isAnxious = anxiousPatterns.some(p => p.test(lowerText));
    const isFrustrated = frustratedPatterns.some(p => p.test(lowerText));
    const isPositive = positivePatterns.some(p => p.test(lowerText));

    // Determine result
    let sentiment: SentimentResult['sentiment'] = 'neutral';
    let emotion = 'calm';
    let urgencyLevel: SentimentResult['urgencyLevel'] = 'low';
    let recommendation = 'Continue with normal friendly tone.';
    let adjustedTone: SentimentResult['adjustedTone'] = 'enthusiastic';
    let confidence = 0.6;

    if (isUrgent) {
      sentiment = 'urgent';
      emotion = 'distressed';
      urgencyLevel = 'critical';
      recommendation = 'Prioritize urgency. Show empathy immediately and get them the earliest available slot.';
      adjustedTone = 'urgent';
      confidence = 0.9;
    } else if (isFrustrated) {
      sentiment = 'frustrated';
      emotion = 'annoyed';
      urgencyLevel = 'medium';
      recommendation = 'Acknowledge their frustration. Apologize if appropriate. Consider offering to transfer to staff.';
      adjustedTone = 'empathetic';
      confidence = 0.85;
    } else if (isAnxious) {
      sentiment = 'anxious';
      emotion = 'worried';
      urgencyLevel = 'medium';
      recommendation = 'Be extra reassuring. Use calming language like "You\'re in great hands" and "We\'ll take excellent care of you."';
      adjustedTone = 'calming';
      confidence = 0.85;
    } else if (isPositive) {
      sentiment = 'positive';
      emotion = 'happy';
      urgencyLevel = 'low';
      recommendation = 'Match their positive energy! Be upbeat and enthusiastic.';
      adjustedTone = 'enthusiastic';
      confidence = 0.8;
    }

    // Speech clarity assessment
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const speechClarity: SentimentResult['speechClarity'] = wordCount > 2 ? 'clear' : 'unclear';

    return {
      sentiment,
      confidence,
      emotion,
      urgencyLevel,
      speechClarity,
      recommendation,
      adjustedTone,
    };
  }

  /**
   * AI-powered sentiment analysis for complex cases
   */
  private async aiSentimentAnalysis(text: string): Promise<{
    sentiment: string;
    emotion: string;
    confidence: number;
  } | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis expert for a dental clinic AI. Analyze the patient's speech and return JSON with:
- sentiment: one of "positive", "negative", "neutral", "anxious", "urgent", "frustrated"
- emotion: the primary emotion detected (e.g., "happy", "worried", "annoyed", "distressed")
- confidence: 0-1 confidence score

Respond ONLY with valid JSON.`,
          },
          {
            role: 'user',
            content: `Analyze this patient speech: "${text}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`AI sentiment analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get tone recommendation based on current sentiment
   */
  getToneRecommendation(result: SentimentResult): string {
    switch (result.adjustedTone) {
      case 'urgent':
        return 'Use urgent but calming tone. Show immediate empathy. Phrases: "I understand this is urgent", "Let me help you right away", "I\'m so sorry you\'re dealing with this"';
      case 'calming':
        return 'Use gentle, reassuring tone. Phrases: "You\'re in great hands", "We\'ll take excellent care of you", "There\'s nothing to worry about"';
      case 'empathetic':
        return 'Acknowledge feelings first. Phrases: "I completely understand your frustration", "I apologize for any inconvenience", "Let me make this right for you"';
      case 'enthusiastic':
        return 'Be upbeat and positive! Phrases: "That\'s wonderful!", "Absolutely!", "I\'d be delighted to help!"';
      default:
        return 'Use warm, professional tone. Be friendly but efficient.';
    }
  }

  /**
   * Check if sentiment has changed significantly during call
   */
  getSentimentTrend(callSid: string): 'improving' | 'declining' | 'stable' | 'unknown' {
    const history = this.sentimentHistory.get(callSid);
    if (!history || history.length < 2) {
      return 'unknown';
    }

    const sentimentScores: Record<string, number> = {
      positive: 2,
      neutral: 1,
      anxious: 0,
      frustrated: -1,
      negative: -1,
      urgent: -2,
    };

    const recentScores = history.slice(-3).map(h => sentimentScores[h.sentiment] || 0);
    const trend = recentScores.reduce((a, b, i) => i === 0 ? 0 : a + (b - recentScores[i - 1]), 0);

    if (trend > 0) return 'improving';
    if (trend < 0) return 'declining';
    return 'stable';
  }

  /**
   * Clean up sentiment history for a completed call
   */
  cleanupCall(callSid: string): void {
    this.sentimentHistory.delete(callSid);
  }

  /**
   * Assess voice quality from transcription metadata
   */
  assessVoiceQuality(transcriptConfidence: number, speechDuration: number, wordCount: number): VoiceQualityResult {
    const wordsPerSecond = wordCount / Math.max(speechDuration, 1);
    
    let pacing: VoiceQualityResult['pacing'] = 'normal';
    if (wordsPerSecond < 1.5) pacing = 'slow';
    if (wordsPerSecond > 3.5) pacing = 'fast';

    const clarity = transcriptConfidence;
    const backgroundNoise = transcriptConfidence < 0.7;

    let recommendation = 'Audio quality is good. Continue normally.';
    if (clarity < 0.6) {
      recommendation = 'Audio quality is poor. Ask patient to repeat or speak more clearly.';
    } else if (pacing === 'fast') {
      recommendation = 'Patient is speaking quickly. May need to slow down responses.';
    } else if (pacing === 'slow') {
      recommendation = 'Patient is speaking slowly. Be patient and give them time.';
    }

    return {
      clarity,
      pacing,
      volume: 'normal',
      backgroundNoise,
      recommendation,
    };
  }
}
