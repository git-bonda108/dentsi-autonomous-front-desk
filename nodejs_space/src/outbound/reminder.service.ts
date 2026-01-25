import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboundCallService, OutboundCallType } from './outbound-call.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Reminder configuration
 */
export interface ReminderConfig {
  enableAppointmentReminders: boolean;
  reminderHoursBefore: number; // Default 24
  enableConfirmationCalls: boolean;
  confirmationHoursBefore: number; // Default 48
  enableFollowUpCalls: boolean;
  followUpDaysAfter: number; // Default 2
  enableRecallCampaigns: boolean;
  recallAfterDays: number; // Default 180 (6 months)
  enableNoShowFollowUp: boolean;
  noShowFollowUpHoursAfter: number; // Default 24
  callStartHour: number; // 9 = 9am
  callEndHour: number; // 18 = 6pm
  excludeWeekends: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ReminderConfig = {
  enableAppointmentReminders: true,
  reminderHoursBefore: 24,
  enableConfirmationCalls: true,
  confirmationHoursBefore: 48,
  enableFollowUpCalls: true,
  followUpDaysAfter: 2,
  enableRecallCampaigns: true,
  recallAfterDays: 180,
  enableNoShowFollowUp: true,
  noShowFollowUpHoursAfter: 24,
  callStartHour: 9,
  callEndHour: 18,
  excludeWeekends: true,
};

/**
 * ReminderService - Automated appointment reminders and follow-ups
 * 
 * Features:
 * - 24h appointment reminders
 * - 48h confirmation calls
 * - Post-visit follow-ups
 * - Recall campaigns for overdue patients
 * - No-show follow-up calls
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private clinicConfigs: Map<string, ReminderConfig> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboundCallService: OutboundCallService,
  ) {}

  /**
   * Get config for clinic (or default)
   */
  private getConfig(clinicId: string): ReminderConfig {
    return this.clinicConfigs.get(clinicId) || DEFAULT_CONFIG;
  }

  /**
   * Set config for clinic
   */
  setClinicConfig(clinicId: string, config: Partial<ReminderConfig>): void {
    const current = this.getConfig(clinicId);
    this.clinicConfigs.set(clinicId, { ...current, ...config });
  }

  /**
   * Check if within calling hours
   */
  private isWithinCallingHours(config: ReminderConfig): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check weekends
    if (config.excludeWeekends && (day === 0 || day === 6)) {
      return false;
    }

