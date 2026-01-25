import {
  Controller,
  Post,
  Body,
  Query,
  Logger,
  HttpCode,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { OutboundCallService, OutboundCallType } from '../outbound/outbound-call.service';
import { PrismaService } from '../prisma/prisma.service';
import { DentsiAgentService } from '../agents/dentsi-agent.service';

class DemoConversationDto {
  clinicId?: string;
  sessionId?: string;
  userMessage: string;
  callerPhone?: string;
}

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly outboundCallService: OutboundCallService,
    private readonly prisma: PrismaService,
    private readonly dentsiAgent: DentsiAgentService,
  ) {}

  /**
   * Browser-based demo endpoint - simulates a conversation without Twilio
   * Used for customer demos and testing
   */
  @Post('demo')
  @HttpCode(200)
  @ApiOperation({ summary: 'Demo conversation endpoint (no Twilio required)' })
  @ApiBody({ type: DemoConversationDto })
  async handleDemoConversation(
    @Body() body: DemoConversationDto,
  ): Promise<{
    success: boolean;
    sessionId: string;
    response: string;
    intent?: string;
    patientInfo?: any;
    appointmentBooked?: any;
  }> {
    const sessionId = body.sessionId || `demo-${Date.now()}`;
    this.logger.log(`🎬 Demo conversation: ${sessionId} - "${body.userMessage}"`);

    try {
      // Find clinic or use first one
      let clinicId = body.clinicId;
      if (!clinicId) {
        const firstClinic = await this.prisma.clinic.findFirst();
        clinicId = firstClinic?.id;
      }

      if (!clinicId) {
        return {
          success: false,
          sessionId,
          response: 'No clinic configured. Please add a clinic first.',
        };
      }

      // Check if session exists, if not initialize it
      const existingSession = this.dentsiAgent.getSession(sessionId);
      if (!existingSession) {
        await this.dentsiAgent.initializeSession(
          sessionId,
          clinicId,
          body.callerPhone || '+15551234567',
        );
      }

      // Process the user message
      const result = await this.dentsiAgent.processUserInput(sessionId, body.userMessage);
      const session = this.dentsiAgent.getSession(sessionId);

      return {
        success: true,
        sessionId,
        response: result.message,
        intent: result.intent,
        patientInfo: session?.patientContext,
        appointmentBooked: result.bookingConfirmation,
      };
    } catch (error) {
      this.logger.error(`Demo conversation error: ${error.message}`);
      return {
        success: false,
        sessionId,
        response: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Start a new demo session
   */
  @Post('demo/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a new demo conversation session' })
  async startDemoSession(
    @Body() body: { clinicId?: string; callerPhone?: string },
  ): Promise<{
    success: boolean;
    sessionId: string;
    greeting: string;
    clinicName: string;
  }> {
    const sessionId = `demo-${Date.now()}`;
    this.logger.log(`🎬 Starting demo session: ${sessionId}`);

    try {
      // Find clinic or use first one
      let clinicId = body.clinicId;
      let clinic: any;
      
      if (!clinicId) {
        clinic = await this.prisma.clinic.findFirst();
        clinicId = clinic?.id;
      } else {
        clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
      }

      if (!clinicId || !clinic) {
        return {
          success: false,
          sessionId,
          greeting: 'No clinic configured.',
          clinicName: 'Unknown',
        };
      }

      // Initialize session
      const { greeting } = await this.dentsiAgent.initializeSession(
        sessionId,
        clinicId,
        body.callerPhone || '+15551234567',
      );

      return {
        success: true,
        sessionId,
        greeting,
        clinicName: clinic.name,
      };
    } catch (error) {
      this.logger.error(`Start demo error: ${error.message}`);
      return {
        success: false,
        sessionId,
        greeting: `Error: ${error.message}`,
        clinicName: 'Unknown',
      };
    }
  }

  @Post('voice')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle incoming voice call from Twilio' })
  async handleVoiceCall(
    @Body('To') to: string,
    @Body('From') from: string,
    @Body('CallSid') callSid: string,
  ): Promise<string> {
    this.logger.log(`📞 Voice call from ${from} to ${to}, CallSid: ${callSid}`);
    return await this.webhookService.handleIncomingCall(to, from, callSid);
  }

  @Post('gather')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle speech/DTMF input from caller' })
  async handleGather(
    @Query('callSid') callSid: string,
    @Body('SpeechResult') speechResult: string,
    @Body('Digits') digits: string,
    @Body('CallSid') bodyCallSid: string,
  ): Promise<string> {
    const sid = callSid || bodyCallSid;
    
    // Handle DTMF (keypad) input
    if (digits) {
      this.logger.log(`🔢 DTMF from ${sid}: ${digits}`);
      return await this.webhookService.handleDTMF(sid, digits);
    }
    
    // Handle speech input
    if (speechResult) {
      this.logger.log(`🎤 Speech from ${sid}: "${speechResult}"`);
      return await this.webhookService.handleUserSpeech(sid, speechResult);
    }
    
    // No input received - prompt again
    this.logger.log(`⏳ No input from ${sid}`);
    return await this.webhookService.handleUserSpeech(sid, '[silence]');
  }

  @Post('end')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle call end' })
  async handleEnd(
    @Query('callSid') callSid: string,
    @Body('CallSid') bodyCallSid: string,
    @Body('CallDuration') duration: string,
    @Body('CallStatus') status: string,
  ): Promise<string> {
    const sid = callSid || bodyCallSid;
    const durationNum = parseInt(duration || '0', 10);
    this.logger.log(`📴 Call ended: ${sid}, Duration: ${durationNum}s, Status: ${status}`);
    await this.webhookService.handleCallEnd(sid, durationNum, status || 'completed');
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`;
  }

  @Post('status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle call status updates from Twilio' })
  async handleStatus(
    @Body('CallSid') callSid: string,
    @Body('CallStatus') status: string,
    @Body('CallDuration') duration: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(`📊 Call status update: ${callSid} - ${status}`);
    
    // Handle completed calls
    if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
      const durationNum = parseInt(duration || '0', 10);
      await this.webhookService.handleCallEnd(callSid, durationNum, status);
    }
    
    return { received: true };
  }

  @Post('hold-music')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Provide hold music while waiting for staff' })
  async handleHoldMusic(): Promise<string> {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold. A staff member will be with you shortly.</Say>
  <Play loop="10">https://api.twilio.com/cowbell.mp3</Play>
</Response>`;
  }

  // ==========================================================================
  // OUTBOUND CALL WEBHOOKS
  // ==========================================================================

  @Post('outbound')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle outbound call initiation' })
  async handleOutbound(
    @Query('outboundCallId') outboundCallId: string,
    @Query('callType') callType: string,
    @Query('patientId') patientId: string,
    @Query('appointmentId') appointmentId: string,
  ): Promise<string> {
    this.logger.log(`📤 Outbound call: ${outboundCallId}, type: ${callType}`);

    try {
      // Get patient and appointment info
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { clinic: true, preferred_doctor: true },
      });

      let appointment: any = null;
      if (appointmentId) {
        appointment = await this.prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { doctor: true },
        });
      }

      if (!patient) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, we could not complete this call. Goodbye.</Say>
