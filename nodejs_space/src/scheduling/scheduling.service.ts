import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Time slot representation
 */
export interface TimeSlot {
  id: string;
  date: Date;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  doctorId: string;
  doctorName: string;
  specialty: string;
  isAvailable: boolean;
  priority: number; // Higher = better match for patient preferences
}

/**
 * Doctor working hours parsed from JSON
 */
export interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  specialty: string;
  weeklyHours: {
    [day: string]: { start: string; end: string }[]; // e.g., mon: [{start: "09:00", end: "12:00"}, {start: "14:00", end: "17:00"}]
  };
}

/**
 * Scheduling preferences
 */
export interface SchedulingPreferences {
  preferredDoctorId?: string;
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'any';
  preferredDays?: string[]; // ["Monday", "Wednesday"]
  serviceType: string;
  urgency?: 'routine' | 'soon' | 'urgent' | 'emergency';
}

/**
 * Slot search result
 */
export interface SlotSearchResult {
  slots: TimeSlot[];
  totalFound: number;
  preferredDoctorAvailable: boolean;
  nextAvailableWithPreferred?: TimeSlot;
  firstAvailable?: TimeSlot;
  message?: string;
}

/**
 * Booking request
 */
export interface BookingRequest {
  clinicId: string;
  patientId: string;
  doctorId: string;
  date: Date;
  startTime: string;
  serviceType: string;
  duration: number;
  reason?: string;
  callId?: string;
}

/**
 * Booking result
 */
export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  conflictDetails?: string;
  suggestedAlternatives?: TimeSlot[];
  message: string;
}

/**
 * SchedulingService - Smart appointment scheduling with doctor preferences
 * 
 * Features:
 * - Parses doctor availability from JSON schedules
 * - Respects patient preferences (doctor, time, day)
 * - Handles service duration matching
 * - Detects and resolves conflicts
 * - Prioritizes slots based on preferences
 */
