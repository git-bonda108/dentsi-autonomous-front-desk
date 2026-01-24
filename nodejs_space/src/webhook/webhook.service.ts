import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService, ConversationMessage } from '../ai-services/openai.service';
import { DeepgramService } from '../ai-services/deepgram.service';
import { ElevenLabsService } from '../ai-services/elevenlabs.service';
import { VoiceAgentService } from '../agents/voice-agent.service';
import { SchedulerAgentService } from '../agents/scheduler-agent.service';
import { PolicyAgentService } from '../agents/policy-agent.service';
import { OpsAgentService } from '../agents/ops-agent.service';

interface CallSession {
  callSid: string;
  clinicId: string;
  conversationHistory: ConversationMessage[];
  transcript: string[];
  attemptCount?: number;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private callSessions: Map<string, CallSession> = new Map();

  constructor(
    private prisma: PrismaService,
    private openai: OpenAIService,
    private deepgram: DeepgramService,
    private elevenlabs: ElevenLabsService,
    private voiceAgent: VoiceAgentService,
    private schedulerAgent: SchedulerAgentService,
    private policyAgent: PolicyAgentService,
    private opsAgent: OpsAgentService,
  ) {}

  async handleIncomingCall(to: string, callSid: string): Promise<string> {
    try {
      this.logger.log(`Incoming call: ${callSid} to ${to}`);

      // Find the clinic by phone number
      const clinic = await this.prisma.clinic.findFirst({
        where: { phone: to },
      });

      if (!clinic) {
        this.logger.error(`No clinic found for phone: ${to}`);
        return this.generateErrorTwiML();
      }

      // Initialize call session
      const session: CallSession = {
        callSid,
        clinicId: clinic.id,
        conversationHistory: [],
        transcript: [],
      };
      this.callSessions.set(callSid, session);

      // Create call record
      await this.prisma.call.create({
        data: {
          call_sid: callSid,
          clinic_id: clinic.id,
          status: 'in_progress',
        },
      });

      // Generate greeting
      const greeting = await this.openai.generateGreeting(clinic.name);
      session.conversationHistory.push({
        role: 'assistant',
        content: greeting,
      });

      return this.generateTwiMLResponse(greeting, callSid);
    } catch (error) {
      this.logger.error('Error handling incoming call:', error);
      return this.generateErrorTwiML();
    }
  }

  async handleUserSpeech(
    callSid: string,
    speechResult: string,
  ): Promise<string> {
    try {
      const session = this.callSessions.get(callSid);
      if (!session) {
        this.logger.error(`No session found for call: ${callSid}`);
        return this.generateErrorTwiML();
      }

      // Add user message to conversation
      session.conversationHistory.push({
        role: 'user',
        content: speechResult,
      });
      session.transcript.push(`User: ${speechResult}`);

      // 🎯 STEP 1: VoiceAgent - Detect intent from latest user message
      const intentResult = await this.voiceAgent.detectIntent(speechResult);
      this.logger.log(
        `[Webhook] Intent detected: ${intentResult.type}, Confidence: ${intentResult.confidence}`,
      );

      // 🛡️ STEP 2: PolicyAgent - Check if consent is needed
      if (intentResult.type === 'new_appointment' && !session.attemptCount) {
        const consentRecord = await this.policyAgent.captureConsent(
          callSid,
          true, // consent given
          'verbal',
        );
        this.logger.log('[Webhook] Consent captured:', consentRecord.method);
      }

      let response = '';

      // 🗓️ STEP 3: SchedulerAgent - Handle booking if intent is appointment
      if (intentResult.type === 'new_appointment') {
        // Extract patient info from conversation
        const conversationStrings = session.conversationHistory.map(
          (msg) => `${msg.role}: ${msg.content}`,
        );
        const patientInfo = await this.voiceAgent.extractPatientInfo(
          conversationStrings,
        );

        // Check availability
        const slots = await this.schedulerAgent.checkAvailability(
          session.clinicId,
          'cleaning', // Default service type
          {
            start: new Date(),
            end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
          },
        );

        if (slots.length > 0) {
          const topSlot = slots[0];
          response = `Great! I have availability on ${topSlot.date.toLocaleDateString()} at ${topSlot.time}. Would you like to book this slot?`;

          // If user confirms, book the appointment
          if (
            speechResult.toLowerCase().includes('yes') ||
            speechResult.toLowerCase().includes('sure') ||
            speechResult.toLowerCase().includes('ok')
          ) {
            const bookingResult = await this.schedulerAgent.bookAppointment(
              patientInfo,
              session.clinicId,
              topSlot.date,
              topSlot.time,
              'cleaning',
            );

            if (bookingResult.success) {
              response = bookingResult.message;
              this.logger.log(
                `[Webhook] ✅ Appointment booked: ${bookingResult.appointmentId}`,
              );
            } else {
              response = bookingResult.message;
              this.logger.warn('[Webhook] ⚠️ Booking failed');
            }
          }
        } else {
          // ⚠️ STEP 4: OpsAgent - Handle no availability
          response = this.opsAgent.generateRecoveryMessage('no_availability');
          const failure = await this.opsAgent.handleFailure(
            new Error('No appointment availability'),
            {
              callSid,
              clinicId: session.clinicId,
              intent: intentResult.type,
            },
          );
          this.logger.log(`[Webhook] Failure handled: ${failure.type}`);
        }
      } else {
        // Default: Use VoiceAgent to generate contextual response
        const context = {
          messages: session.conversationHistory,
          intent: intentResult,
          clinicId: session.clinicId,
        };
        response = await this.voiceAgent.generateResponse(context);
      }

      // Add assistant response to history
      session.conversationHistory.push({
        role: 'assistant',
        content: response,
      });
      session.transcript.push(`Dentra: ${response}`);

      // Update call record with transcript
      await this.prisma.call.update({
        where: { call_sid: callSid },
        data: {
          transcript: session.transcript.join('\n'),
        },
      });

      return this.generateTwiMLResponse(response, callSid);
    } catch (error) {
      this.logger.error('[Webhook] Error handling user speech:', error);

      // 🔧 STEP 5: OpsAgent - Handle system errors
      const recoveryMessage = this.opsAgent.generateRecoveryMessage('system_error');
      const session = this.callSessions.get(callSid);
      await this.opsAgent.handleFailure(
        error as Error,
        {
          callSid,
          clinicId: session?.clinicId || '',
        },
      );

      return this.generateTwiMLResponse(recoveryMessage, callSid);
    }
  }

