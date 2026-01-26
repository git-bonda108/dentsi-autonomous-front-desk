import { Controller, Post, Get, Logger, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin Controller
 * Endpoints for seeding data and admin operations
 */
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed doctors for all clinics
   */
  @Post('seed-doctors')
  @HttpCode(200)
  async seedDoctors() {
    this.logger.log('🌱 Seeding doctors...');

    try {
      // Get all clinics
      const clinics = await this.prisma.clinic.findMany();
      
      if (clinics.length === 0) {
        return { success: false, message: 'No clinics found' };
      }

      const doctorsCreated = [];

      for (const clinic of clinics) {
        // Check if doctors already exist for this clinic
        const existingDoctors = await this.prisma.doctor.findMany({
          where: { clinic_id: clinic.id },
        });

        if (existingDoctors.length > 0) {
          doctorsCreated.push(...existingDoctors);
          continue;
        }

        // Create doctors for this clinic
        const doctors = await Promise.all([
          this.prisma.doctor.create({
            data: {
              clinic_id: clinic.id,
              name: 'Dr. Sarah Johnson',
              specialty: 'General Dentistry',
              phone: '+15551001001',
              email: `dr.johnson@${clinic.name.toLowerCase().replace(/\s/g, '')}.com`,
              bio: 'Experienced general dentist with 10+ years in family care.',
              available_hours: JSON.stringify({
                mon: ['09:00-12:00', '13:00-17:00'],
                tue: ['09:00-12:00', '13:00-17:00'],
                wed: ['09:00-12:00', '13:00-17:00'],
                thu: ['09:00-12:00', '13:00-17:00'],
                fri: ['09:00-15:00'],
              }),
              is_active: true,
            },
          }),
          this.prisma.doctor.create({
            data: {
              clinic_id: clinic.id,
              name: 'Dr. Michael Chen',
              specialty: 'Cosmetic Dentistry',
              phone: '+15551001002',
              email: `dr.chen@${clinic.name.toLowerCase().replace(/\s/g, '')}.com`,
              bio: 'Specialist in teeth whitening and smile makeovers.',
              available_hours: JSON.stringify({
                mon: ['10:00-12:00', '14:00-18:00'],
                tue: ['10:00-12:00', '14:00-18:00'],
                wed: ['10:00-12:00', '14:00-18:00'],
                thu: ['10:00-12:00', '14:00-18:00'],
                fri: ['10:00-14:00'],
              }),
              is_active: true,
            },
          }),
          this.prisma.doctor.create({
            data: {
              clinic_id: clinic.id,
              name: 'Dr. Emily Rodriguez',
              specialty: 'Endodontics',
              phone: '+15551001003',
              email: `dr.rodriguez@${clinic.name.toLowerCase().replace(/\s/g, '')}.com`,
              bio: 'Root canal specialist with gentle techniques.',
              available_hours: JSON.stringify({
                mon: ['09:00-13:00'],
                tue: ['09:00-13:00', '14:00-17:00'],
                wed: ['09:00-13:00'],
                thu: ['09:00-13:00', '14:00-17:00'],
                fri: ['09:00-12:00'],
              }),
              is_active: true,
            },
          }),
        ]);

        doctorsCreated.push(...doctors);
        this.logger.log(`Created ${doctors.length} doctors for ${clinic.name}`);
      }

      return {
        success: true,
        message: `Seeded ${doctorsCreated.length} doctors`,
        doctors: doctorsCreated.map(d => ({
          id: d.id,
          name: d.name,
          specialty: d.specialty,
          clinic_id: d.clinic_id,
        })),
      };
    } catch (error) {
      this.logger.error(`Error seeding doctors: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all doctors
   */
  @Get('doctors')
  async getDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      include: { clinic: true },
    });
    return doctors;
  }

  /**
   * Seed services with real pricing
   */
  @Post('seed-services')
  @HttpCode(200)
  async seedServices() {
    this.logger.log('🌱 Seeding services...');

    try {
      const clinics = await this.prisma.clinic.findMany();
      
      // Real dental service pricing (average US prices 2025-2026)
      const serviceData = [
        { name: 'Regular Cleaning', price: 120, duration: 60, category: 'preventive' },
        { name: 'Deep Cleaning', price: 275, duration: 90, category: 'preventive' },
        { name: 'Routine Checkup', price: 85, duration: 30, category: 'preventive' },
        { name: 'Dental X-Ray', price: 50, duration: 15, category: 'diagnostic' },
        { name: 'Full Mouth X-Rays', price: 150, duration: 30, category: 'diagnostic' },
        { name: 'Teeth Whitening', price: 350, duration: 60, category: 'cosmetic' },
        { name: 'Dental Filling (Composite)', price: 200, duration: 45, category: 'restorative' },
        { name: 'Dental Filling (Amalgam)', price: 150, duration: 45, category: 'restorative' },
        { name: 'Crown (Porcelain)', price: 1200, duration: 90, category: 'restorative' },
        { name: 'Crown (Metal)', price: 900, duration: 90, category: 'restorative' },
        { name: 'Root Canal (Front Tooth)', price: 750, duration: 90, category: 'endodontic' },
        { name: 'Root Canal (Molar)', price: 1100, duration: 120, category: 'endodontic' },
        { name: 'Tooth Extraction (Simple)', price: 150, duration: 30, category: 'oral_surgery' },
        { name: 'Tooth Extraction (Surgical)', price: 350, duration: 60, category: 'oral_surgery' },
        { name: 'Wisdom Tooth Removal', price: 400, duration: 60, category: 'oral_surgery' },
        { name: 'Dental Implant', price: 3500, duration: 120, category: 'implants' },
        { name: 'Dental Bridge (3-unit)', price: 2500, duration: 120, category: 'restorative' },
        { name: 'Dentures (Full Set)', price: 1800, duration: 90, category: 'prosthetics' },
        { name: 'Dentures (Partial)', price: 1200, duration: 60, category: 'prosthetics' },
        { name: 'Emergency Visit', price: 150, duration: 30, category: 'emergency' },
        { name: 'Night Guard', price: 400, duration: 30, category: 'preventive' },
        { name: 'Fluoride Treatment', price: 35, duration: 15, category: 'preventive' },
        { name: 'Dental Sealants (per tooth)', price: 45, duration: 20, category: 'preventive' },
      ];

      let created = 0;
      for (const clinic of clinics) {
        for (const service of serviceData) {
          // Check if service exists
          const existing = await this.prisma.service.findFirst({
            where: {
              clinic_id: clinic.id,
              service_name: service.name,
            },
          });
          
          if (existing) {
            await this.prisma.service.update({
              where: { id: existing.id },
              data: {
                price: service.price,
                duration_minutes: service.duration,
                category: service.category,
              },
            });
          } else {
            await this.prisma.service.create({
              data: {
                clinic_id: clinic.id,
                service_name: service.name,
                price: service.price,
                duration_minutes: service.duration,
                category: service.category,
                is_active: true,
              },
            });
          }
          created++;
        }
      }

      return {
        success: true,
        message: `Seeded ${created} services across ${clinics.length} clinics`,
      };
    } catch (error) {
      this.logger.error(`Error seeding services: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get database stats
   */
  @Get('stats')
  async getStats() {
    const [clinics, doctors, patients, appointments, calls, services] = await Promise.all([
      this.prisma.clinic.count(),
      this.prisma.doctor.count(),
      this.prisma.patient.count(),
      this.prisma.appointment.count(),
      this.prisma.call.count(),
      this.prisma.service.count(),
    ]);

    return {
      clinics,
      doctors,
      patients,
      appointments,
      calls,
      services,
    };
  }
}