    // Check hours
    return hour >= config.callStartHour && hour < config.callEndHour;
  }

  /**
   * Schedule appointment reminder
   */
  async scheduleAppointmentReminder(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, clinic: true },
    });

    if (!appointment || !appointment.patient?.phone || !appointment.patient_id) {
      return;
    }

    const config = this.getConfig(appointment.clinic_id);
    if (!config.enableAppointmentReminders) {
      return;
    }

    // Calculate reminder time (24h before)
    const appointmentTime = new Date(appointment.appointment_date);
    if (appointment.start_time) {
      const timeParts = appointment.start_time.split(':');
      if (timeParts.length >= 2) {
        appointmentTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
      }
    }

    const reminderTime = new Date(appointmentTime.getTime() - config.reminderHoursBefore * 60 * 60 * 1000);

    // Only schedule if reminder time is in the future
    if (reminderTime <= new Date()) {
      return;
    }

    // Check if already scheduled
    const existing = await this.prisma.outbound_call.findFirst({
      where: {
        appointment_id: appointmentId,
        call_type: 'appointment_reminder',
        status: { in: ['pending', 'scheduled'] },
      },
    });

    if (existing) {
      return;
    }

    // Create scheduled reminder
    await this.prisma.outbound_call.create({
      data: {
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id!,
        appointment_id: appointmentId,
        call_type: 'appointment_reminder',
        status: 'scheduled',
        scheduled_for: reminderTime,
        attempts: 0,
        max_attempts: 3,
      },
    });

    this.logger.log(`Scheduled reminder for appointment ${appointmentId} at ${reminderTime}`);
  }

  /**
   * Schedule confirmation call (48h before)
   */
  async scheduleConfirmationCall(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment || !appointment.patient?.phone || !appointment.patient_id) {
      return;
    }

    const config = this.getConfig(appointment.clinic_id);
    if (!config.enableConfirmationCalls) {
      return;
    }

    // Calculate confirmation time (48h before)
    const appointmentTime = new Date(appointment.appointment_date);
    const confirmationTime = new Date(appointmentTime.getTime() - config.confirmationHoursBefore * 60 * 60 * 1000);

    if (confirmationTime <= new Date()) {
      return;
    }

    // Check if already scheduled
    const existing = await this.prisma.outbound_call.findFirst({
      where: {
        appointment_id: appointmentId,
        call_type: 'appointment_confirmation',
        status: { in: ['pending', 'scheduled'] },
      },
    });

    if (existing) {
      return;
    }

    await this.prisma.outbound_call.create({
      data: {
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id!,
        appointment_id: appointmentId,
        call_type: 'appointment_confirmation',
        status: 'scheduled',
        scheduled_for: confirmationTime,
        attempts: 0,
        max_attempts: 2,
      },
    });

    this.logger.log(`Scheduled confirmation for appointment ${appointmentId} at ${confirmationTime}`);
  }

  /**
   * Schedule follow-up call after visit
   */
  async scheduleFollowUp(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment || appointment.status !== 'completed' || !appointment.patient?.phone || !appointment.patient_id) {
      return;
    }

    const config = this.getConfig(appointment.clinic_id);
    if (!config.enableFollowUpCalls) {
      return;
    }

    // Schedule follow-up 2 days after
    const followUpTime = new Date(Date.now() + config.followUpDaysAfter * 24 * 60 * 60 * 1000);

    // Check if already scheduled
    const existing = await this.prisma.outbound_call.findFirst({
      where: {
        appointment_id: appointmentId,
        call_type: 'follow_up',
        status: { in: ['pending', 'scheduled'] },
      },
    });

    if (existing) {
      return;
    }

    await this.prisma.outbound_call.create({
      data: {
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id!,
        appointment_id: appointmentId,
        call_type: 'follow_up',
        status: 'scheduled',
        scheduled_for: followUpTime,
        attempts: 0,
        max_attempts: 2,
      },
    });

    this.logger.log(`Scheduled follow-up for appointment ${appointmentId} at ${followUpTime}`);
  }

  /**
   * Schedule no-show follow-up
   */
  async scheduleNoShowFollowUp(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment || appointment.status !== 'no_show' || !appointment.patient?.phone || !appointment.patient_id) {
      return;
    }

    const config = this.getConfig(appointment.clinic_id);
    if (!config.enableNoShowFollowUp) {
      return;
    }

    // Schedule follow-up 24h after missed appointment
    const followUpTime = new Date(Date.now() + config.noShowFollowUpHoursAfter * 60 * 60 * 1000);

    await this.prisma.outbound_call.create({
      data: {
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id!,
        appointment_id: appointmentId,
        call_type: 'no_show_reschedule',
        status: 'scheduled',
        scheduled_for: followUpTime,
        attempts: 0,
        max_attempts: 3,
      },
    });

    // Increment no-show count
    await this.prisma.patient.update({
      where: { id: appointment.patient_id! },
      data: { no_show_count: { increment: 1 } },
    });

    this.logger.log(`Scheduled no-show follow-up for patient ${appointment.patient_id}`);
  }

  /**
   * Find patients overdue for recall
   */
  async findRecallPatients(clinicId: string): Promise<{
    patientId: string;
    patientName: string;
    lastVisit: Date;
    daysSince: number;
  }[]> {
    const config = this.getConfig(clinicId);
    const cutoffDate = new Date(Date.now() - config.recallAfterDays * 24 * 60 * 60 * 1000);

    const patients = await this.prisma.patient.findMany({
      where: {
        clinic_id: clinicId,
        last_visit_date: { lte: cutoffDate },
        phone: { not: '' },
      },
      select: {
        id: true,
        name: true,
        last_visit_date: true,
      },
    });

    return patients
      .filter(p => p.last_visit_date)
      .map(p => ({
        patientId: p.id,
        patientName: p.name,
        lastVisit: p.last_visit_date!,
        daysSince: Math.floor((Date.now() - p.last_visit_date!.getTime()) / (24 * 60 * 60 * 1000)),
      }));
  }

  /**
   * Schedule recall campaign for clinic
   */
  async scheduleRecallCampaign(clinicId: string, maxCalls: number = 50): Promise<number> {
    const config = this.getConfig(clinicId);
    if (!config.enableRecallCampaigns) {
      return 0;
    }

    const recallPatients = await this.findRecallPatients(clinicId);
    let scheduledCount = 0;

    for (const patient of recallPatients.slice(0, maxCalls)) {
      // Check if already has pending recall
      const existing = await this.prisma.outbound_call.findFirst({
        where: {
          patient_id: patient.patientId,
          call_type: 'recall',
          status: { in: ['pending', 'scheduled', 'in_progress'] },
        },
      });

      if (existing) {
        continue;
      }

      // Schedule for next available calling time
      const now = new Date();
      let scheduledTime = new Date(now);
      
      // If outside calling hours, schedule for next day at start hour
      if (!this.isWithinCallingHours(config)) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        scheduledTime.setHours(config.callStartHour, 0, 0, 0);
      }

      await this.prisma.outbound_call.create({
        data: {
          clinic_id: clinicId,
          patient_id: patient.patientId,
          call_type: 'recall',
          status: 'scheduled',
          scheduled_for: scheduledTime,
          attempts: 0,
          max_attempts: 3,
        },
      });

      scheduledCount++;
    }

    this.logger.log(`Scheduled ${scheduledCount} recall calls for clinic ${clinicId}`);
    return scheduledCount;
  }

  /**
   * Process due outbound calls - runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledCalls(): Promise<void> {
    this.logger.log('Processing scheduled outbound calls...');

    // Get all scheduled calls that are due
    const dueCalls = await this.prisma.outbound_call.findMany({
      where: {
        status: 'scheduled',
        scheduled_for: { lte: new Date() },
      },
      include: {
        patient: true,
        clinic: true,
      },
      take: 20, // Process in batches
    });

    this.logger.log(`Found ${dueCalls.length} calls to process`);

    for (const call of dueCalls) {
      const config = this.getConfig(call.clinic_id);

      // Check if within calling hours
      if (!this.isWithinCallingHours(config)) {
        this.logger.log(`Outside calling hours for clinic ${call.clinic_id}, skipping...`);
        continue;
      }

      try {
        // Initiate the call
        await this.outboundCallService.initiateCall(
          call.patient_id,
          call.call_type as OutboundCallType,
          call.appointment_id || undefined,
        );

        // Update attempts
        await this.prisma.outbound_call.update({
          where: { id: call.id },
          data: {
            status: 'in_progress',
            attempts: { increment: 1 },
            last_attempt_at: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Failed to process call ${call.id}: ${error.message}`);
      }
    }
  }

  /**
   * Daily recall check - runs at 9am
   */
  @Cron('0 9 * * *')
  async dailyRecallCheck(): Promise<void> {
    this.logger.log('Running daily recall check...');

    const clinics = await this.prisma.clinic.findMany();

    for (const clinic of clinics) {
      const config = this.getConfig(clinic.id);
      if (config.enableRecallCampaigns) {
        await this.scheduleRecallCampaign(clinic.id, 10); // 10 calls per clinic per day
      }
    }
  }

  /**
   * Get reminder statistics for clinic
   */
  async getReminderStats(clinicId: string, startDate: Date, endDate: Date): Promise<{
    totalScheduled: number;
    completed: number;
    confirmed: number;
    rescheduled: number;
    cancelled: number;
    noAnswer: number;
    voicemail: number;
    confirmationRate: number;
  }> {
    const calls = await this.prisma.outbound_call.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const total = calls.length;
    const completed = calls.filter(c => c.status === 'completed').length;
    const confirmed = calls.filter(c => c.outcome === 'confirmed').length;
    const rescheduled = calls.filter(c => c.outcome === 'reschedule_requested').length;
    const cancelled = calls.filter(c => c.outcome === 'cancelled').length;
    const noAnswer = calls.filter(c => c.status === 'no_answer').length;
    const voicemail = calls.filter(c => c.status === 'voicemail').length;

    return {
      totalScheduled: total,
      completed,
      confirmed,
      rescheduled,
      cancelled,
      noAnswer,
      voicemail,
      confirmationRate: completed > 0 ? confirmed / completed : 0,
    };
  }
}
