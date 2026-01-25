import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService, ConversationMessage, IntentResult } from '../ai-services/openai.service';

export interface Intent {
  type: 'new_appointment' | 'reschedule' | 'emergency' | 'inquiry' | 'unknown';
  confidence: number;
  details?: string;
}

export interface PatientInfo {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  // Insurance information - critical for billing
  hasInsurance?: boolean;
  insuranceProvider?: string;  // e.g., Delta Dental, Cigna, Aetna, MetLife
  insuranceId?: string;        // Member ID / Policy Number
  // Symptoms and reason
  symptoms?: string;           // Patient's description of their issue
  reasonForVisit?: string;     // Service type: cleaning, filling, crown, etc.
  urgencyLevel?: 'low' | 'medium' | 'high';
  // Scheduling preferences
  preferredDate?: string;
  preferredTime?: string;
  // Patient classification
  isNewPatient?: boolean;
  existingAppointmentDate?: string;  // For reschedules
}

export interface ConversationContext {
  messages: ConversationMessage[];
  intent?: Intent;
  patientInfo?: PatientInfo;
  clinicId: string;
  // Track what info has been collected
  collectionProgress?: {
    hasName: boolean;
    hasPhone: boolean;
    hasSymptoms: boolean;
    hasInsuranceInfo: boolean;
    hasSchedulingPreference: boolean;
  };
}

/**
 * Information collection status - tracks what we still need to gather
 */
