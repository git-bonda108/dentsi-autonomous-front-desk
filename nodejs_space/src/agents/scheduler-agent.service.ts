import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientInfo } from './voice-agent.service';

export interface Slot {
  id: string;
  clinicId: string;
  date: Date;
  time: string;
  duration: number; // minutes
  available: boolean;
  priority?: number; // For revenue-aware ranking
  revenueValue?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
  message: string;
}

/**
 * SchedulerAgent - Appointment Booking & Availability Management
 * 
 * Responsibilities:
 * - Check appointment availability
 * - Book appointments with conflict detection
 * - Revenue-aware slot prioritization
 * - Integration with mock PMS
 */
@Injectable()
export class SchedulerAgentService {
  private readonly logger = new Logger(SchedulerAgentService.name);

  // Revenue prioritization map
  private readonly revenueMap: { [key: string]: { value: number; priority: number; preferredTimes: string[] } } = {
    implant: { value: 5000, priority: 1, preferredTimes: ['09:00', '10:00', '13:00', '14:00'] },
    crown: { value: 1500, priority: 2, preferredTimes: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
    root_canal: { value: 1200, priority: 3, preferredTimes: [] },
    filling: { value: 300, priority: 4, preferredTimes: [] },
    cleaning: { value: 150, priority: 5, preferredTimes: [] },
    checkup: { value: 75, priority: 5, preferredTimes: [] },
    emergency: { value: 1000, priority: 0, preferredTimes: [] }, // Highest priority
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check appointment availability
   */
  async checkAvailability(
    clinicId: string,
    serviceType: string,
    dateRange: DateRange,
  ): Promise<Slot[]> {
    this.logger.log(
      `[SchedulerAgent] Checking availability for ${serviceType} at clinic ${clinicId}`,
    );

    try {
      // Get service details
      const service = await this.prisma.service.findFirst({
        where: {
          clinic_id: clinicId,
          service_name: {
            contains: serviceType,
            mode: 'insensitive',
          },
        },
      });

      if (!service) {
        this.logger.warn(`[SchedulerAgent] Service ${serviceType} not found for clinic ${clinicId}`);
        return [];
      }

      // Get existing appointments in date range
      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          clinic_id: clinicId,
          appointment_date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          status: {
            not: 'cancelled',
          },
        },
      });

      // Generate all possible slots
      const slots = this.generateTimeSlots(dateRange, service.duration_minutes);

      // Filter out booked slots
      const availableSlots = slots.filter((slot) => {
        return !existingAppointments.some(
          (apt) =>
            apt.appointment_date.toISOString().split('T')[0] ===
              slot.date.toISOString().split('T')[0] && apt.appointment_date.getHours() === parseInt(slot.time.split(':')[0]),
        );
      });

      // Add revenue metadata
      const slotsWithRevenue = availableSlots.map((slot) => ({
        ...slot,
        revenueValue: service.price,
        priority: this.getServicePriority(serviceType),
      }));

      this.logger.log(
        `[SchedulerAgent] Found ${slotsWithRevenue.length} available slots`,
      );
      return slotsWithRevenue;
    } catch (error) {
      this.logger.error(
        `[SchedulerAgent] Availability check failed: ${error.message}`,
      );
      throw new Error('Failed to check availability');
    }
  }

  /**
   * Prioritize slots based on revenue value
   */
  async prioritizeSlots(slots: Slot[], treatment: string): Promise<Slot[]> {
    this.logger.log(
      `[SchedulerAgent] Prioritizing ${slots.length} slots for ${treatment}`,
    );

    const treatmentKey = treatment.toLowerCase().replace(/\s+/g, '_');
    const revenueInfo =
      this.revenueMap[treatmentKey] || this.revenueMap['cleaning'];

    // Sort slots by priority
    const prioritized = [...slots].sort((a, b) => {
      // Emergency always first
      if (treatment === 'emergency') {
        // Prefer earlier times for emergencies
        return a.time.localeCompare(b.time);
      }

      // High-value treatments get preferred times
      if (revenueInfo.preferredTimes.length > 0) {
        const aIsPreferred = revenueInfo.preferredTimes.includes(a.time);
        const bIsPreferred = revenueInfo.preferredTimes.includes(b.time);

        if (aIsPreferred && !bIsPreferred) return -1;
        if (!aIsPreferred && bIsPreferred) return 1;
      }

      // Sort by date, then time
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    this.logger.log(
      `[SchedulerAgent] Prioritized slots. Top 3: ${prioritized
        .slice(0, 3)
        .map((s) => `${s.date.toISOString().split('T')[0]} ${s.time}`)
        .join(', ')}`,
    );

    return prioritized;
  }

  /**
   * Book appointment
   */
  async bookAppointment(
    patientInfo: PatientInfo,
    clinicId: string,
    slotDate: Date,
    slotTime: string,
    serviceType: string,
  ): Promise<BookingResult> {
    this.logger.log(
      `[SchedulerAgent] Booking appointment for ${patientInfo.name} on ${slotDate.toISOString().split('T')[0]} ${slotTime}`,
    );

    try {
      // Check for conflicts
      const hasConflict = await this.detectConflicts(clinicId, slotDate, slotTime);
      if (hasConflict) {
        this.logger.warn(`[SchedulerAgent] Conflict detected for slot`);
        return {
          success: false,
          error: 'Slot no longer available',
          message: 'I apologize, that slot was just booked. Let me find you another time.',
        };
      }

      // Find or create patient
      let patient = await this.prisma.patient.findFirst({
        where: { phone: patientInfo.phone },
      });

      if (!patient) {
        patient = await this.prisma.patient.create({
          data: {
            name: patientInfo.name || 'Unknown',
            phone: patientInfo.phone || '',
            email: `${patientInfo.phone}@temp.dentra.ai`, // Temporary email
            date_of_birth: patientInfo.dateOfBirth
              ? new Date(patientInfo.dateOfBirth)
              : null,
            insurance_info: patientInfo.insurance || null,
          },
        });
        this.logger.log(`[SchedulerAgent] Created new patient: ${patient.id}`);
      }

      // Get service
      const service = await this.prisma.service.findFirst({
        where: {
          clinic_id: clinicId,
          service_name: {
            contains: serviceType,
            mode: 'insensitive',
          },
        },
      });

      // Create appointment date/time
      const appointmentDateTime = new Date(slotDate);
      const [hours, minutes] = slotTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      // Create appointment
      const appointment = await this.prisma.appointment.create({
        data: {
          clinic_id: clinicId,
          patient_id: patient.id,
          appointment_date: appointmentDateTime,
          service_type: service?.service_name || serviceType,
          status: 'booked',
        },
      });

      this.logger.log(
        `[SchedulerAgent] ✅ Appointment booked: ${appointment.id}`,
      );

      return {
        success: true,
        appointmentId: appointment.id,
        message: `Appointment confirmed for ${slotDate.toISOString().split('T')[0]} at ${slotTime}`,
      };
    } catch (error) {
      this.logger.error(`[SchedulerAgent] Booking failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'I apologize, I encountered an error while booking. Let me get your number for a callback.',
      };
    }
  }

  /**
   * Detect booking conflicts
   */
  async detectConflicts(
    clinicId: string,
    date: Date,
    time: string,
  ): Promise<boolean> {
    const [hours, minutes] = time.split(':').map(Number);
    const checkDate = new Date(date);
    checkDate.setHours(hours, minutes, 0, 0);

    const existing = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        appointment_date: checkDate,
        status: {
          not: 'cancelled',
        },
      },
    });

    return !!existing;
  }

  /**
   * Generate time slots for a date range
   */
  private generateTimeSlots(dateRange: DateRange, duration: number): Slot[] {
    const slots: Slot[] = [];
    const currentDate = new Date(dateRange.start);

    // Generate slots for each day in range
    while (currentDate <= dateRange.end) {
      // Skip weekends (for simplicity)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Business hours: 9am-5pm
        for (let hour = 9; hour < 17; hour++) {
          const time = `${hour.toString().padStart(2, '0')}:00`;
          slots.push({
            id: `${currentDate.toISOString().split('T')[0]}-${time}`,
            clinicId: '', // Will be set by caller
            date: new Date(currentDate),
            time,
            duration,
            available: true,
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Get service priority for revenue ranking
   */
  private getServicePriority(serviceType: string): number {
    const key = serviceType.toLowerCase().replace(/\s+/g, '_');
    return this.revenueMap[key]?.priority || 5;
  }
}