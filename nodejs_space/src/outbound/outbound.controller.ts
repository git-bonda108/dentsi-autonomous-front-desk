import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { OutboundCallService, OutboundCallType } from './outbound-call.service';
import { ReminderService } from './reminder.service';

/**
 * OutboundController - API endpoints for outbound calling
 * 
 * Endpoints:
 * - POST /outbound/call - Initiate an outbound call
 * - GET /outbound/pending/:clinicId - Get pending calls
 * - POST /outbound/cancel/:id - Cancel an outbound call
 * - POST /outbound/reminder - Schedule a reminder
 * - POST /outbound/recall-campaign - Start recall campaign
 * - GET /outbound/stats/:clinicId - Get outbound call statistics
 */
@Controller('outbound')
export class OutboundController {
  private readonly logger = new Logger(OutboundController.name);

  constructor(
    private readonly outboundCallService: OutboundCallService,
    private readonly reminderService: ReminderService,
  ) {}

  /**
   * Initiate an outbound call
   */
  @Post('call')
  async initiateCall(
    @Body() body: {
      patientId: string;
      callType: OutboundCallType;
      appointmentId?: string;
    },
  ) {
    this.logger.log(`Initiating ${body.callType} call for patient ${body.patientId}`);

    const result = await this.outboundCallService.initiateCall(
      body.patientId,
      body.callType,
      body.appointmentId,
    );

    return result;
  }

  /**
   * Get pending outbound calls for a clinic
   */
  @Get('pending/:clinicId')
  async getPendingCalls(@Param('clinicId') clinicId: string) {
    const calls = await this.outboundCallService.getPendingCalls(clinicId);

    return {
      success: true,
      calls,
      count: calls.length,
    };
  }

  /**
   * Cancel an outbound call
   */
  @Post('cancel/:id')
  async cancelCall(@Param('id') id: string) {
    await this.outboundCallService.cancelOutboundCall(id);

    return {
      success: true,
      message: 'Outbound call cancelled',
    };
  }

  /**
   * Schedule appointment reminder
   */
  @Post('reminder')
  async scheduleReminder(@Body() body: { appointmentId: string }) {
    await this.reminderService.scheduleAppointmentReminder(body.appointmentId);

    return {
      success: true,
      message: 'Reminder scheduled',
    };
  }

  /**
   * Schedule confirmation call
   */
  @Post('confirmation')
  async scheduleConfirmation(@Body() body: { appointmentId: string }) {
    await this.reminderService.scheduleConfirmationCall(body.appointmentId);

    return {
      success: true,
      message: 'Confirmation call scheduled',
    };
  }

  /**
   * Schedule follow-up call
   */
  @Post('follow-up')
  async scheduleFollowUp(@Body() body: { appointmentId: string }) {
    await this.reminderService.scheduleFollowUp(body.appointmentId);

    return {
      success: true,
      message: 'Follow-up scheduled',
    };
  }

  /**
   * Schedule no-show follow-up
   */
  @Post('no-show')
  async scheduleNoShowFollowUp(@Body() body: { appointmentId: string }) {
    await this.reminderService.scheduleNoShowFollowUp(body.appointmentId);

    return {
      success: true,
      message: 'No-show follow-up scheduled',
    };
  }

  /**
   * Start recall campaign for a clinic
   */
  @Post('recall-campaign')
  async startRecallCampaign(
    @Body() body: { clinicId: string; maxCalls?: number },
  ) {
    const count = await this.reminderService.scheduleRecallCampaign(
      body.clinicId,
      body.maxCalls,
    );

    return {
      success: true,
      scheduledCalls: count,
      message: `Scheduled ${count} recall calls`,
    };
  }

  /**
   * Get patients due for recall
   */
  @Get('recall-patients/:clinicId')
  async getRecallPatients(@Param('clinicId') clinicId: string) {
    const patients = await this.reminderService.findRecallPatients(clinicId);

    return {
      success: true,
      patients,
      count: patients.length,
    };
  }

  /**
   * Update clinic reminder configuration
   */
  @Post('config/:clinicId')
  async updateConfig(
    @Param('clinicId') clinicId: string,
    @Body() config: {
      enableAppointmentReminders?: boolean;
      reminderHoursBefore?: number;
      enableConfirmationCalls?: boolean;
      confirmationHoursBefore?: number;
      enableFollowUpCalls?: boolean;
      followUpDaysAfter?: number;
      enableRecallCampaigns?: boolean;
      recallAfterDays?: number;
      enableNoShowFollowUp?: boolean;
      noShowFollowUpHoursAfter?: number;
      callStartHour?: number;
      callEndHour?: number;
      excludeWeekends?: boolean;
    },
  ) {
    this.reminderService.setClinicConfig(clinicId, config);

    return {
      success: true,
      message: 'Configuration updated',
    };
  }

  /**
   * Get outbound call statistics
   */
  @Get('stats/:clinicId')
  async getStats(
    @Param('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.reminderService.getReminderStats(clinicId, start, end);

    return {
      success: true,
      stats,
      period: { startDate: start, endDate: end },
    };
  }
}
