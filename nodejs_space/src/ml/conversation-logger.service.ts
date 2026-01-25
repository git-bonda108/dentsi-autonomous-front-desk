import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Conversation turn for logging
 */
export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    toolArgs?: Record<string, any>;
    toolResult?: any;
    tokensUsed?: number;
    latencyMs?: number;
    sentiment?: number; // -1 to 1
    intent?: string;
  };
}

/**
 * Call summary for training
 */
export interface CallSummary {
  callId: string;
  callSid: string;
  clinicId: string;
  patientId: string | null;
  callerPhone: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  outcome: 'booked' | 'rescheduled' | 'cancelled' | 'inquiry_answered' | 'escalated' | 'abandoned' | 'spam';
  appointmentBooked: boolean;
  patientCreated: boolean;
  toolsUsed: string[];
  turnsCount: number;
  avgSentiment: number;
  qualityScore: number | null;
  wasEscalated: boolean;
  escalationReason: string | null;
}

/**
 * Training example format (OpenAI fine-tuning)
 */
export interface TrainingExample {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  metadata: {
    callId: string;
    outcome: string;
    qualityScore: number | null;
    clinicId: string;
  };
}

/**
 * ConversationLoggerService - Logs all conversations for ML training
 * 
 * Features:
 * - Turn-by-turn conversation logging
 * - Tool call tracking
 * - Outcome classification
 * - Quality scoring
 * - Training data export
 */
@Injectable()
export class ConversationLoggerService {
  private readonly logger = new Logger(ConversationLoggerService.name);

  // In-memory buffer for active calls (flushed to DB on call end)
  private activeCalls: Map<string, {
    turns: ConversationTurn[];
    startTime: Date;
    clinicId: string;
    patientId: string | null;
    callerPhone: string;
    toolsUsed: Set<string>;
  }> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start logging a new call
   */
  startCall(
    callSid: string,
    clinicId: string,
    callerPhone: string,
    patientId: string | null,
  ): void {
    this.logger.log(`Starting conversation log for call: ${callSid}`);
    
    this.activeCalls.set(callSid, {
      turns: [],
      startTime: new Date(),
      clinicId,
      patientId,
      callerPhone,
      toolsUsed: new Set(),
    });
  }

  /**
   * Log a conversation turn
   */
  logTurn(
    callSid: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    metadata?: ConversationTurn['metadata'],
  ): void {
    const call = this.activeCalls.get(callSid);
    if (!call) {
      this.logger.warn(`No active call found for turn logging: ${callSid}`);
      return;
    }

    const turn: ConversationTurn = {
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    call.turns.push(turn);

    // Track tool usage
    if (metadata?.toolName) {
      call.toolsUsed.add(metadata.toolName);
    }

    this.logger.debug(`Logged ${role} turn for call ${callSid}: ${content.substring(0, 50)}...`);
  }

  /**
   * Log a tool call and its result
   */
  logToolCall(
    callSid: string,
    toolName: string,
    args: Record<string, any>,
    result: any,
    latencyMs: number,
  ): void {
    this.logTurn(callSid, 'tool', JSON.stringify(result), {
      toolName,
      toolArgs: args,
      toolResult: result,
      latencyMs,
    });
  }

  /**
   * End call and persist to database
   */
  async endCall(
    callSid: string,
    outcome: CallSummary['outcome'],
    additionalData?: {
      appointmentBooked?: boolean;
      patientCreated?: boolean;
      wasEscalated?: boolean;
      escalationReason?: string;
      qualityScore?: number;
    },
  ): Promise<string | null> {
    const call = this.activeCalls.get(callSid);
    if (!call) {
      this.logger.warn(`No active call found for ending: ${callSid}`);
      return null;
    }

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);

    // Calculate average sentiment from user turns
    const userTurns = call.turns.filter(t => t.role === 'user' && t.metadata?.sentiment !== undefined);
    const avgSentiment = userTurns.length > 0
      ? userTurns.reduce((sum, t) => sum + (t.metadata?.sentiment || 0), 0) / userTurns.length
      : 0;

    try {
      // Update the call record
      const existingCall = await this.prisma.call.findFirst({
        where: { call_sid: callSid },
      });

      if (existingCall) {
        await this.prisma.call.update({
          where: { id: existingCall.id },
          data: {
            duration: durationSeconds,
            status: 'completed',
            outcome,
            sentiment_score: avgSentiment,
            quality_rating: additionalData?.qualityScore,
          },
        });
      }

      // Store conversation logs (matching schema fields)
      const conversationLogs = call.turns.map((turn, index) => ({
        call_id: existingCall?.id || '',
        patient_id: call.patientId,
        turn_number: index + 1,
        role: turn.role,
        content: turn.content,
        intent_detected: turn.metadata?.intent || null,
        entities_extracted: turn.metadata?.toolArgs ? JSON.stringify(turn.metadata.toolArgs) : null,
        response_time_ms: turn.metadata?.latencyMs || null,
        confidence_score: turn.metadata?.sentiment || null,
      }));

      if (existingCall) {
        await this.prisma.conversation_log.createMany({
          data: conversationLogs,
        });
      }

      this.logger.log(
        `Ended call ${callSid}: ${outcome}, ${call.turns.length} turns, ` +
        `${durationSeconds}s, tools: ${Array.from(call.toolsUsed).join(', ') || 'none'}`,
      );

      // Clean up
      this.activeCalls.delete(callSid);

      return existingCall?.id || null;
    } catch (error) {
      this.logger.error(`Failed to persist call log: ${error.message}`);
      this.activeCalls.delete(callSid);
      return null;
    }
  }

