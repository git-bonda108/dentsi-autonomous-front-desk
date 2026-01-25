import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Twilio } from 'twilio';

/**
 * Outbound call types
 */
export type OutboundCallType = 
  | 'appointment_reminder'    // 24h before appointment
  | 'appointment_confirmation' // Confirm attendance
  | 'follow_up'               // Post-treatment check-in
  | 'recall'                  // Overdue for cleaning/checkup
  | 'no_show_reschedule'      // After missed appointment
  | 'custom';                 // Custom campaign

/**
 * Outbound call status
 */
export type OutboundCallStatus = 
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'no_answer'
  | 'voicemail'
  | 'cancelled';

/**
 * Outbound call record
 */
export interface OutboundCallRecord {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  appointmentId?: string;
  callType: OutboundCallType;
  status: OutboundCallStatus;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  outcome?: string;
  notes?: string;
}

/**
 * Call script template
 */
export interface CallScript {
  greeting: string;
  mainMessage: string;
  confirmationPrompt?: string;
  rescheduleOffer?: string;
  closing: string;
}

/**
 * OutboundCallService - Manages outbound calls via Twilio
 * 
 * Features:
 * - Appointment reminders (24h before)
 * - Confirmation calls
 * - Follow-up calls
 * - Recall campaigns
 * - No-show rescheduling
 */
@Injectable()
export class OutboundCallService {
  private readonly logger = new Logger(OutboundCallService.name);
  private readonly twilioClient: Twilio;
  private readonly fromNumber: string;
  private readonly webhookBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.twilioClient = new Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
    this.webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Initiate an outbound call
   */
  async initiateCall(
    patientId: string,
    callType: OutboundCallType,
    appointmentId?: string,
    customScript?: Partial<CallScript>,
  ): Promise<{ success: boolean; callSid?: string; error?: string }> {
    this.logger.log(`Initiating ${callType} call for patient: ${patientId}`);

    try {
      // Get patient info
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { clinic: true, preferred_doctor: true },
      });

      if (!patient || !patient.phone) {
        return { success: false, error: 'Patient not found or no phone number' };
      }