  async handleCallEnd(callSid: string, duration: number): Promise<void> {
    try {
      const session = this.callSessions.get(callSid);
      if (!session) {
        this.logger.warn(`No session found for ended call: ${callSid}`);
        return;
      }

      // Get last user message for intent detection
      const lastUserMessage =
        session.conversationHistory.find(
          (msg, idx) => msg.role === 'user' && idx === session.conversationHistory.length - 2,
        )?.content || 'unknown';

      // 🎯 VoiceAgent - Final intent detection
      const intentResult = await this.voiceAgent.detectIntent(lastUserMessage);

      // Extract patient info
      const conversationStrings = session.conversationHistory.map(
        (msg) => `${msg.role}: ${msg.content}`,
      );
      const patientInfo = await this.voiceAgent.extractPatientInfo(
        conversationStrings,
      );

      // Try to find or create patient if phone number was captured
      let patientId = null;
      if (patientInfo.phone) {
        const patient = await this.prisma.patient.findFirst({
          where: { phone: patientInfo.phone },
        });
        patientId = patient?.id || null;
      }

      // Update call record
      await this.prisma.call.update({
        where: { call_sid: callSid },
        data: {
          patient_id: patientId,
          intent: intentResult.type,
          duration,
          status: 'completed',
          metadata: JSON.stringify({
            intentDetails: intentResult.details,
            patientInfo,
          }),
        },
      });

      // 🛡️ PolicyAgent - Generate audit log for HIPAA compliance
      await this.policyAgent.logPhiAccess(
        callSid,
        'system',
        'call_completed',
        {
          duration,
          intent: intentResult.type,
          patientId,
        },
      );

      // Clean up session
      this.callSessions.delete(callSid);

      this.logger.log(
        `[Webhook] Call completed: ${callSid}, Intent: ${intentResult.type}, Duration: ${duration}s`,
      );
    } catch (error) {
      this.logger.error('[Webhook] Error handling call end:', error);

      // 🔧 OpsAgent - Log failure
      const session = this.callSessions.get(callSid);
      await this.opsAgent.handleFailure(
        error as Error,
        {
          callSid,
          clinicId: session?.clinicId || '',
        },
      );
    }
  }

  private generateTwiMLResponse(message: string, callSid: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${this.escapeXml(message)}</Say>
  <Gather 
    input="speech" 
    timeout="3" 
    speechTimeout="auto" 
    action="/webhook/gather?callSid=${callSid}" 
    method="POST"
  >
  </Gather>
  <Say>I didn't hear anything. Let me transfer you to our staff.</Say>
  <Redirect>/webhook/end?callSid=${callSid}</Redirect>
</Response>`;
  }

  private generateErrorTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, but we're experiencing technical difficulties. Please try calling again later.</Say>
  <Hangup/>
</Response>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  getCallSession(callSid: string): CallSession | undefined {
    return this.callSessions.get(callSid);
  }
}
