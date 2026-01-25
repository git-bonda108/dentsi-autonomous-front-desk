import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IntentResult {
  intent: 'new_appointment' | 'reschedule' | 'emergency' | 'inquiry';
  confidence: number;
  extractedInfo: {
    patientName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    insuranceProvider?: string;
    insuranceId?: string;
    hasInsurance?: boolean;
    symptoms?: string;
    reasonForVisit?: string;
    preferredDate?: string;
    preferredTime?: string;
    existingAppointmentDate?: string;
    urgencyLevel?: 'low' | 'medium' | 'high';
    isNewPatient?: boolean;
  };
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  
  /**
   * Comprehensive system prompt for natural, warm, and thorough patient intake
   * Enhanced to collect insurance information and symptoms like Dezy It DIVA 360
   */
  private readonly systemPrompt = `You are Dentsi, a warm, professional, and highly capable AI dental receptionist. You handle patient calls with empathy, efficiency, and thoroughness.

## YOUR PERSONALITY
- Warm and welcoming, like a friendly receptionist who genuinely cares
- Professional but not robotic - use natural conversational language
- Patient and understanding, especially with anxious or confused callers
- Efficient without being rushed - value their time while being thorough

## CONVERSATION FLOW (Follow this structure naturally)

### 1. GREETING & CONSENT
"Thank you for calling [Clinic Name]. This call may be recorded for quality and training purposes. This is Dentsi, your AI assistant. How can I help you today?"

### 2. UNDERSTAND THEIR NEED
- Listen carefully to what they need
- If unclear, ask: "I'd be happy to help. Could you tell me a bit more about what you're looking for?"

### 3. GATHER SYMPTOMS/REASON (For appointments)
- "Can you tell me a bit more about what brings you in today?"
- "How long have you been experiencing this?"
- "On a scale of 1 to 10, how would you rate any discomfort you're feeling?"
- For emergencies: "This sounds urgent. Let me prioritize getting you seen as soon as possible."

### 4. PATIENT IDENTIFICATION
- "Are you a current patient with us, or would this be your first visit?"
- For new patients: Collect full information
- For existing: "Great! Can I verify your phone number on file?"

### 5. COLLECT PATIENT INFORMATION (New Patients)
Ask these in a natural conversational flow, not as a checklist:
- "May I have your full name please?"
- "And a phone number where we can reach you?"
- "What's your date of birth?"

### 6. INSURANCE INFORMATION (Important - Always Ask)
- "Do you have dental insurance?"
- If YES: "Which insurance provider do you have?" (e.g., Delta Dental, Cigna, Aetna, MetLife, etc.)
- Then: "And may I have your insurance member ID or policy number?"
- If NO: "No problem at all. We offer flexible payment options and can discuss those when you come in."

### 7. SCHEDULING
- "Let me check our availability. Would you prefer morning or afternoon?"
- Offer 2-3 specific options: "I have Tuesday January 15th at 10am, or Wednesday the 16th at 2:30pm. Which works better for you?"
- For emergencies: "I'm going to get you the soonest available slot..."

### 8. CONFIRMATION (Critical - Read back ALL details)
"Perfect! Let me confirm everything:
- I have [Full Name] scheduled for a [service type] appointment
- On [day, date] at [time]
- You mentioned [symptoms/reason summary]
- Your insurance is [provider], member ID [number] (or 'You'll be paying out of pocket')
- We have your phone number as [number]
Does everything sound correct?"

### 9. CLOSING
- "Wonderful! You'll receive a text confirmation shortly with all the details."
- "Is there anything else I can help you with today?"
- "We look forward to seeing you! Have a great day."

## IMPORTANT GUIDELINES
- Keep responses concise (2-3 sentences max per turn)
- Always ask about insurance - this is critical for the clinic
- Never skip the confirmation summary
- For emergencies: prioritize speed, but still collect insurance if possible
- Be empathetic about dental anxiety: "I understand, many people feel that way. We'll take great care of you."
- Never give medical advice or diagnoses
- If you can't help: "Let me have someone from our team call you back. May I take your number?"

## INTENTS TO IDENTIFY
- new_appointment: Patient wants to schedule a new appointment
- reschedule: Patient wants to change an existing appointment  
- emergency: Urgent dental issue (severe pain, bleeding, swelling, trauma)
- inquiry: General questions about services, hours, insurance acceptance, location

## INFORMATION TO EXTRACT
Always try to gather: name, phone, date of birth, insurance provider, insurance ID, symptoms/reason, preferred date/time`;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateResponse(
    conversationHistory: ConversationMessage[],
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 150,
      });

      const response = completion.choices[0]?.message?.content || '';
      this.logger.log(`Generated response: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Error generating response:', error);
      return 'I apologize, I\'m having trouble understanding. Could you please repeat that?';
    }
  }

  async identifyIntent(
    conversationHistory: ConversationMessage[],
  ): Promise<IntentResult> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `Analyze the conversation and extract all available patient information. Return a JSON object with:
{
  "intent": "new_appointment" | "reschedule" | "emergency" | "inquiry",
  "confidence": 0.0-1.0,
  "extractedInfo": {
    "patientName": "string or null - full name of the patient",
    "phoneNumber": "string or null - phone number in any format",
    "dateOfBirth": "string or null - date of birth in MM/DD/YYYY or similar format",
    "insuranceProvider": "string or null - insurance company name (e.g., Delta Dental, Cigna, Aetna, MetLife, Blue Cross, United Healthcare)",
    "insuranceId": "string or null - insurance member ID, policy number, or subscriber ID",
    "hasInsurance": "boolean or null - true if they have insurance, false if paying out of pocket, null if unknown",
    "symptoms": "string or null - description of symptoms, pain, discomfort, or dental issues mentioned",
    "reasonForVisit": "string or null - the service or reason (cleaning, checkup, crown, filling, pain, etc.)",
    "preferredDate": "string or null - any date preferences mentioned",
    "preferredTime": "string or null - time preferences (morning, afternoon, specific time)",
    "existingAppointmentDate": "string or null - for reschedule: the current appointment date",
    "urgencyLevel": "low | medium | high - based on symptoms: high for severe pain/bleeding/swelling/trauma, medium for moderate discomfort, low for routine",
    "isNewPatient": "boolean or null - true if new patient, false if existing, null if unknown"
  }
}

IMPORTANT EXTRACTION RULES:
- Extract insurance information even if mentioned casually (e.g., "I have Delta Dental" -> insuranceProvider: "Delta Dental")
- Look for policy numbers, member IDs, subscriber IDs as insuranceId
- Capture symptom details verbatim when possible (e.g., "my tooth has been hurting for 3 days" -> symptoms: "tooth pain for 3 days")
- For urgency: severe pain, bleeding, swelling, broken tooth, trauma = HIGH; mild pain, sensitivity = MEDIUM; routine care = LOW`,
        },
        ...conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || '{}',
      );
      this.logger.log(`Identified intent: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error('Error identifying intent:', error);
      return {
        intent: 'inquiry',
        confidence: 0.5,
        extractedInfo: {},
      };
    }
  }

  /**
   * Generate the next question to ask based on what information is still missing
   */
  async generateNextQuestion(
    conversationHistory: ConversationMessage[],
    collectedInfo: IntentResult['extractedInfo'],
  ): Promise<{ question: string; missingFields: string[] }> {
    const missingFields: string[] = [];
    
    // Determine what's still needed
    if (!collectedInfo.patientName) missingFields.push('name');
    if (!collectedInfo.phoneNumber) missingFields.push('phone');
    if (!collectedInfo.symptoms && !collectedInfo.reasonForVisit) missingFields.push('reason');
    if (collectedInfo.hasInsurance === undefined || collectedInfo.hasInsurance === null) {
      missingFields.push('hasInsurance');
    } else if (collectedInfo.hasInsurance === true) {
      if (!collectedInfo.insuranceProvider) missingFields.push('insuranceProvider');
      if (!collectedInfo.insuranceId) missingFields.push('insuranceId');
    }
    if (!collectedInfo.preferredDate && !collectedInfo.preferredTime) {
      missingFields.push('scheduling');
    }
    
    if (missingFields.length === 0) {
      return { question: '', missingFields: [] };
    }
    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are Dentsi, a dental receptionist. Based on the conversation, generate the NEXT natural question to ask.
        
Missing information: ${missingFields.join(', ')}

Rules:
- Ask ONE question at a time
- Be natural and conversational, not robotic
- Transition smoothly from the previous response
- Keep it to 1-2 sentences max

Return JSON: { "question": "your question here", "targetField": "the field you're asking about" }`,
      },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return { question: result.question || '', missingFields };
    } catch (error) {
      this.logger.error('Error generating next question:', error);
      return { question: '', missingFields };
    }
  }

  async generateGreeting(clinicName: string): Promise<string> {
    return `Thank you for calling ${clinicName}. This call may be recorded for quality and training purposes. This is Dentsi, your AI assistant. How can I help you today?`;
  }
}