@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  // Service duration map (in minutes)
  private readonly serviceDurations: Record<string, number> = {
    'cleaning': 60,
    'regular cleaning': 60,
    'deep cleaning': 90,
    'checkup': 30,
    'consultation': 30,
    'filling': 45,
    'dental filling': 45,
    'crown': 90,
    'crown placement': 90,
    'root canal': 120,
    'extraction': 45,
    'tooth extraction': 45,
    'whitening': 60,
    'teeth whitening': 60,
    'implant': 120,
    'dental implant': 120,
    'emergency': 30,
    'emergency visit': 30,
  };

  // Day name mapping
  private readonly dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  private readonly fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available slots based on preferences
   */
  async findAvailableSlots(
    clinicId: string,
    preferences: SchedulingPreferences,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SlotSearchResult> {
    this.logger.log(`Finding slots for clinic ${clinicId} with preferences: ${JSON.stringify(preferences)}`);

    const searchStart = startDate || new Date();
    const searchEnd = endDate || this.addDays(searchStart, 14); // Default 2 weeks

    // Adjust for urgency
    const adjustedEnd = this.adjustDateRangeForUrgency(searchStart, searchEnd, preferences.urgency);

    // Get doctors (filter by preferred if specified)
    const doctors = await this.getDoctorsWithSchedules(clinicId, preferences.preferredDoctorId);

    if (doctors.length === 0) {
      return {
        slots: [],
        totalFound: 0,
        preferredDoctorAvailable: false,
        message: 'No doctors available',
      };
    }

    // Get service duration
    const duration = this.getServiceDuration(preferences.serviceType);

    // Get existing appointments to check conflicts
    const existingAppointments = await this.getExistingAppointments(
      clinicId,
      searchStart,
      adjustedEnd,
    );

    // Generate all possible slots
    const allSlots: TimeSlot[] = [];

    for (const doctor of doctors) {
      const doctorSlots = this.generateDoctorSlots(
        doctor,
        searchStart,
        adjustedEnd,
        duration,
        existingAppointments,
        preferences,
      );
      allSlots.push(...doctorSlots);
    }

    // Sort by priority (highest first), then by date/time
    allSlots.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.date.getTime() - b.date.getTime();
    });

    // Check if preferred doctor has availability
    const preferredDoctorAvailable = preferences.preferredDoctorId
      ? allSlots.some((s) => s.doctorId === preferences.preferredDoctorId)
      : true;

    // Find first available with preferred doctor
    const nextAvailableWithPreferred = preferences.preferredDoctorId
      ? allSlots.find((s) => s.doctorId === preferences.preferredDoctorId)
      : undefined;

    return {
      slots: allSlots.slice(0, 10), // Return top 10
      totalFound: allSlots.length,
      preferredDoctorAvailable,
      nextAvailableWithPreferred,
      firstAvailable: allSlots[0],
    };
  }

  /**
   * Book an appointment with conflict detection
   */
  async bookAppointment(request: BookingRequest): Promise<BookingResult> {
    this.logger.log(`Booking appointment: ${JSON.stringify(request)}`);

    const duration = request.duration || this.getServiceDuration(request.serviceType);

    // Parse start time
    const appointmentDate = new Date(request.date);
    const [hours, minutes] = request.startTime.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Check for conflicts
    const conflict = await this.detectConflict(
      request.clinicId,
      request.doctorId,
      appointmentDate,
      duration,
    );

    if (conflict) {
      this.logger.warn(`Conflict detected: ${conflict.reason}`);

      // Find alternatives
      const alternatives = await this.findAvailableSlots(
        request.clinicId,
        {
          preferredDoctorId: request.doctorId,
          serviceType: request.serviceType,
          preferredTime: 'any',
        },
        new Date(),
        this.addDays(new Date(), 7),
      );

      return {
        success: false,
        conflictDetails: conflict.reason,
        suggestedAlternatives: alternatives.slots.slice(0, 3),
        message: `That slot is no longer available. ${conflict.reason}`,
      };
    }

    // Create the appointment
    try {
      const appointment = await this.prisma.appointment.create({
        data: {
          clinic_id: request.clinicId,
          patient_id: request.patientId,
          doctor_id: request.doctorId,
          call_id: request.callId,
          appointment_date: appointmentDate,
          duration_minutes: duration,
          service_type: request.serviceType,
          reason: request.reason,
          status: 'scheduled',
          notes: 'Booked via Dentsi AI',
        },
      });

      // Update patient's preferred doctor
      await this.prisma.patient.update({
        where: { id: request.patientId },
        data: {
          preferred_doctor_id: request.doctorId,
        },
      });

      // Get doctor name for confirmation
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: request.doctorId },
      });

      this.logger.log(`✅ Appointment booked: ${appointment.id}`);

      return {
        success: true,
        appointmentId: appointment.id,
        message: `Appointment confirmed for ${appointmentDate.toLocaleDateString()} at ${request.startTime} with ${doctor?.name || 'your doctor'}`,
      };
    } catch (error) {
      this.logger.error(`Booking failed: ${error.message}`);
      return {
        success: false,
        message: 'Failed to create appointment. Please try again.',
      };
    }
  }

  /**
   * Get doctors with their parsed schedules
   */
  private async getDoctorsWithSchedules(
    clinicId: string,
    preferredDoctorId?: string,
  ): Promise<DoctorSchedule[]> {
    const where: any = {
      clinic_id: clinicId,
      is_active: true,
    };

    // If preferred doctor specified, get them first but also include others
    const doctors = await this.prisma.doctor.findMany({
      where,
      orderBy: preferredDoctorId
        ? [
            // Put preferred doctor first
            { id: preferredDoctorId === 'id' ? 'asc' : 'desc' },
          ]
        : [{ name: 'asc' }],
    });

    // Sort to put preferred doctor first
    if (preferredDoctorId) {
      doctors.sort((a, b) => {
        if (a.id === preferredDoctorId) return -1;
        if (b.id === preferredDoctorId) return 1;
        return 0;
      });
    }

    return doctors.map((doctor) => ({
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      weeklyHours: this.parseAvailableHours(doctor.available_hours),
    }));
  }

  /**
   * Parse available hours JSON string
   */
  private parseAvailableHours(hoursJson: string | null): DoctorSchedule['weeklyHours'] {
    if (!hoursJson) {
      // Default schedule: Mon-Fri 9am-5pm
      return {
        mon: [{ start: '09:00', end: '17:00' }],
        tue: [{ start: '09:00', end: '17:00' }],
        wed: [{ start: '09:00', end: '17:00' }],
        thu: [{ start: '09:00', end: '17:00' }],
        fri: [{ start: '09:00', end: '17:00' }],
      };
    }

    try {
      const parsed = JSON.parse(hoursJson);
      const result: DoctorSchedule['weeklyHours'] = {};

      for (const [day, hours] of Object.entries(parsed)) {
        if (Array.isArray(hours)) {
          // Format: ["09:00-12:00", "14:00-17:00"]
          result[day.toLowerCase()] = hours.map((h: string) => {
            const [start, end] = h.split('-');
            return { start, end };
          });
        }
      }

      return result;
    } catch (error) {
      this.logger.warn(`Failed to parse available hours: ${error.message}`);
      return {
        mon: [{ start: '09:00', end: '17:00' }],
        tue: [{ start: '09:00', end: '17:00' }],
        wed: [{ start: '09:00', end: '17:00' }],
        thu: [{ start: '09:00', end: '17:00' }],
        fri: [{ start: '09:00', end: '17:00' }],
      };
    }
  }

  /**
   * Generate available slots for a doctor
   */
  private generateDoctorSlots(
    doctor: DoctorSchedule,
    startDate: Date,
    endDate: Date,
    duration: number,
    existingAppointments: any[],
    preferences: SchedulingPreferences,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    // Create a set of booked times for quick lookup
    const bookedTimes = new Set<string>();
    for (const apt of existingAppointments) {
      if (apt.doctor_id === doctor.doctorId) {
        const key = `${apt.appointment_date.toISOString()}`;
        bookedTimes.add(key);
        
        // Also block surrounding slots based on duration
        const aptDuration = apt.duration_minutes || 60;
        for (let i = 30; i < aptDuration; i += 30) {
          const blockedTime = new Date(apt.appointment_date);
          blockedTime.setMinutes(blockedTime.getMinutes() + i);
          bookedTimes.add(blockedTime.toISOString());
        }
      }
    }

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dayName = this.dayNames[dayOfWeek];
      const dayHours = doctor.weeklyHours[dayName];

      if (dayHours && dayHours.length > 0) {
        // Doctor works this day
        for (const period of dayHours) {
          const slotTimes = this.generateTimeSlotsForPeriod(
            current,
            period.start,
            period.end,
            duration,
          );

          for (const slotTime of slotTimes) {
            const slotDate = new Date(current);
            const [h, m] = slotTime.split(':').map(Number);
            slotDate.setHours(h, m, 0, 0);

            // Skip past times
            if (slotDate <= new Date()) continue;

            // Check if booked
            const isBooked = bookedTimes.has(slotDate.toISOString());
            if (isBooked) continue;

            // Calculate priority
            const priority = this.calculateSlotPriority(
              slotDate,
              slotTime,
              doctor,
              preferences,
            );

            const endTime = this.addMinutesToTime(slotTime, duration);

            slots.push({
              id: `${doctor.doctorId}-${slotDate.toISOString()}`,
              date: slotDate,
              startTime: slotTime,
              endTime,
              doctorId: doctor.doctorId,
              doctorName: doctor.doctorName,
              specialty: doctor.specialty,
              isAvailable: true,
              priority,
            });
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate time slots for a working period
   */
  private generateTimeSlotsForPeriod(
    date: Date,
    startTime: string,
    endTime: string,
    duration: number,
  ): string[] {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + duration <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
      currentMinutes += 30; // 30-minute intervals
    }

    return slots;
  }

  /**
   * Calculate priority score for a slot
   */
  private calculateSlotPriority(
    slotDate: Date,
    slotTime: string,
    doctor: DoctorSchedule,
    preferences: SchedulingPreferences,
  ): number {
    let priority = 0;

    // Preferred doctor match (+50)
    if (preferences.preferredDoctorId === doctor.doctorId) {
      priority += 50;
    }

    // Time preference match (+30)
    const hour = parseInt(slotTime.split(':')[0]);
    if (preferences.preferredTime) {
      if (preferences.preferredTime === 'morning' && hour >= 8 && hour < 12) {
        priority += 30;
      } else if (preferences.preferredTime === 'afternoon' && hour >= 12 && hour < 17) {
        priority += 30;
      } else if (preferences.preferredTime === 'evening' && hour >= 17) {
        priority += 30;
      }
    }

    // Day preference match (+20)
    if (preferences.preferredDays && preferences.preferredDays.length > 0) {
      const dayName = this.fullDayNames[slotDate.getDay()];
      if (preferences.preferredDays.includes(dayName)) {
        priority += 20;
      }
    }

    // Sooner is better for urgent (+10 per day closer)
    if (preferences.urgency === 'urgent' || preferences.urgency === 'emergency') {
      const daysFromNow = Math.floor((slotDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      priority += Math.max(0, 10 - daysFromNow);
    }

    // Slightly prefer earlier in the day for general appointments
    priority += Math.max(0, 10 - hour);

    return priority;
  }

  /**
   * Get existing appointments for conflict checking
   */
  private async getExistingAppointments(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        appointment_date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['cancelled'],
        },
      },
    });
  }

  /**
   * Detect scheduling conflicts
   */
  private async detectConflict(
    clinicId: string,
    doctorId: string,
    appointmentDate: Date,
    duration: number,
  ): Promise<{ reason: string } | null> {
    const endTime = new Date(appointmentDate.getTime() + duration * 60 * 1000);

    // Check for overlapping appointments
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        doctor_id: doctorId,
        status: { notIn: ['cancelled'] },
        OR: [
          // New appointment starts during existing
          {
            appointment_date: { lte: appointmentDate },
            AND: {
              appointment_date: {
                gte: new Date(appointmentDate.getTime() - 120 * 60 * 1000), // 2 hours buffer
              },
            },
          },
          // New appointment overlaps existing
          {
            appointment_date: {
              gte: appointmentDate,
              lt: endTime,
            },
          },
        ],
      },
      include: {
        patient: true,
      },
    });

    if (overlapping) {
      const overlapTime = overlapping.appointment_date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        reason: `Doctor has an appointment at ${overlapTime}`,
      };
    }

    // Check if within doctor's working hours
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (doctor) {
      const schedule = this.parseAvailableHours(doctor.available_hours);
      const dayName = this.dayNames[appointmentDate.getDay()];
      const dayHours = schedule[dayName];

      if (!dayHours || dayHours.length === 0) {
        return {
          reason: `Doctor doesn't work on ${this.fullDayNames[appointmentDate.getDay()]}s`,
        };
      }

      const appointmentTime = `${appointmentDate.getHours().toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`;
      const isWithinHours = dayHours.some(
        (period) => appointmentTime >= period.start && appointmentTime < period.end,
      );

      if (!isWithinHours) {
        return {
          reason: `Requested time is outside doctor's working hours`,
        };
      }
    }

    return null;
  }

  /**
   * Get service duration in minutes
   */
  getServiceDuration(serviceType: string): number {
    const normalized = serviceType.toLowerCase().trim();
    return this.serviceDurations[normalized] || 60; // Default 60 minutes
  }

  /**
   * Adjust date range based on urgency
   */
  private adjustDateRangeForUrgency(
    start: Date,
    end: Date,
    urgency?: string,
  ): Date {
    switch (urgency) {
      case 'emergency':
        // Same day or next day only
        return this.addDays(start, 1);
      case 'urgent':
        // Within 3 days
        return this.addDays(start, 3);
      case 'soon':
        // Within 1 week
        return this.addDays(start, 7);
      default:
        return end;
    }
  }

  /**
   * Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add minutes to a time string
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }

  /**
   * Get next available slot for a specific doctor
   */
  async getNextAvailableForDoctor(
    clinicId: string,
    doctorId: string,
    serviceType: string,
  ): Promise<TimeSlot | null> {
    const result = await this.findAvailableSlots(clinicId, {
      preferredDoctorId: doctorId,
      serviceType,
      preferredTime: 'any',
    });

    return result.nextAvailableWithPreferred || result.firstAvailable || null;
  }

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(
    clinicId: string,
    doctorId: string,
    date: Date,
    startTime: string,
    serviceType: string,
  ): Promise<boolean> {
    const duration = this.getServiceDuration(serviceType);
    const appointmentDate = new Date(date);
    const [h, m] = startTime.split(':').map(Number);
    appointmentDate.setHours(h, m, 0, 0);

    const conflict = await this.detectConflict(clinicId, doctorId, appointmentDate, duration);
    return conflict === null;
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDoctorId: string,
    newDate: Date,
    newStartTime: string,
  ): Promise<BookingResult> {
    // Get existing appointment
    const existing = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { clinic: true },
    });

    if (!existing) {
      return {
        success: false,
        message: 'Appointment not found',
      };
    }

    // Check new slot availability
    const isAvailable = await this.isSlotAvailable(
      existing.clinic_id,
      newDoctorId,
      newDate,
      newStartTime,
      existing.service_type,
    );

    if (!isAvailable) {
      return {
        success: false,
        message: 'The new slot is not available',
      };
    }

    // Update the appointment
    const [h, m] = newStartTime.split(':').map(Number);
    const newAppointmentDate = new Date(newDate);
    newAppointmentDate.setHours(h, m, 0, 0);

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        doctor_id: newDoctorId,
        appointment_date: newAppointmentDate,
        status: 'rescheduled',
        notes: `Rescheduled from ${existing.appointment_date.toLocaleDateString()}`,
      },
    });

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: newDoctorId },
    });

    return {
      success: true,
      appointmentId,
      message: `Appointment rescheduled to ${newAppointmentDate.toLocaleDateString()} at ${newStartTime} with ${doctor?.name}`,
    };
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: reason,
        },
      });

      return {
        success: true,
        message: 'Appointment cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel appointment',
      };
    }
  }
}