</Response>`;
      }

      // Generate script
      const script = this.outboundCallService.generateScript(
        callType as OutboundCallType,
        {
          patientName: patient.name,
          clinicName: patient.clinic?.name || 'your dental clinic',
          appointmentDate: appointment?.appointment_date?.toLocaleDateString(),
          appointmentTime: appointment?.start_time || undefined,
          doctorName: appointment?.doctor?.name,
          serviceName: appointment?.service_type,
          daysSinceLastVisit: patient.last_visit_date
            ? Math.floor((Date.now() - patient.last_visit_date.getTime()) / (24 * 60 * 60 * 1000))
            : undefined,
        },
      );

      // Generate TwiML
      return this.outboundCallService.generateOutboundTwiML(script, outboundCallId);
    } catch (error) {
      this.logger.error(`Outbound call error: ${error.message}`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We apologize, but we're having technical difficulties. We'll try calling again later. Goodbye.</Say>
</Response>`;
    }
  }

  @Post('outbound/gather')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle DTMF input during outbound call' })
  async handleOutboundGather(
    @Query('outboundCallId') outboundCallId: string,
    @Body('Digits') digits: string,
  ): Promise<string> {
    this.logger.log(`📤 Outbound DTMF: ${outboundCallId}, digit: ${digits}`);

    try {
      // Get call type from database
      const outboundCall = await this.prisma.outbound_call.findUnique({
        where: { id: outboundCallId },
      });

      if (!outboundCall) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. Goodbye!</Say>
</Response>`;
      }

      return await this.outboundCallService.handleOutboundResponse(
        outboundCallId,
        digits,
        outboundCall.call_type as OutboundCallType,
      );
    } catch (error) {
      this.logger.error(`Outbound gather error: ${error.message}`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for your time. Goodbye!</Say>
</Response>`;
    }
  }

  @Post('outbound/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle outbound call status updates' })
  async handleOutboundStatus(
    @Body('CallSid') callSid: string,
    @Body('CallStatus') callStatus: string,
    @Body('AnsweredBy') answeredBy: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(`📤 Outbound status: ${callSid} - ${callStatus} (answered by: ${answeredBy || 'human'})`);

    await this.outboundCallService.handleStatusCallback(callSid, callStatus, answeredBy);

    return { received: true };
  }
}