export interface CollectionStatus {
  isComplete: boolean;
  missingRequired: string[];
  missingOptional: string[];
  nextQuestion?: string;
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
   * Now includes comprehensive extraction of insurance, symptoms, and all patient details
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
        // Basic info
        name: extracted.patientName || undefined,
        phone: extracted.phoneNumber || undefined,
        dateOfBirth: extracted.dateOfBirth || undefined,
        // Insurance info - critical for billing
        hasInsurance: extracted.hasInsurance ?? undefined,
        insuranceProvider: extracted.insuranceProvider || undefined,
        insuranceId: extracted.insuranceId || undefined,
        // Symptoms and reason
        symptoms: extracted.symptoms || undefined,
        reasonForVisit: extracted.reasonForVisit || undefined,
        urgencyLevel: extracted.urgencyLevel || undefined,
        // Scheduling
        preferredDate: extracted.preferredDate || undefined,
        preferredTime: extracted.preferredTime || undefined,
        // Patient type
        isNewPatient: extracted.isNewPatient ?? undefined,
        existingAppointmentDate: extracted.existingAppointmentDate || undefined,
      };

      this.logger.log(`[VoiceAgent] Extracted info: ${JSON.stringify(patientInfo)}`);
      return patientInfo;
    } catch (error) {
      this.logger.error(`[VoiceAgent] Info extraction failed: ${error.message}`);
      return {};
    }
  }

  /**
   * Check what information is still needed and get the next question to ask
   */
  async getCollectionStatus(patientInfo: PatientInfo, intentType: string): Promise<CollectionStatus> {
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    // Required for all appointments
    if (!patientInfo.name) missingRequired.push('name');
    if (!patientInfo.phone) missingRequired.push('phone');
    
    // Required for new patients
    if (patientInfo.isNewPatient !== false) {
      if (!patientInfo.dateOfBirth) missingOptional.push('dateOfBirth');
    }

    // Insurance is important but not blocking
    if (patientInfo.hasInsurance === undefined) {
      missingRequired.push('hasInsurance');
    } else if (patientInfo.hasInsurance === true) {
      if (!patientInfo.insuranceProvider) missingRequired.push('insuranceProvider');
      if (!patientInfo.insuranceId) missingOptional.push('insuranceId');
    }

    // Symptoms/reason - important for appointment type
    if (!patientInfo.symptoms && !patientInfo.reasonForVisit) {
      missingRequired.push('reasonForVisit');
    }

    // Scheduling preference
    if (!patientInfo.preferredDate && !patientInfo.preferredTime) {
      missingRequired.push('schedulingPreference');
    }

    const isComplete = missingRequired.length === 0;

    return {
      isComplete,
      missingRequired,
      missingOptional,
      nextQuestion: this.getNextQuestionForField(missingRequired[0] || missingOptional[0]),
    };
  }

  /**
   * Get the appropriate question for a missing field
   */
  private getNextQuestionForField(field: string | undefined): string | undefined {
    if (!field) return undefined;

    const questions: Record<string, string> = {
      name: "May I have your full name please?",
      phone: "And a phone number where we can reach you?",
      dateOfBirth: "What's your date of birth?",
      hasInsurance: "Do you have dental insurance?",
      insuranceProvider: "Which insurance provider do you have?",
      insuranceId: "And may I have your insurance member ID or policy number?",
      reasonForVisit: "Can you tell me a bit more about what brings you in today?",
      symptoms: "Can you describe what you're experiencing?",
      schedulingPreference: "Would you prefer a morning or afternoon appointment?",
    };

    return questions[field];
  }

  /**
   * Generate a question to ask about insurance
   */
  generateInsuranceQuestion(patientInfo: PatientInfo): string {
    if (patientInfo.hasInsurance === undefined) {
      return "Do you have dental insurance?";
    }
    if (patientInfo.hasInsurance === true && !patientInfo.insuranceProvider) {
      return "Which insurance provider do you have?";
    }
    if (patientInfo.hasInsurance === true && patientInfo.insuranceProvider && !patientInfo.insuranceId) {
      return `Great, you have ${patientInfo.insuranceProvider}. May I have your member ID or policy number?`;
    }
    return "";
  }

  /**
   * Generate a question to gather symptom information
   */
  generateSymptomsQuestion(patientInfo: PatientInfo): string {
    if (!patientInfo.symptoms && !patientInfo.reasonForVisit) {
      return "Can you tell me a bit more about what brings you in today?";
    }
    if (patientInfo.reasonForVisit && !patientInfo.symptoms) {
      return `You mentioned you need a ${patientInfo.reasonForVisit}. Is there anything specific you'd like the dentist to know?`;
    }
    return "";
  }

  /**
   * Generate comprehensive confirmation summary before booking
   * This reads back ALL collected information to the patient
   */
  generateConfirmationSummary(patientInfo: PatientInfo, appointmentDetails: { 
    date: string; 
    time: string; 
    service: string;
    clinicName?: string;
  }): string {
    const parts: string[] = [];
    
    parts.push(`Perfect! Let me confirm everything:`);
    
    // Name and appointment
    parts.push(`I have ${patientInfo.name || 'you'} scheduled for a ${appointmentDetails.service} appointment on ${appointmentDetails.date} at ${appointmentDetails.time}.`);
    
    // Symptoms/reason if available
    if (patientInfo.symptoms) {
      parts.push(`You mentioned ${patientInfo.symptoms}.`);
    }
    
    // Insurance information
    if (patientInfo.hasInsurance === true && patientInfo.insuranceProvider) {
      let insuranceText = `Your insurance is ${patientInfo.insuranceProvider}`;
      if (patientInfo.insuranceId) {
        insuranceText += `, member ID ${patientInfo.insuranceId}`;
      }
      parts.push(insuranceText + '.');
    } else if (patientInfo.hasInsurance === false) {
      parts.push("You'll be paying out of pocket, and we can discuss payment options when you arrive.");
    }
    
    // Phone confirmation
    if (patientInfo.phone) {
      parts.push(`We have your phone number as ${patientInfo.phone}.`);
    }
    
    parts.push("Does everything sound correct?");
    
    return parts.join(' ');
  }

  /**
   * Generate the final booking confirmation message
   */
  generateFinalConfirmation(appointmentDetails: { 
    date: string; 
    time: string; 
    service: string 
  }): string {
    return `Wonderful! Your ${appointmentDetails.service} appointment is confirmed for ${appointmentDetails.date} at ${appointmentDetails.time}. You'll receive a text confirmation shortly with all the details. Is there anything else I can help you with today?`;
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
   * Classify patient type based on symptoms and context
   */
  async classifyPatient(info: PatientInfo): Promise<'new' | 'existing' | 'emergency'> {
    this.logger.log(`[VoiceAgent] Classifying patient: ${JSON.stringify(info)}`);

    // Emergency classification (highest priority) - check urgency level first
    if (info.urgencyLevel === 'high') {
      this.logger.log(`[VoiceAgent] Classified as EMERGENCY (high urgency)`);
      return 'emergency';
    }

    // Check symptoms and reason for emergency keywords
    const emergencyKeywords = ['emergency', 'severe pain', 'bleeding', 'swelling', 'broken', 'trauma', 'knocked out', 'abscess', 'can\'t sleep', 'unbearable'];
    const combinedText = `${info.symptoms || ''} ${info.reasonForVisit || ''}`.toLowerCase();
    
    for (const keyword of emergencyKeywords) {
      if (combinedText.includes(keyword)) {
        this.logger.log(`[VoiceAgent] Classified as EMERGENCY (keyword: ${keyword})`);
        return 'emergency';
      }
    }

    // Check if explicitly new or existing patient
    if (info.isNewPatient === false) {
      this.logger.log(`[VoiceAgent] Classified as EXISTING`);
      return 'existing';
    }

    // Default to new patient
    this.logger.log(`[VoiceAgent] Classified as NEW (default)`);
    return 'new';
  }

  /**
   * Generate greeting with consent - warm and professional
   */
  generateGreeting(clinicName: string): string {
    return `Thank you for calling ${clinicName}. This call may be recorded for quality and training purposes. This is Dentsi, your AI assistant. How can I help you today?`;
  }

  /**
   * Generate confirmation message (simple version - use generateConfirmationSummary for full version)
   */
  generateConfirmation(appointmentDetails: { date: string; time: string; service: string }): string {
    return `Perfect! I've booked your ${appointmentDetails.service} appointment for ${appointmentDetails.date} at ${appointmentDetails.time}. You'll receive a text confirmation shortly. Is there anything else I can help you with?`;
  }

  /**
   * Generate empathetic response for dental anxiety
   */
  generateAnxietyResponse(): string {
    const responses = [
      "I completely understand, many people feel that way about dental visits. Our team is very gentle and we'll take great care of you.",
      "That's totally normal to feel that way. We have a very caring team and we'll make sure you're comfortable throughout your visit.",
      "I hear you, dental anxiety is very common. We're here to help and will go at your pace to make sure you're comfortable.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Generate response for when patient has no insurance
   */
  generateNoInsuranceResponse(): string {
    return "No problem at all. We offer flexible payment options and can discuss those when you come in. Many of our patients pay out of pocket and we're happy to work with you.";
  }

  /**
   * Generate escalation message when AI can't help
   */
  generateEscalationMessage(): string {
    return "I want to make sure you get the best assistance. Let me have someone from our team call you back. May I confirm the best number to reach you?";
  }

  /**
   * Generate closing message
   */
  generateClosingMessage(patientName?: string): string {
    const name = patientName ? `, ${patientName.split(' ')[0]}` : '';
    return `Thank you for calling${name}. We look forward to seeing you! Have a wonderful day.`;
  }
}
