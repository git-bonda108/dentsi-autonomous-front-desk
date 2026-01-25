import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Patient context structure for AI prompt injection
 */
export interface PatientContext {
  // Basic Info
  patientId: string | null;
  patientName: string | null;
  isReturningPatient: boolean;
  phone: string;
  
  // History Summary
  lastVisitDate: string | null;
  lastVisitDaysAgo: number | null;
  totalVisits: number;
  noShowCount: number;
  
  // Preferences
  preferredDoctorId: string | null;
  preferredDoctorName: string | null;
  preferredTime: string | null; // morning, afternoon, evening
  preferredDays: string[] | null;
  language: string;
  
  // Insurance
  hasInsurance: boolean;
  insuranceProvider: string | null;
  insuranceId: string | null;
  insuranceVerified: boolean;
  
  // Medical Context
  allergies: string[];
  medications: string[];
  conditions: string[];
  
  // Dental History
  lastCleaning: string | null;
  recentTreatments: { date: string; type: string; notes?: string }[];
  
  // Upcoming
  upcomingAppointments: {
    date: string;
    time: string;
    service: string;
    doctorName: string;
  }[];
  
  // Recall Status
  isDueForCleaning: boolean;
  nextRecallDate: string | null;
  
  // Notes
  staffNotes: string | null;
}

/**
 * PatientContextService - Builds rich context for AI conversations
 * 
 * This service retrieves patient information and builds a comprehensive
 * context object that can be injected into AI prompts for personalized
 * conversations.
 */
@Injectable()
export class PatientContextService {
  private readonly logger = new Logger(PatientContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build complete patient context from phone number
   * This is the main entry point - called when a call comes in
   */
  async buildContextFromPhone(phone: string, clinicId: string): Promise<PatientContext> {
    this.logger.log(`Building patient context for phone: ${phone}`);

    // Try to find existing patient
    const patient = await this.prisma.patient.findFirst({
      where: { phone },
      include: {
        preferred_doctor: true,
        appointments: {
          where: {
            appointment_date: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
            },
          },
          include: {
            doctor: true,
          },
          orderBy: { appointment_date: 'desc' },
          take: 10,
        },
      },
    });

    if (!patient) {
      this.logger.log(`New patient - no history found for ${phone}`);
      return this.buildNewPatientContext(phone);
    }

    return this.buildReturningPatientContext(patient, clinicId);
  }

  /**
   * Build context for a new patient (no history)
   */
  private buildNewPatientContext(phone: string): PatientContext {
    return {
      patientId: null,
      patientName: null,
      isReturningPatient: false,
      phone,
      
      lastVisitDate: null,
      lastVisitDaysAgo: null,
      totalVisits: 0,
      noShowCount: 0,
      
      preferredDoctorId: null,
      preferredDoctorName: null,
      preferredTime: null,
      preferredDays: null,
      language: 'en',
      
      hasInsurance: false,
      insuranceProvider: null,
      insuranceId: null,
      insuranceVerified: false,
      
      allergies: [],
      medications: [],
      conditions: [],
      
      lastCleaning: null,
      recentTreatments: [],
      
      upcomingAppointments: [],
      
      isDueForCleaning: false,
      nextRecallDate: null,
      
      staffNotes: null,
    };
  }

  /**
   * Build comprehensive context for returning patient
   */
  private buildReturningPatientContext(patient: any, clinicId: string): PatientContext {
    // Parse medical history JSON
    let medicalHistory = { allergies: [], medications: [], conditions: [] };
    try {
      if (patient.medical_history) {
        medicalHistory = JSON.parse(patient.medical_history);
      }
    } catch (e) {
      this.logger.warn('Failed to parse medical history');
    }

    // Parse dental history JSON
    let dentalHistory = { last_cleaning: null, treatments: [] };
    try {
      if (patient.dental_history) {
        dentalHistory = JSON.parse(patient.dental_history);
      }
    } catch (e) {
      this.logger.warn('Failed to parse dental history');
    }

    // Parse preferred days
    let preferredDays: string[] | null = null;
    try {
      if (patient.preferred_days) {
        preferredDays = JSON.parse(patient.preferred_days);
      }
    } catch (e) {
      this.logger.warn('Failed to parse preferred days');
    }

    // Calculate days since last visit
    let lastVisitDaysAgo: number | null = null;
    if (patient.last_visit_date) {
      const diffMs = Date.now() - new Date(patient.last_visit_date).getTime();
      lastVisitDaysAgo = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    }

    // Check if due for cleaning (6 months = 180 days)
    const isDueForCleaning = lastVisitDaysAgo !== null && lastVisitDaysAgo > 180;

    // Get upcoming appointments
    const now = new Date();
    const upcomingAppointments = patient.appointments
      .filter((apt: any) => new Date(apt.appointment_date) > now && apt.status !== 'cancelled')
      .map((apt: any) => ({
        date: new Date(apt.appointment_date).toLocaleDateString(),
        time: new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        service: apt.service_type,
        doctorName: apt.doctor?.name || 'TBD',
      }));

    // Get recent treatments from past appointments
    const recentTreatments = patient.appointments
      .filter((apt: any) => new Date(apt.appointment_date) <= now && apt.status === 'completed')
      .slice(0, 5)
      .map((apt: any) => ({
        date: new Date(apt.appointment_date).toLocaleDateString(),
        type: apt.service_type,
        notes: apt.notes || undefined,
      }));

    return {
      patientId: patient.id,
      patientName: patient.name,
      isReturningPatient: true,
      phone: patient.phone,
      
      lastVisitDate: patient.last_visit_date 
        ? new Date(patient.last_visit_date).toLocaleDateString()
        : null,
      lastVisitDaysAgo,
      totalVisits: patient.total_visits || 0,
      noShowCount: patient.no_show_count || 0,
      
      preferredDoctorId: patient.preferred_doctor_id,
      preferredDoctorName: patient.preferred_doctor?.name || null,
      preferredTime: patient.preferred_time,
      preferredDays,
      language: patient.language || 'en',
      
      hasInsurance: !!patient.insurance_provider,
      insuranceProvider: patient.insurance_provider,
      insuranceId: patient.insurance_id,
      insuranceVerified: patient.insurance_verified || false,
      
      allergies: medicalHistory.allergies || [],
      medications: medicalHistory.medications || [],
      conditions: medicalHistory.conditions || [],
      
      lastCleaning: dentalHistory.last_cleaning || null,
      recentTreatments,
      
      upcomingAppointments,
      
      isDueForCleaning,
      nextRecallDate: patient.next_recall_date 
        ? new Date(patient.next_recall_date).toLocaleDateString()
        : null,
      
      staffNotes: patient.notes,
    };
  }