      // Get appointment if provided
      let appointment = null;
      if (appointmentId) {
        appointment = await this.prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { doctor: true },
        });
      }

      // Create outbound call record
      const outboundCall = await this.prisma.outbound_call.create({
        data: {
          clinic_id: patient.clinic_id,
          patient_id: patientId,
          appointment_id: appointmentId,
          call_type: callType,
          status: 'in_progress',
          scheduled_for: new Date(),
          attempts: 1,
          max_attempts: 3,
          last_attempt_at: new Date(),
        },
      });

      // Generate TwiML URL with context
      const twimlUrl = `${this.webhookBaseUrl}/webhook/outbound?` +
        `outboundCallId=${outboundCall.id}&` +
        `callType=${callType}&` +
        `patientId=${patientId}&` +
        `appointmentId=${appointmentId || ''}`;

      // Make the call via Twilio
      const call = await this.twilioClient.calls.create({
        to: patient.phone,
        from: this.fromNumber,
        url: twimlUrl,
        statusCallback: `${this.webhookBaseUrl}/webhook/outbound/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        machineDetection: 'DetectMessageEnd', // For voicemail detection
        timeout: 30,
      });

      // Update with call SID
      await this.prisma.outbound_call.update({
        where: { id: outboundCall.id },
        data: { call_sid: call.sid },
      });

      this.logger.log(`Outbound call initiated: ${call.sid}`);

      return { success: true, callSid: call.sid };
    } catch (error) {
      this.logger.error(`Failed to initiate call: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate call script based on type and context
   */
  generateScript(
    callType: OutboundCallType,
    context: {
      patientName: string;
      clinicName: string;
      appointmentDate?: string;
      appointmentTime?: string;
      doctorName?: string;
      serviceName?: string;
      daysSinceLastVisit?: number;
    },
  ): CallScript {
    const { patientName, clinicName, appointmentDate, appointmentTime, doctorName, serviceName, daysSinceLastVisit } = context;
    const firstName = patientName.split(' ')[0];

    switch (callType) {
      case 'appointment_reminder':
        return {
          greeting: `Hi ${firstName}, this is Dentsi calling from ${clinicName}.`,
          mainMessage: `I'm calling to remind you about your ${serviceName || 'dental'} appointment tomorrow, ${appointmentDate} at ${appointmentTime}${doctorName ? ` with ${doctorName}` : ''}.`,
          confirmationPrompt: `Can you confirm you'll be able to make it? Press 1 to confirm, or press 2 if you need to reschedule.`,
          rescheduleOffer: `No problem! I can help you find a new time. Would you like me to reschedule for later this week?`,
          closing: `Thank you! We look forward to seeing you. Have a great day!`,
        };

      case 'appointment_confirmation':
        return {
          greeting: `Hi ${firstName}, this is Dentsi from ${clinicName}.`,
          mainMessage: `I'm calling to confirm your appointment on ${appointmentDate} at ${appointmentTime}.`,
          confirmationPrompt: `Please press 1 to confirm your attendance, or press 2 to reschedule, or press 3 to cancel.`,
          rescheduleOffer: `I understand. Let me help you find a better time.`,
          closing: `Perfect! Your appointment is confirmed. See you soon!`,
        };

      case 'follow_up':
        return {
          greeting: `Hi ${firstName}, this is Dentsi from ${clinicName}.`,
          mainMessage: `I'm calling to check in after your recent visit. We hope you're feeling well!`,
          confirmationPrompt: `If you have any concerns or questions, press 1 to speak with our team. Otherwise, press 2 and we'll note that everything is going well.`,
          closing: `Thank you for being a valued patient. Don't hesitate to call if you need anything!`,
        };

      case 'recall':
        return {
          greeting: `Hi ${firstName}, this is Dentsi calling from ${clinicName}.`,
          mainMessage: `It's been ${daysSinceLastVisit ? Math.floor(daysSinceLastVisit / 30) + ' months' : 'a while'} since your last dental visit, and we wanted to remind you that regular checkups are important for your dental health.`,
          confirmationPrompt: `Would you like to schedule an appointment? Press 1 to book now, or press 2 if you'd like us to call back at a better time.`,
          rescheduleOffer: `Great! I can help you find a convenient time. What day works best for you?`,
          closing: `Thank you ${firstName}! We look forward to seeing you soon. Take care!`,
        };

      case 'no_show_reschedule':
        return {
          greeting: `Hi ${firstName}, this is Dentsi from ${clinicName}.`,
          mainMessage: `We missed you at your appointment ${appointmentDate ? `on ${appointmentDate}` : 'recently'}. We hope everything is okay!`,
          confirmationPrompt: `Would you like to reschedule? Press 1 to book a new appointment, or press 2 to speak with our team.`,
          rescheduleOffer: `No problem at all. Let's find a time that works better for you.`,
          closing: `Thank you! We look forward to seeing you at your new appointment.`,
        };

      default:
        return {
          greeting: `Hi ${firstName}, this is Dentsi calling from ${clinicName}.`,
          mainMessage: `We're reaching out to help with your dental care needs.`,
          confirmationPrompt: `Press 1 to speak with our team, or press 2 to schedule a callback.`,
          closing: `Thank you for being a valued patient!`,
        };
    }
  }

  /**
   * Generate TwiML for outbound call
   */
  generateOutboundTwiML(
    script: CallScript,
    outboundCallId: string,
  ): string {
    const gatherUrl = `${this.webhookBaseUrl}/webhook/outbound/gather?outboundCallId=${outboundCallId}`;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${script.greeting}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">${script.mainMessage}</Say>
  <Pause length="1"/>
  <Gather input="dtmf" numDigits="1" action="${gatherUrl}" timeout="10">
    <Say voice="Polly.Joanna">${script.confirmationPrompt || 'Press any key to continue.'}</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive your response. We'll try calling again later. Goodbye!</Say>
</Response>`;
  }

  /**
   * Handle DTMF response during outbound call
   */
  async handleOutboundResponse(
    outboundCallId: string,
    digit: string,
    callType: OutboundCallType,
  ): Promise<string> {
    this.logger.log(`Outbound response: ${digit} for call ${outboundCallId}`);

    // Update call record
    await this.prisma.outbound_call.update({
      where: { id: outboundCallId },
      data: { dtmf_response: digit },
    });

    switch (callType) {
      case 'appointment_reminder':
      case 'appointment_confirmation':
        if (digit === '1') {
          // Confirmed
          await this.prisma.outbound_call.update({
            where: { id: outboundCallId },
            data: { 
              status: 'completed',
              outcome: 'confirmed',
              completed_at: new Date(),
            },
          });
          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Wonderful! Your appointment is confirmed. We look forward to seeing you. Goodbye!</Say>
</Response>`;
        } else if (digit === '2') {
          // Wants to reschedule
          await this.prisma.outbound_call.update({
            where: { id: outboundCallId },
            data: { 
              status: 'completed',
              outcome: 'reschedule_requested',
              completed_at: new Date(),
            },
          });
          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">No problem! A member of our team will call you back shortly to help reschedule. Thank you!</Say>
</Response>`;
        } else if (digit === '3') {
          // Cancel
          await this.prisma.outbound_call.update({
            where: { id: outboundCallId },
            data: { 
              status: 'completed',
              outcome: 'cancelled',
              completed_at: new Date(),
            },
          });
          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Your appointment has been cancelled. Please call us when you're ready to reschedule. Goodbye!</Say>
</Response>`;
        }
        break;

      case 'recall':
        if (digit === '1') {
          // Wants to book
          await this.prisma.outbound_call.update({
            where: { id: outboundCallId },
            data: { 
              status: 'completed',
              outcome: 'booking_requested',
              completed_at: new Date(),
            },
          });
          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Excellent! A member of our team will call you within the hour to schedule your appointment. Thank you!</Say>
</Response>`;
        }
        break;

      case 'follow_up':
        if (digit === '1') {
          // Has concerns
          await this.prisma.outbound_call.update({
            where: { id: outboundCallId },
            data: { 
              status: 'completed',
              outcome: 'callback_requested',
              completed_at: new Date(),
            },
          });
          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I understand. A member of our team will call you back shortly to address your concerns. Take care!</Say>
</Response>`;
        } else {
          // All good
          await this.prisma.outbound_call.update({
            where: { id: outboundCallId },
            data: { 
              status: 'completed',
              outcome: 'patient_ok',
              completed_at: new Date(),
            },
          });
          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Great to hear! Thank you for letting us know. Take care and don't hesitate to call if you need anything!</Say>
</Response>`;
        }
    }

    // Default response
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for your response. Have a great day! Goodbye.</Say>
</Response>`;
  }

  /**
   * Handle call status updates
   */
  async handleStatusCallback(
    callSid: string,
    callStatus: string,
    answeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Outbound call status: ${callSid} -> ${callStatus}`);

    const outboundCall = await this.prisma.outbound_call.findFirst({
      where: { call_sid: callSid },
    });

    if (!outboundCall) {
      return;
    }

    let status: OutboundCallStatus = 'in_progress';
    let outcome: string | undefined;

    switch (callStatus) {
      case 'completed':
        status = 'completed';
        break;
      case 'busy':
      case 'no-answer':
        status = 'no_answer';
        outcome = callStatus;
        break;
      case 'failed':
      case 'canceled':
        status = 'failed';
        outcome = callStatus;
        break;
    }

    // Check for voicemail
    if (answeredBy === 'machine_end_beep' || answeredBy === 'machine_end_silence') {
      status = 'voicemail';
      outcome = 'voicemail_left';
    }

    await this.prisma.outbound_call.update({
      where: { id: outboundCall.id },
      data: {
        status,
        outcome: outcome || outboundCall.outcome,
        completed_at: status === 'completed' || status === 'failed' || status === 'no_answer' || status === 'voicemail'
          ? new Date()
          : undefined,
      },
    });

    // Schedule retry if needed
    if ((status === 'no_answer' || status === 'failed') && outboundCall.attempts < outboundCall.max_attempts) {
      await this.scheduleRetry(outboundCall.id);
    }
  }

  /**
   * Schedule a retry for failed call
   */
  private async scheduleRetry(outboundCallId: string): Promise<void> {
    const outboundCall = await this.prisma.outbound_call.findUnique({
      where: { id: outboundCallId },
    });

    if (!outboundCall) return;

    // Schedule retry in 2 hours
    const retryTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await this.prisma.outbound_call.update({
      where: { id: outboundCallId },
      data: {
        status: 'scheduled',
        scheduled_for: retryTime,
      },
    });

    this.logger.log(`Scheduled retry for ${outboundCallId} at ${retryTime}`);
  }

  /**
   * Get pending outbound calls
   */
  async getPendingCalls(clinicId: string): Promise<OutboundCallRecord[]> {
    const calls = await this.prisma.outbound_call.findMany({
      where: {
        clinic_id: clinicId,
        status: { in: ['pending', 'scheduled'] },
        scheduled_for: { lte: new Date() },
      },
      include: {
        patient: true,
        appointment: true,
      },
      orderBy: { scheduled_for: 'asc' },
    });

    return calls.map(c => ({
      id: c.id,
      clinicId: c.clinic_id,
      patientId: c.patient_id,
      patientName: c.patient?.name || 'Unknown',
      patientPhone: c.patient?.phone || '',
      appointmentId: c.appointment_id || undefined,
      callType: c.call_type as OutboundCallType,
      status: c.status as OutboundCallStatus,
      scheduledFor: c.scheduled_for,
      attempts: c.attempts,
      maxAttempts: c.max_attempts,
      lastAttemptAt: c.last_attempt_at || undefined,
      outcome: c.outcome || undefined,
    }));
  }

  /**
   * Cancel an outbound call
   */
  async cancelOutboundCall(outboundCallId: string): Promise<void> {
    await this.prisma.outbound_call.update({
      where: { id: outboundCallId },
      data: {
        status: 'cancelled',
        completed_at: new Date(),
      },
    });
  }
}
