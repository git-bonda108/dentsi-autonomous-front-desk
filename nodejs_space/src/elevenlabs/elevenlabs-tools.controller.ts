import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { demoConfig } from '../config/demo-config';

/**
 * ElevenLabs Tools Controller
 * 
 * These endpoints are called by ElevenLabs Conversational AI agent
 * to interact with our database during phone calls.
 * 
 * Configure these as "Tools" in ElevenLabs Agent settings.
 */
@Controller('elevenlabs/tools')
export class ElevenLabsToolsController {
  private readonly logger = new Logger(ElevenLabsToolsController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tool: lookup_patient
   * Called when call starts to check if patient is new or returning
   */
  @Post('lookup-patient')
  @HttpCode(200)
  async lookupPatient(@Body() body: { phone: string; clinic_id?: string }) {
    this.logger.log(`🔍 Looking up patient: ${body.phone}`);

    try {
      // Get clinic info - check active clinic first (set via Streamlit demo)
      let clinic = null;
      if (body.clinic_id) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: body.clinic_id },
        });
      }
      // Check demo config for active clinic
      if (!clinic && demoConfig.getActiveClinicId()) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: demoConfig.getActiveClinicId() },
        });
      }
      // Fallback to first active clinic
      if (!clinic) {
        clinic = await this.prisma.clinic.findFirst({
          where: { is_active: true },
          orderBy: { name: 'asc' },
        });
      }

      const clinicContext = clinic ? {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        clinic_phone: clinic.phone,
        clinic_address: clinic.address,
        clinic_hours: clinic.hours,
      } : null;

      // Normalize phone number
      const phone = body.phone.replace(/\D/g, '');
      const phoneVariants = [
        phone,
        `+${phone}`,
        `+1${phone}`,
        phone.slice(-10),
      ];

      const patient = await this.prisma.patient.findFirst({
        where: {
          phone: { in: phoneVariants },
        },
        include: {
          appointments: {
            orderBy: { appointment_date: 'desc' },
            take: 5,
          },
          preferred_doctor: true,
        },
      });

      if (!patient) {
        return {
          is_new_patient: true,
          message: `Welcome to ${clinic?.name || 'our office'}! This is your first time calling - you're in great hands!`,
          patient: null,
          ...clinicContext,
        };
      }

      // Get last visit info
      const lastAppointment = patient.appointments[0];
      const upcomingAppointments = patient.appointments.filter(
        a => new Date(a.appointment_date) > new Date()
      );

      // Calculate days since last visit
      const daysSinceLastVisit = lastAppointment
        ? Math.floor((Date.now() - new Date(lastAppointment.appointment_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        is_new_patient: false,
        patient_id: patient.id,
        patient_name: patient.name,
        first_name: patient.name.split(' ')[0],
        phone: patient.phone,
        email: patient.email,
        insurance_provider: patient.insurance_provider,
        insurance_id: patient.insurance_id,
        preferred_doctor: patient.preferred_doctor?.name || null,
        last_visit_date: lastAppointment?.appointment_date || null,
        last_service: lastAppointment?.service_type || null,
        days_since_last_visit: daysSinceLastVisit,
        is_due_for_cleaning: daysSinceLastVisit ? daysSinceLastVisit > 180 : false,
        upcoming_appointments: upcomingAppointments.map(a => ({
          date: a.appointment_date,
          service: a.service_type,
          time: a.start_time,
        })),
        message: upcomingAppointments.length > 0
          ? `Welcome back ${patient.name.split(' ')[0]}! You have an upcoming ${upcomingAppointments[0].service_type} on ${new Date(upcomingAppointments[0].appointment_date).toLocaleDateString()}.`
          : `Welcome back ${patient.name.split(' ')[0]}! Great to hear from you again.`,
        ...clinicContext,
      };
    } catch (error) {
      this.logger.error(`Error looking up patient: ${error.message}`);
      return {
        is_new_patient: true,
        message: "Welcome! I'd be happy to help you today.",
        error: error.message,
      };
    }
  }

  /**
   * Tool: check_availability
   * Get available appointment slots
   */
  @Post('check-availability')
  @HttpCode(200)
  async checkAvailability(@Body() body: {
    date?: string;
    service_type?: string;
    doctor_id?: string;
    clinic_id?: string;
  }) {
    this.logger.log(`📅 Checking availability: ${JSON.stringify(body)}`);

    try {
      const targetDate = body.date ? new Date(body.date) : new Date();
      
      // Get clinic info - check demo config first
      let clinic = null;
      if (body.clinic_id) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: body.clinic_id },
        });
      }
      if (!clinic && demoConfig.getActiveClinicId()) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: demoConfig.getActiveClinicId() },
        });
      }
      if (!clinic) {
        clinic = await this.prisma.clinic.findFirst({
          where: { is_active: true },
          orderBy: { name: 'asc' },
        });
      }
      const clinicId = clinic?.id;

      // Get doctors
      const doctors = await this.prisma.doctor.findMany({
        where: {
          clinic_id: clinicId,
          is_active: true,
        },
      });

      // Get existing appointments for the date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await this.prisma.appointment.findMany({
        where: {
          clinic_id: clinicId,
          appointment_date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { in: ['scheduled', 'confirmed'] },
        },
      });

      // Generate available slots (9am-5pm, 30 min intervals)
      const slots = [];
      const bookedSlots = new Set(
        existingAppointments.map(a => `${a.doctor_id}-${a.start_time}`)
      );

      for (const doctor of doctors) {
        for (let hour = 9; hour < 17; hour++) {
          for (const minute of ['00', '30']) {
            const time = `${hour.toString().padStart(2, '0')}:${minute}`;
            const slotKey = `${doctor.id}-${time}`;
            
            if (!bookedSlots.has(slotKey)) {
              slots.push({
                doctor_id: doctor.id,
                doctor_name: doctor.name,
                specialty: doctor.specialty,
                date: targetDate.toISOString().split('T')[0],
                time,
                formatted: `${new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${hour > 12 ? hour - 12 : hour}:${minute} ${hour >= 12 ? 'PM' : 'AM'} with Dr. ${doctor.name.split(' ').pop()}`,
              });
            }
          }
        }
      }

      // Return first 5 slots
      const availableSlots = slots.slice(0, 5);

      return {
        clinic_name: clinic?.name || 'our office',
        date: targetDate.toISOString().split('T')[0],
        day_of_week: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
        available_slots: availableSlots,
        total_available: slots.length,
        message: availableSlots.length > 0
          ? `I have ${availableSlots.length} slots available at ${clinic?.name || 'our office'}. The first one is ${availableSlots[0].formatted}.`
          : `No slots available on ${targetDate.toLocaleDateString()}. Would you like to try another day?`,
      };
    } catch (error) {
      this.logger.error(`Error checking availability: ${error.message}`);
      return {
        available_slots: [],
        message: "I'm having trouble checking availability. Let me connect you with staff.",
        error: error.message,
      };
    }
  }

  /**
   * Tool: book_appointment
   * Create a new appointment in the database
   */
  @Post('book-appointment')
  @HttpCode(200)
  async bookAppointment(@Body() body: {
    patient_name: string;
    patient_phone: string;
    patient_email?: string;
    service_type: string;
    date: string;
    time: string;
    doctor_id?: string;
    insurance_provider?: string;
    insurance_id?: string;
    notes?: string;
    clinic_id?: string;
  }) {
    this.logger.log(`✅ Booking appointment: ${JSON.stringify(body)}`);

    try {
      // Get clinic - check demo config first
      let clinic = null;
      if (body.clinic_id) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: body.clinic_id },
        });
      }
      if (!clinic && demoConfig.getActiveClinicId()) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: demoConfig.getActiveClinicId() },
        });
      }
      if (!clinic) {
        clinic = await this.prisma.clinic.findFirst({
          where: { is_active: true },
          orderBy: { name: 'asc' },
        });
      }
      
      if (!clinic) {
        return {
          success: false,
          message: "No clinic found. Please contact staff directly.",
        };
      }
      const clinicId = clinic.id;
      
      const phone = body.patient_phone.replace(/\D/g, '');

      // Find or create patient
      let patient = await this.prisma.patient.findFirst({
        where: { phone: { contains: phone.slice(-10) } },
      });

      if (!patient) {
        patient = await this.prisma.patient.create({
          data: {
            clinic_id: clinicId,
            name: body.patient_name,
            phone: body.patient_phone,
            email: body.patient_email,
            insurance_provider: body.insurance_provider,
            insurance_id: body.insurance_id,
          },
        });
        this.logger.log(`Created new patient: ${patient.id}`);
      } else if (body.insurance_provider) {
        // Update insurance if provided
        await this.prisma.patient.update({
          where: { id: patient.id },
          data: {
            insurance_provider: body.insurance_provider,
            insurance_id: body.insurance_id,
          },
        });
      }

      // Get doctor (use first available if not specified)
      let doctorId = body.doctor_id;
      if (!doctorId) {
        const doctor = await this.prisma.doctor.findFirst({
          where: { clinic_id: clinicId, is_active: true },
        });
        doctorId = doctor?.id;
      }

      // Parse date
      const appointmentDate = new Date(body.date);

      // Create appointment
      const appointment = await this.prisma.appointment.create({
        data: {
          clinic_id: clinicId,
          patient_id: patient.id,
          doctor_id: doctorId,
          service_type: body.service_type,
          appointment_date: appointmentDate,
          start_time: body.time,
          status: 'scheduled',
          notes: body.notes || 'Booked via Dentsi AI',
        },
        include: {
          doctor: true,
        },
      });

      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      const firstName = patient.name.split(' ')[0];
      const hasEmail = !!body.patient_email;
      
      return {
        success: true,
        appointment_id: appointment.id,
        patient_id: patient.id,
        patient_name: patient.name,
        patient_first_name: firstName,
        patient_email: body.patient_email || null,
        email_sent: hasEmail,
        service: body.service_type,
        date: formattedDate,
        time: body.time,
        doctor_name: appointment.doctor?.name || 'Our team',
        clinic_name: clinic.name,
        insurance_provider: body.insurance_provider || null,
        message: hasEmail 
          ? `${firstName}, you're all set! Your ${body.service_type} at ${clinic.name} is confirmed for ${formattedDate} at ${body.time}. A confirmation email has been sent to ${body.patient_email}.`
          : `${firstName}, you're all booked! Your ${body.service_type} at ${clinic.name} is confirmed for ${formattedDate} at ${body.time}. We have you in our system and you'll get a text reminder.`,
        confirmation_details: {
          patient: firstName,
          service: body.service_type,
          clinic: clinic.name,
          date: formattedDate,
          time: body.time,
          doctor: appointment.doctor?.name || 'Our team',
          insurance: body.insurance_provider || 'Not provided',
        },
      };
    } catch (error) {
      this.logger.error(`Error booking appointment: ${error.message}`);
      return {
        success: false,
        message: "I'm having trouble completing the booking. Let me connect you with staff to finish this up.",
        error: error.message,
      };
    }
  }

  /**
   * Tool: get_services
   * Get list of services with pricing
   */
  @Post('get-services')
  @HttpCode(200)
  async getServices(@Body() body: { clinic_id?: string }) {
    this.logger.log(`📋 Getting services`);

    try {
      // Get clinic - check demo config first
      let clinic = null;
      if (body.clinic_id) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: body.clinic_id },
        });
      }
      if (!clinic && demoConfig.getActiveClinicId()) {
        clinic = await this.prisma.clinic.findUnique({
          where: { id: demoConfig.getActiveClinicId() },
        });
      }
      if (!clinic) {
        clinic = await this.prisma.clinic.findFirst({
          where: { is_active: true },
          orderBy: { name: 'asc' },
        });
      }

      const services = await this.prisma.service.findMany({
        where: {
          clinic_id: clinic?.id,
          is_active: true,
        },
        orderBy: { service_name: 'asc' },
      });

      if (services.length === 0) {
        // Return default services
        return {
          clinic_name: clinic?.name || 'our office',
          services: [
            { name: 'Dental Cleaning', price: 120, duration: 45 },
            { name: 'Routine Checkup', price: 85, duration: 30 },
            { name: 'Teeth Whitening', price: 350, duration: 60 },
            { name: 'Dental Filling', price: 180, duration: 45 },
            { name: 'Crown', price: 1200, duration: 90 },
            { name: 'Root Canal', price: 950, duration: 90 },
            { name: 'Tooth Extraction', price: 200, duration: 45 },
            { name: 'Emergency Visit', price: 150, duration: 30 },
          ],
        };
      }

      return {
        clinic_name: clinic?.name || 'our office',
        services: services.map(s => ({
          name: s.service_name,
          price: s.price,
          duration: s.duration_minutes,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting services: ${error.message}`);
      return {
        services: [],
        error: error.message,
      };
    }
  }

  /**
   * Tool: log_conversation
   * Save conversation summary after call ends
   */
  @Post('log-conversation')
  @HttpCode(200)
  async logConversation(@Body() body: {
    call_id: string;
    patient_phone: string;
    patient_name?: string;
    summary: string;
    outcome: string;
    duration_seconds: number;
    appointment_booked: boolean;
    sentiment?: string;
    clinic_id?: string;
  }) {
    this.logger.log(`📝 Logging conversation: ${body.call_id}`);

    try {
      // Get default clinic if not specified
      let clinicId = body.clinic_id;
      if (!clinicId) {
        const defaultClinic = await this.prisma.clinic.findFirst({
          where: { is_active: true },
          orderBy: { name: 'asc' },
        });
        clinicId = defaultClinic?.id;
      }
      
      if (!clinicId) {
        return {
          success: false,
          error: 'No clinic found',
        };
      }

      // Find patient
      const patient = await this.prisma.patient.findFirst({
        where: { phone: { contains: body.patient_phone.replace(/\D/g, '').slice(-10) } },
      });

      // Create call log
      const call = await this.prisma.call.create({
        data: {
          call_sid: body.call_id,
          clinic_id: clinicId as string,
          patient_id: patient?.id,
          caller_phone: body.patient_phone,
          transcript: body.summary,
          duration: body.duration_seconds,
          status: 'completed',
          outcome: body.outcome,
          sentiment_score: body.sentiment === 'positive' ? 0.8 : body.sentiment === 'negative' ? 0.3 : 0.5,
        },
      });

      return {
        success: true,
        call_id: call.id,
        message: 'Conversation logged successfully',
      };
    } catch (error) {
      this.logger.error(`Error logging conversation: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
