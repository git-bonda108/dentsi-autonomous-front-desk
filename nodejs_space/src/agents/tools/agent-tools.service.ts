import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientContext, PatientContextService } from '../../conversation/patient-context.service';
import { SchedulingService, SchedulingPreferences, TimeSlot } from '../../scheduling/scheduling.service';
import { TriageService, TriageResult, UrgencyLevel } from '../../triage/triage.service';

/**
 * Tool result interface
 */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

/**
 * Available appointment slot
 */
export interface AvailableSlot {
  date: string;
  time: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
}

/**
 * Booking confirmation
 */
export interface BookingConfirmation {
  appointmentId: string;
  date: string;
  time: string;
  service: string;
  doctorName: string;
  patientName: string;
}

/**
 * Doctor info
 */
export interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  isAvailable: boolean;
}

/**
 * AgentToolsService - Function tools for OpenAI Agents SDK
 * 
 * These tools are called by the AI agent to perform actions like:
 * - Looking up patients
 * - Checking appointment availability
 * - Booking appointments
 * - Getting doctor information
 */
@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly patientContextService: PatientContextService,
    private readonly schedulingService: SchedulingService,
    private readonly triageService: TriageService,
  ) {}

  // ============================================================================
  // PATIENT TOOLS
  // ============================================================================

  /**
   * Tool: lookup_patient
   * Look up a patient by phone number
   */
  async lookupPatient(phone: string, clinicId: string): Promise<ToolResult<PatientContext>> {
    this.logger.log(`[Tool] lookup_patient: ${phone}`);
    
    try {
      const context = await this.patientContextService.buildContextFromPhone(phone, clinicId);
      
      return {
        success: true,
        data: context,
        message: context.isReturningPatient
          ? `Found returning patient: ${context.patientName}`
          : 'New patient - no records found',
      };
    } catch (error) {
      this.logger.error(`[Tool] lookup_patient failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to look up patient',
      };
    }
  }

  /**
   * Tool: create_patient
   * Create a new patient record
   */
  async createPatient(
    clinicId: string,
    name: string,
    phone: string,
    email?: string,
    dateOfBirth?: string,
    insuranceProvider?: string,
    insuranceId?: string,
  ): Promise<ToolResult<{ patientId: string }>> {
    this.logger.log(`[Tool] create_patient: ${name}, ${phone}`);
    
    try {
      // Check if patient already exists
      const existing = await this.prisma.patient.findFirst({
        where: { phone },
      });

      if (existing) {
        return {
          success: true,
          data: { patientId: existing.id },
          message: `Patient already exists: ${existing.name}`,
        };
      }

      const patient = await this.prisma.patient.create({
        data: {
          clinic_id: clinicId,
          name,
          phone,
          email,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
          insurance_provider: insuranceProvider,
          insurance_id: insuranceId,
        },
      });

      return {
        success: true,
        data: { patientId: patient.id },
        message: `Created new patient: ${name}`,
      };
    } catch (error) {
      this.logger.error(`[Tool] create_patient failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create patient',
      };
    }
  }

  /**
   * Tool: update_patient_insurance
   * Update patient's insurance information
   */
  async updatePatientInsurance(
    patientId: string,
    insuranceProvider: string,
    insuranceId: string,
    insuranceGroup?: string,
  ): Promise<ToolResult> {
    this.logger.log(`[Tool] update_patient_insurance: ${patientId}`);
    
    try {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          insurance_provider: insuranceProvider,
          insurance_id: insuranceId,
          insurance_group: insuranceGroup,
          insurance_verified: false, // Staff will verify later
        },
      });

      return {
        success: true,
        message: `Updated insurance to ${insuranceProvider}`,
      };
    } catch (error) {
      this.logger.error(`[Tool] update_patient_insurance failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update insurance',
      };
    }
  }

  // ============================================================================
  // DOCTOR TOOLS
  // ============================================================================

  /**
   * Tool: get_doctors
   * Get list of doctors at a clinic
   */
  async getDoctors(clinicId: string): Promise<ToolResult<DoctorInfo[]>> {
    this.logger.log(`[Tool] get_doctors: ${clinicId}`);
    
    try {
      const doctors = await this.prisma.doctor.findMany({
        where: {
          clinic_id: clinicId,
          is_active: true,
        },
      });

      const doctorInfos: DoctorInfo[] = doctors.map((d) => ({
        id: d.id,
        name: d.name,
        specialty: d.specialty,
        bio: d.bio,
        isAvailable: true, // Would check schedule in production
      }));

      return {
        success: true,
        data: doctorInfos,
        message: `Found ${doctors.length} doctors`,
      };
    } catch (error) {
      this.logger.error(`[Tool] get_doctors failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get doctors',
      };
    }
  }

  /**
   * Tool: get_doctor_availability
   * Check a specific doctor's available slots using smart scheduling
   */
  async getDoctorAvailability(
    doctorId: string,
    clinicId: string,
    serviceType?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ToolResult<AvailableSlot[]>> {
    this.logger.log(`[Tool] get_doctor_availability: ${doctorId}`);
    
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
      });

      if (!doctor) {
        return {
          success: false,
          error: 'Doctor not found',
          message: 'Could not find that doctor',
        };
      }

      // Use the scheduling service for smart slot finding
      const result = await this.schedulingService.findAvailableSlots(
        clinicId,
        {
          preferredDoctorId: doctorId,
          serviceType: serviceType || 'cleaning',
          preferredTime: 'any',
        },
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      // Convert to AvailableSlot format
      const slots: AvailableSlot[] = result.slots
        .filter((s) => s.doctorId === doctorId)
        .map((s) => ({
          date: s.date.toLocaleDateString(),
          time: s.startTime,
          doctorId: s.doctorId,
          doctorName: s.doctorName,
          specialty: s.specialty,
        }));

      return {
        success: true,
        data: slots.slice(0, 10),
        message: `Found ${slots.length} available slots with ${doctor.name}`,
      };
    } catch (error) {
      this.logger.error(`[Tool] get_doctor_availability failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to check availability',
      };
    }
  }

  // ============================================================================
  // APPOINTMENT TOOLS
  // ============================================================================

  /**
   * Tool: check_availability
   * Check general availability at a clinic using smart scheduling
   * 
   * Uses the SchedulingService for:
   * - Doctor availability parsing from JSON schedules
   * - Preference-aware slot prioritization
   * - Service duration matching
   */
  async checkAvailability(
    clinicId: string,
    serviceType?: string,
    preferredDate?: string,
    preferredTime?: string,
    preferredDoctorId?: string,
    urgency?: 'routine' | 'soon' | 'urgent' | 'emergency',
  ): Promise<ToolResult<AvailableSlot[]>> {
    this.logger.log(`[Tool] check_availability: ${clinicId}, ${serviceType}, urgency: ${urgency}`);
    
    try {
      // Build scheduling preferences
      const preferences: SchedulingPreferences = {
        serviceType: serviceType || 'cleaning',
        preferredDoctorId,
        preferredTime: preferredTime as any || 'any',
        urgency: urgency || 'routine',
      };

      // Use the scheduling service for smart slot finding
      const result = await this.schedulingService.findAvailableSlots(
        clinicId,
        preferences,
        preferredDate ? new Date(preferredDate) : undefined,
      );

      if (result.totalFound === 0) {
        return {
          success: false,
          error: 'No availability',
          message: 'No appointment slots available in the requested timeframe. Would you like to check a different week?',
        };
      }

      // Convert to AvailableSlot format
      const slots: AvailableSlot[] = result.slots.map((s) => ({
        date: s.date.toLocaleDateString(),
        time: s.startTime,
        doctorId: s.doctorId,
        doctorName: s.doctorName,
        specialty: s.specialty,
      }));

      // Build a helpful message
      let message = `Found ${result.totalFound} available slots.`;
      
      if (preferredDoctorId && !result.preferredDoctorAvailable) {
        message += ` Your preferred doctor isn't available in this timeframe, but other doctors have openings.`;
      } else if (preferredDoctorId && result.preferredDoctorAvailable) {
        const preferredCount = slots.filter((s) => s.doctorId === preferredDoctorId).length;
        message = `Found ${preferredCount} slots with your preferred doctor.`;
      }

      return {
        success: true,
        data: slots,
        message,
      };
    } catch (error) {
      this.logger.error(`[Tool] check_availability failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to check availability. Let me try again.',
      };
    }
  }

  /**
   * Tool: book_appointment
   * Book an appointment for a patient using smart scheduling
   * 
   * Uses the SchedulingService for:
   * - Conflict detection with detailed reasons
   * - Service duration matching
   * - Alternative slot suggestions if conflict
   */
  async bookAppointment(
    clinicId: string,
    patientId: string,
    doctorId: string,
    dateTime: string,
    serviceType: string,
    reason?: string,
    callId?: string,
  ): Promise<ToolResult<BookingConfirmation>> {
    this.logger.log(`[Tool] book_appointment: ${patientId} with ${doctorId} on ${dateTime}`);
    
    try {
      // Parse the date and time
      const appointmentDate = new Date(dateTime);
      const startTime = `${appointmentDate.getHours().toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`;

      // Get patient info
      const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        return {
          success: false,
          error: 'Patient not found',
          message: 'Could not find patient record',
        };
      }

      // Use the scheduling service for smart booking
      const result = await this.schedulingService.bookAppointment({
        clinicId,
        patientId,
        doctorId,
        date: appointmentDate,
        startTime,
        serviceType,
        duration: this.schedulingService.getServiceDuration(serviceType),
        reason,
        callId,
      });

      if (!result.success) {
        // If conflict, suggest alternatives
        if (result.suggestedAlternatives && result.suggestedAlternatives.length > 0) {
          const alt = result.suggestedAlternatives[0];
          return {
            success: false,
            error: result.conflictDetails,
            message: `${result.message} How about ${alt.date.toLocaleDateString()} at ${alt.startTime} instead?`,
          };
        }
        return {
          success: false,
          error: result.conflictDetails || 'Booking failed',
          message: result.message,
        };
      }

      // Get doctor info for confirmation
      const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });

      return {
        success: true,
        data: {
          appointmentId: result.appointmentId!,
          date: appointmentDate.toLocaleDateString(),
          time: startTime,
          service: serviceType,
          doctorName: doctor?.name || 'Doctor',
          patientName: patient.name,
        },
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`[Tool] book_appointment failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to book appointment. Let me try again or connect you with staff.',
      };
    }
  }

  /**
   * Tool: reschedule_appointment
   * Reschedule an existing appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDoctorId: string,
    newDateTime: string,
  ): Promise<ToolResult<{ appointmentId: string; newDate: string; newTime: string }>> {
    this.logger.log(`[Tool] reschedule_appointment: ${appointmentId} to ${newDateTime}`);
    
    try {
      const newDate = new Date(newDateTime);
      const newTime = `${newDate.getHours().toString().padStart(2, '0')}:${newDate.getMinutes().toString().padStart(2, '0')}`;

      const result = await this.schedulingService.rescheduleAppointment(
        appointmentId,
        newDoctorId,
        newDate,
        newTime,
      );

      if (!result.success) {
        return {
          success: false,
          error: 'Reschedule failed',
          message: result.message,
        };
      }

      return {
        success: true,
        data: {
          appointmentId,
          newDate: newDate.toLocaleDateString(),
          newTime,
        },
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`[Tool] reschedule_appointment failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to reschedule appointment',
      };
    }
  }

  /**
   * Tool: cancel_appointment
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason?: string,
  ): Promise<ToolResult> {
    this.logger.log(`[Tool] cancel_appointment: ${appointmentId}`);
    
    try {
      const result = await this.schedulingService.cancelAppointment(appointmentId, reason);
      
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`[Tool] cancel_appointment failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to cancel appointment',
      };
    }
  }

  /**
   * Tool: get_upcoming_appointments
   * Get a patient's upcoming appointments
   */
  async getUpcomingAppointments(
    patientId: string,
  ): Promise<ToolResult<{ date: string; time: string; service: string; doctor: string; status: string }[]>> {
    this.logger.log(`[Tool] get_upcoming_appointments: ${patientId}`);
    
    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          patient_id: patientId,
          appointment_date: {
            gte: new Date(),
          },
          status: {
            notIn: ['cancelled'],
          },
        },
        include: {
          doctor: true,
        },
        orderBy: { appointment_date: 'asc' },
        take: 5,
      });

      const result = appointments.map((a) => ({
        date: a.appointment_date.toLocaleDateString(),
        time: a.appointment_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: a.service_type,
        doctor: a.doctor?.name || 'TBD',
        status: a.status,
      }));

      return {
        success: true,
        data: result,
        message: result.length > 0
          ? `Found ${result.length} upcoming appointment(s)`
          : 'No upcoming appointments found',
      };
    } catch (error) {
      this.logger.error(`[Tool] get_upcoming_appointments failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve appointments',
      };
    }
  }

  // ============================================================================
  // ESCALATION TOOLS
  // ============================================================================

  /**
   * Tool: create_escalation
   * Create an escalation for human follow-up
   */
  async createEscalation(
    clinicId: string,
    callId: string | null,
    type: 'emergency' | 'complex_request' | 'complaint' | 'technical_issue' | 'human_requested',
    reason: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    conversationSummary?: string,
    patientInfo?: string,
  ): Promise<ToolResult<{ escalationId: string }>> {
    this.logger.log(`[Tool] create_escalation: ${type}, ${priority}`);
    
    try {
      const escalation = await this.prisma.escalation.create({
        data: {
          clinic_id: clinicId,
          call_id: callId,
          type,
          reason,
          priority,
          conversation_summary: conversationSummary,
          patient_info: patientInfo,
          status: 'open',
        },
      });

      return {
        success: true,
        data: { escalationId: escalation.id },
        message: 'Created escalation for staff follow-up',
      };
    } catch (error) {
      this.logger.error(`[Tool] create_escalation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create escalation',
      };
    }
  }

  // ============================================================================
  // SERVICE TOOLS
  // ============================================================================

  /**
   * Tool: get_services
   * Get list of services offered by a clinic
   */
  async getServices(clinicId: string): Promise<ToolResult<{ name: string; duration: number; price: number; category: string }[]>> {
    this.logger.log(`[Tool] get_services: ${clinicId}`);
    
    try {
      const services = await this.prisma.service.findMany({
        where: {
          clinic_id: clinicId,
          is_active: true,
        },
        orderBy: { category: 'asc' },
      });

      const result = services.map((s) => ({
        name: s.service_name,
        duration: s.duration_minutes,
        price: s.price,
        category: s.category,
      }));

      return {
        success: true,
        data: result,
        message: `Found ${services.length} services`,
      };
    } catch (error) {
      this.logger.error(`[Tool] get_services failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve services',
      };
    }
  }

  // ============================================================================
  // CLINIC TOOLS
  // ============================================================================

  /**
   * Tool: get_clinic_info
   * Get clinic information
   */
  async getClinicInfo(clinicId: string): Promise<ToolResult<{ name: string; address: string; phone: string; hours: Record<string, string> }>> {
    this.logger.log(`[Tool] get_clinic_info: ${clinicId}`);
    
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });

      if (!clinic) {
        return {
          success: false,
          error: 'Clinic not found',
          message: 'Could not find clinic information',
        };
      }

      return {
        success: true,
        data: {
          name: clinic.name,
          address: clinic.address,
          phone: clinic.phone,
          hours: clinic.hours ? JSON.parse(clinic.hours) : {},
        },
        message: `Clinic: ${clinic.name}`,
      };
    } catch (error) {
      this.logger.error(`[Tool] get_clinic_info failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve clinic information',
      };
    }
  }

  // ============================================================================
  // TRIAGE TOOLS
  // ============================================================================

  /**
   * Tool: assess_urgency
   * Assess patient symptoms for urgency classification
   */
  async assessUrgency(
    patientContext: PatientContext,
    symptoms: string,
  ): Promise<ToolResult<{
    urgencyLevel: UrgencyLevel;
    urgencyScore: number;
    recommendations: string[];
    medicalAlerts: string[];
    shouldEscalate: boolean;
  }>> {
    this.logger.log(`[Tool] assess_urgency: "${symptoms.substring(0, 50)}..."`);
    
    try {
      const result = await this.triageService.triagePatient(patientContext, symptoms);

      return {
        success: true,
        data: {
          urgencyLevel: result.urgencyLevel,
          urgencyScore: result.urgencyScore,
          recommendations: result.recommendations,
          medicalAlerts: result.medicalAlerts.map(a => `${a.severity.toUpperCase()}: ${a.message}`),
          shouldEscalate: result.shouldEscalate,
        },
        message: `Urgency: ${result.urgencyLevel} (${result.urgencyScore}/10). ${result.estimatedWaitTime}`,
      };
    } catch (error) {
      this.logger.error(`[Tool] assess_urgency failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to assess urgency',
      };
    }
  }

  /**
   * Tool: check_emergency
   * Quick check if symptoms indicate an emergency
   */
  isEmergency(symptoms: string): boolean {
    return this.triageService.isEmergency(symptoms);
  }

  /**
   * Tool: get_medical_alerts
   * Get medical alerts for a patient
   */
  async getMedicalAlerts(
    patientId: string,
  ): Promise<ToolResult<{
    allergies: string[];
    medications: string[];
    conditions: string[];
    notes: string | null;
  }>> {
    this.logger.log(`[Tool] get_medical_alerts: ${patientId}`);
    
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return {
          success: false,
          error: 'Patient not found',
          message: 'Could not find patient',
        };
      }

      // Parse medical history JSON
      let medicalHistory = { allergies: [], medications: [], conditions: [] };
      try {
        if (patient.medical_history) {
          medicalHistory = JSON.parse(patient.medical_history);
        }
      } catch (e) {
        // Ignore parse errors
      }

      const hasAlerts = medicalHistory.allergies.length > 0 || 
                       medicalHistory.medications.length > 0 || 
                       medicalHistory.conditions.length > 0;

      return {
        success: true,
        data: {
          allergies: medicalHistory.allergies || [],
          medications: medicalHistory.medications || [],
          conditions: medicalHistory.conditions || [],
          notes: patient.notes,
        },
        message: hasAlerts
          ? `Found ${medicalHistory.allergies.length} allergies, ${medicalHistory.medications.length} medications, ${medicalHistory.conditions.length} conditions`
          : 'No medical alerts on file',
      };
    } catch (error) {
      this.logger.error(`[Tool] get_medical_alerts failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve medical alerts',
      };
    }
  }

  /**
   * Tool: get_patient_history
   * Get comprehensive patient history for context
   */
  async getPatientHistory(
    patientId: string,
  ): Promise<ToolResult<{
    totalVisits: number;
    lastVisit: string | null;
    recentAppointments: { date: string; service: string; doctor: string }[];
    treatmentHistory: { date: string; type: string; notes?: string }[];
    preferredDoctor: string | null;
    insuranceStatus: string;
  }>> {
    this.logger.log(`[Tool] get_patient_history: ${patientId}`);
    
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          preferred_doctor: true,
          appointments: {
            include: { doctor: true },
            orderBy: { appointment_date: 'desc' },
            take: 10,
          },
        },
      });

      if (!patient) {
        return {
          success: false,
          error: 'Patient not found',
          message: 'Could not find patient',
        };
      }

      // Parse dental history
      let dentalHistory: { treatments?: any[] } = {};
      try {
        if (patient.dental_history) {
          dentalHistory = JSON.parse(patient.dental_history);
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Get completed appointments
      const completedAppointments = patient.appointments
        .filter(a => a.status === 'completed')
        .slice(0, 5)
        .map(a => ({
          date: a.appointment_date.toLocaleDateString(),
          service: a.service_type,
          doctor: a.doctor?.name || 'Unknown',
        }));

      // Get treatment history
      const treatmentHistory = dentalHistory.treatments || [];

      // Insurance status
      let insuranceStatus = 'No insurance on file';
      if (patient.insurance_provider) {
        insuranceStatus = patient.insurance_verified
          ? `${patient.insurance_provider} (verified)`
          : `${patient.insurance_provider} (needs verification)`;
      }

      return {
        success: true,
        data: {
          totalVisits: patient.total_visits || 0,
          lastVisit: patient.last_visit_date?.toLocaleDateString() || null,
          recentAppointments: completedAppointments,
          treatmentHistory: treatmentHistory.slice(0, 5),
          preferredDoctor: patient.preferred_doctor?.name || null,
          insuranceStatus,
        },
        message: `Patient has ${patient.total_visits || 0} visits on record`,
      };
    } catch (error) {
      this.logger.error(`[Tool] get_patient_history failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve patient history',
      };
    }
  }
}