  /**
   * Get call statistics for a clinic
   */
  async getCallStats(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCalls: number;
    avgDuration: number;
    outcomeBreakdown: Record<string, number>;
    avgSentiment: number;
    avgQuality: number;
    bookingRate: number;
    escalationRate: number;
    toolUsageBreakdown: Record<string, number>;
  }> {
    const calls = await this.prisma.call.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const totalCalls = calls.length;
    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        avgDuration: 0,
        outcomeBreakdown: {},
        avgSentiment: 0,
        avgQuality: 0,
        bookingRate: 0,
        escalationRate: 0,
        toolUsageBreakdown: {},
      };
    }

    // Calculate metrics
    const avgDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls;
    const outcomeBreakdown: Record<string, number> = {};
    calls.forEach(c => {
      const outcome = c.outcome || 'unknown';
      outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1;
    });

    const withSentiment = calls.filter(c => c.sentiment_score !== null);
    const avgSentiment = withSentiment.length > 0
      ? withSentiment.reduce((sum, c) => sum + (c.sentiment_score || 0), 0) / withSentiment.length
      : 0;

    const withQuality = calls.filter(c => c.quality_rating !== null);
    const avgQuality = withQuality.length > 0
      ? withQuality.reduce((sum, c) => sum + (c.quality_rating || 0), 0) / withQuality.length
      : 0;

    const bookedCalls = calls.filter(c => c.outcome === 'booked').length;
    const bookingRate = bookedCalls / totalCalls;

    const escalatedCalls = calls.filter(c => c.outcome === 'escalated').length;
    const escalationRate = escalatedCalls / totalCalls;

    // Get tool usage from conversation logs (entities_extracted contains tool data)
    const logs = await this.prisma.conversation_log.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        entities_extracted: { not: null },
      },
    });

    const toolUsageBreakdown: Record<string, number> = {};
    logs.forEach(log => {
      if (log.entities_extracted) {
        try {
          const data = JSON.parse(log.entities_extracted);
          if (data.toolName) {
            toolUsageBreakdown[data.toolName] = (toolUsageBreakdown[data.toolName] || 0) + 1;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    return {
      totalCalls,
      avgDuration,
      outcomeBreakdown,
      avgSentiment,
      avgQuality,
      bookingRate,
      escalationRate,
      toolUsageBreakdown,
    };
  }

  /**
   * Analyze sentiment of user message
   * Simple keyword-based analysis (can be enhanced with ML)
   */
  analyzeSentiment(message: string): number {
    const messageLower = message.toLowerCase();
    
    // Positive indicators
    const positiveWords = [
      'thank', 'thanks', 'great', 'perfect', 'wonderful', 'excellent',
      'appreciate', 'helpful', 'good', 'love', 'amazing', 'awesome',
      'happy', 'pleased', 'satisfied', 'yes please', 'sounds good',
    ];

    // Negative indicators
    const negativeWords = [
      'terrible', 'awful', 'horrible', 'worst', 'hate', 'angry',
      'frustrated', 'annoyed', 'disappointed', 'upset', 'ridiculous',
      'unacceptable', 'stupid', 'useless', 'waste', 'never again',
    ];

    // Pain/urgency indicators (slightly negative but expected)
    const urgencyWords = [
      'pain', 'hurts', 'ache', 'bleeding', 'swelling', 'emergency',
    ];

    let score = 0;

    for (const word of positiveWords) {
      if (messageLower.includes(word)) score += 0.2;
    }

    for (const word of negativeWords) {
      if (messageLower.includes(word)) score -= 0.3;
    }

    for (const word of urgencyWords) {
      if (messageLower.includes(word)) score -= 0.1;
    }

    // Clamp between -1 and 1
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Detect intent from user message
   * Simple rule-based (can be enhanced with ML)
   */
  detectIntent(message: string): string {
    const messageLower = message.toLowerCase();

    // Intent patterns
    const intents: { pattern: string[]; intent: string }[] = [
      { pattern: ['book', 'schedule', 'appointment', 'make an appointment'], intent: 'booking' },
      { pattern: ['cancel', 'cancel my', 'can\'t make it'], intent: 'cancellation' },
      { pattern: ['reschedule', 'change', 'move my appointment'], intent: 'reschedule' },
      { pattern: ['when', 'what time', 'upcoming', 'next appointment'], intent: 'inquiry_appointment' },
      { pattern: ['hours', 'open', 'close', 'location', 'address'], intent: 'inquiry_clinic' },
      { pattern: ['insurance', 'covered', 'accept', 'take my'], intent: 'inquiry_insurance' },
      { pattern: ['cost', 'price', 'how much', 'fee'], intent: 'inquiry_pricing' },
      { pattern: ['pain', 'hurts', 'ache', 'problem', 'issue'], intent: 'report_symptom' },
      { pattern: ['emergency', 'urgent', 'asap', 'right away'], intent: 'emergency' },
      { pattern: ['speak to', 'talk to', 'real person', 'human', 'staff'], intent: 'escalation_request' },
      { pattern: ['yes', 'yeah', 'sure', 'okay', 'sounds good', 'that works'], intent: 'confirmation' },
      { pattern: ['no', 'nope', 'not', 'don\'t', 'cancel that'], intent: 'rejection' },
      { pattern: ['thank', 'thanks', 'bye', 'goodbye'], intent: 'farewell' },
      { pattern: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'], intent: 'greeting' },
    ];

    for (const { pattern, intent } of intents) {
      for (const word of pattern) {
        if (messageLower.includes(word)) {
          return intent;
        }
      }
    }

    return 'general';
  }

  /**
   * Get active call count
   */
  getActiveCallCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Get turns for active call (for debugging)
   */
  getActiveTurns(callSid: string): ConversationTurn[] | null {
    return this.activeCalls.get(callSid)?.turns || null;
  }
}
