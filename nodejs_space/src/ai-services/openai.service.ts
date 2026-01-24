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
  extractedInfo: Record<string, any>;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  private readonly systemPrompt = `You are Dentra, a friendly and professional AI receptionist for a dental clinic. Your role is to:

1. Greet callers warmly and professionally
2. Identify their needs by listening carefully
3. Ask relevant follow-up questions
4. Extract key information (name, phone, date of birth, reason for visit)
5. Confirm details before finalizing
6. Keep responses concise and natural (2-3 sentences max)
7. Be empathetic and reassuring, especially for dental anxiety

Important guidelines:
- Always introduce yourself as "Dentra, your AI assistant"
- Speak naturally, like a human receptionist would
- If you don't understand, politely ask for clarification
- For emergencies (severe pain, bleeding, trauma), prioritize urgency
- Never make medical diagnoses or give medical advice
- If you can't help, offer to connect them with staff

You should identify one of these intents:
- new_appointment: Patient wants to schedule a new appointment
- reschedule: Patient wants to change an existing appointment
- emergency: Urgent dental issue requiring immediate attention
- inquiry: General questions about services, hours, insurance, etc.`;

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
          content: `Analyze the conversation and identify the caller's intent. Return a JSON object with:
{
  "intent": "new_appointment" | "reschedule" | "emergency" | "inquiry",
  "confidence": 0.0-1.0,
  "extractedInfo": {
    "patientName": "string or null",
    "phoneNumber": "string or null",
    "dateOfBirth": "string or null",
    "reasonForVisit": "string or null",
    "preferredDate": "string or null",
    "existingAppointmentDate": "string or null (for reschedule)",
    "urgencyLevel": "low|medium|high (for emergency)"
  }
}`,
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

  async generateGreeting(clinicName: string): Promise<string> {
    return `Thank you for calling ${clinicName}. This is Dentra, your AI assistant. How can I help you today?`;
  }
}