  /**
   * Generate a natural language summary for the AI prompt
   */
  generateContextSummary(context: PatientContext): string {
    if (!context.isReturningPatient) {
      return `This is a NEW PATIENT calling. No history on file. Collect their name, phone confirmation, and reason for visit.`;
    }

    const parts: string[] = [];

    // Basic identification
    parts.push(`RETURNING PATIENT: ${context.patientName}`);
    
    // Visit history
    if (context.lastVisitDate) {
      parts.push(`Last visit: ${context.lastVisitDate} (${context.lastVisitDaysAgo} days ago)`);
    }
    parts.push(`Total visits: ${context.totalVisits}`);

    // Cleaning status
    if (context.isDueForCleaning) {
      parts.push(`⚠️ OVERDUE for cleaning - last cleaning was over 6 months ago`);
    } else if (context.lastCleaning) {
      parts.push(`Last cleaning: ${context.lastCleaning}`);
    }

    // Doctor preference
    if (context.preferredDoctorName) {
      parts.push(`Preferred doctor: ${context.preferredDoctorName}`);
    }

    // Time preferences
    if (context.preferredTime) {
      parts.push(`Prefers: ${context.preferredTime} appointments`);
    }
    if (context.preferredDays && context.preferredDays.length > 0) {
      parts.push(`Preferred days: ${context.preferredDays.join(', ')}`);
    }

    // Insurance
    if (context.hasInsurance) {
      const verified = context.insuranceVerified ? '(verified)' : '(needs verification)';
      parts.push(`Insurance: ${context.insuranceProvider} ${verified}`);
    } else {
      parts.push(`No insurance on file`);
    }

    // Medical alerts
    if (context.allergies.length > 0) {
      parts.push(`⚠️ ALLERGIES: ${context.allergies.join(', ')}`);
    }
    if (context.conditions.length > 0) {
      parts.push(`Medical conditions: ${context.conditions.join(', ')}`);
    }

    // Upcoming appointments
    if (context.upcomingAppointments.length > 0) {
      const next = context.upcomingAppointments[0];
      parts.push(`Upcoming appointment: ${next.date} at ${next.time} for ${next.service} with ${next.doctorName}`);
    }

    // No-show warning
    if (context.noShowCount >= 2) {
      parts.push(`⚠️ No-show history: ${context.noShowCount} missed appointments - confirm 24h before`);
    }

    // Staff notes
    if (context.staffNotes) {
      parts.push(`Staff notes: ${context.staffNotes}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate context variables for template interpolation
   */
  getTemplateVariables(context: PatientContext, clinicName: string): Record<string, string> {
    return {
      patient_name: context.patientName || 'there',
      clinic_name: clinicName,
      last_visit_date: context.lastVisitDate || 'N/A',
      last_visit_days_ago: context.lastVisitDaysAgo?.toString() || 'N/A',
      preferred_doctor: context.preferredDoctorName || 'any available doctor',
      preferred_time: context.preferredTime || 'any time',
      preferred_days: context.preferredDays?.join(', ') || 'any day',
      insurance_provider: context.insuranceProvider || 'none on file',
      insurance_id: context.insuranceId || 'N/A',
      total_visits: context.totalVisits.toString(),
      last_cleaning: context.lastCleaning || 'unknown',
      allergies: context.allergies.length > 0 ? context.allergies.join(', ') : 'none known',
      upcoming_appointments: context.upcomingAppointments.length > 0
        ? context.upcomingAppointments.map(a => `${a.date} at ${a.time}`).join('; ')
        : 'none scheduled',
    };
  }
}
