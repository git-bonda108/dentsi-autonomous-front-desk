import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService, ConversationMessage } from '../ai-services/openai.service';

export interface Intent {
  type: 'new_appointment' | 'reschedule' | 'emergency' | 'inquiry' | 'unknown';
  confidence: number;
  details?: string;
}

export interface PatientInfo {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  insurance?: string;
  preferredTime?: string;
  serviceType?: string;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  intent?: Intent;
  patientInfo?: PatientInfo;
  clinicId: string;
}

/**
 * VoiceAgent - Conversation Orchestration & Intent Detection
 * 
 * Responsibilities:
 * - Detect user intent from conversation
 * - Extract patient information
 * - Manage multi-turn dialogue
 * - Generate natural responses
 * - Classify patient type (new/existing/emergency)
 */
@Injectable()
export class VoiceAgentService {
  private readonly logger = new Logger(VoiceAgentService.name);

  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Detect intent from user transcript
   */
  async detectIntent(transcript: string, context?: string[]): Promise<Intent> {
    this.logger.log(`[VoiceAgent] Detecting intent from: "${transcript}"`);

    try {
      const conversationHistory: ConversationMessage[] = [
        { role: 'user', content: transcript },
      ];

      const result = await this.openaiService.identifyIntent(conversationHistory);
      
      this.logger.log(`[VoiceAgent] Intent detected: ${result.intent} (confidence: ${result.confidence})`);
      
      return {
        type: result.intent,
        confidence: result.confidence,
        details: JSON.stringify(result.extractedInfo),
      };
    } catch (error) {
      this.logger.error(`[VoiceAgent] Intent detection failed: ${error.message}`);
      return { type: 'unknown', confidence: 0, details: 'Failed to parse intent' };
    }
  }

  /**
   * Extract patient information from conversation
   */
  async extractPatientInfo(conversation: string[]): Promise<PatientInfo> {
    this.logger.log(`[VoiceAgent] Extracting patient info from ${conversation.length} messages`);

    try {
      const conversationHistory: ConversationMessage[] = conversation.map((msg, idx) => ({
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: msg,
      }));

      const result = await this.openaiService.identifyIntent(conversationHistory);
      const extracted = result.extractedInfo;

      const patientInfo: PatientInfo = {
        name: extracted.patientName || undefined,
        phone: extracted.phoneNumber || undefined,
        dateOfBirth: extracted.dateOfBirth || undefined,
        insurance: extracted.insurance || undefined,
        preferredTime: extracted.preferredDate || undefined,
        serviceType: extracted.reasonForVisit || undefined,
      };

      this.logger.log(`[VoiceAgent] Extracted info: ${JSON.stringify(patientInfo)}`);
      return patientInfo;
    } catch (error) {
      this.logger.error(`[VoiceAgent] Info extraction failed: ${error.message}`);
      return {};
    }
  }

  /**
   * Generate natural response based on context
   */
  async generateResponse(context: ConversationContext): Promise<string> {
    this.logger.log(`[VoiceAgent] Generating response for ${context.messages.length} messages`);

    try {
      const response = await this.openaiService.generateResponse(context.messages);
      this.logger.log(`[VoiceAgent] Generated response: "${response}"`);
      return response;
    } catch (error) {
      this.logger.error(`[VoiceAgent] Response generation failed: ${error.message}`);
      return "I apologize, I'm having trouble processing that. Can I have your phone number and I'll have someone call you back?";
    }
  }

  /**
   * Classify patient type
   */
  async classifyPatient(info: PatientInfo): Promise<'new' | 'existing' | 'emergency'> {
    this.logger.log(`[VoiceAgent] Classifying patient: ${JSON.stringify(info)}`);

    // Emergency classification (highest priority)
    if (info.serviceType?.toLowerCase().includes('emergency') ||
        info.serviceType?.toLowerCase().includes('pain') ||
        info.serviceType?.toLowerCase().includes('urgent')) {
      this.logger.log(`[VoiceAgent] Classified as EMERGENCY`);
      return 'emergency';
    }

    // For MVP, assume new patient by default
    this.logger.log(`[VoiceAgent] Classified as NEW (default)`);
    return 'new';
  }

  /**
   * Generate greeting with consent
   */
  generateGreeting(clinicName: string): string {
    return `Thank you for calling ${clinicName}. This call may be recorded for quality and training purposes. This is Dentra, your AI assistant. How can I help you today?`;
  }

  /**
   * Generate confirmation message
   */
  generateConfirmation(appointmentDetails: { date: string; time: string; service: string }): string {
    return `Perfect! I've booked your ${appointmentDetails.service} appointment for ${appointmentDetails.date} at ${appointmentDetails.time}. You'll receive a text confirmation shortly. Is there anything else I can help you with?`;
  }
}
