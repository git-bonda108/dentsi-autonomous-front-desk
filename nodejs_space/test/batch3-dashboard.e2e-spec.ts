import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Dashboard API (Batch 3 - e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testClinicId: string;
  let testPatientId: string;
  let testCallId: string;
  let testAppointmentId: string;
  let escalationCallId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup test data
    const clinic = await prisma.clinic.create({
      data: {
        name: `Dashboard Test Clinic ${Date.now()}`,
        address: '123 Test St',
        phone: '+15551234567',
        hours: JSON.stringify({ mon: '9-5', tue: '9-5' }),
      },
    });
    testClinicId = clinic.id;

    const patient = await prisma.patient.create({
      data: {
        name: 'Dashboard Tester',
        phone: '+15559876543',
        email: `dashboard.tester.${Date.now()}@test.com`,
        date_of_birth: new Date('1990-01-01'),
      },
    });
    testPatientId = patient.id;

    // Create test call
    const call = await prisma.call.create({
      data: {
        clinic_id: testClinicId,
        patient_id: testPatientId,
        call_sid: `test-call-${Date.now()}`,
        status: 'completed',
        duration: 120,
        metadata: JSON.stringify({ test: true }),
      },
    });
    testCallId = call.id;

    // Create test appointment
    const appointment = await prisma.appointment.create({
      data: {
        clinic_id: testClinicId,
        patient_id: testPatientId,
        call_id: testCallId,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        service_type: 'cleaning',
        status: 'confirmed',
      },
    });
    testAppointmentId = appointment.id;

    // Create escalation call
    const escalationCall = await prisma.call.create({
      data: {
        clinic_id: testClinicId,
        patient_id: testPatientId,
        call_sid: `test-escalation-${Date.now()}`,
        status: 'escalated',
        duration: 60,
        metadata: JSON.stringify({ needs_attention: true }),
      },
    });
    escalationCallId = escalationCall.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.appointment.deleteMany({
      where: { clinic_id: testClinicId },
    });
    await prisma.call.deleteMany({
      where: { clinic_id: testClinicId },
    });
    await prisma.patient.delete({
      where: { id: testPatientId },
    });
    await prisma.clinic.delete({
      where: { id: testClinicId },
    });

    await app.close();
  });

  describe('/dashboard/stats (GET)', () => {
    it('should return overall statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('calls');
      expect(response.body.data).toHaveProperty('appointments');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data.calls).toHaveProperty('total');
      expect(response.body.data.calls).toHaveProperty('successRate');
      expect(response.body.data.revenue).toHaveProperty('estimated');
      expect(response.body.data.revenue).toHaveProperty('currency');
      expect(response.body.data.revenue.currency).toBe('USD');
    });

    it('should filter stats by clinic ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/stats?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.calls.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter stats by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/dashboard/stats?startDate=${today}&endDate=${tomorrow}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('calls');
    });
  });

  describe('/dashboard/calls (GET)', () => {
    it('should return paginated calls list', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/calls')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter calls by clinic ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/calls?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((call: any) => {
        expect(call.clinic_id).toBe(testClinicId);
      });
    });

    it('should filter calls by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/calls?status=completed')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((call: any) => {
        expect(call.status).toBe('completed');
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/calls?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should include clinic and patient details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/calls?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('clinic');
        expect(response.body.data[0]).toHaveProperty('patient');
        expect(response.body.data[0].clinic).toHaveProperty('name');
      }
    });
  });

  describe('/dashboard/calls/:id (GET)', () => {
    it('should return call details with full metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/calls/${testCallId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(testCallId);
      expect(response.body.data).toHaveProperty('clinic');
      expect(response.body.data).toHaveProperty('patient');
      expect(response.body.data).toHaveProperty('appointments');
      expect(response.body.data.appointments).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent call', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/calls/999999')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('/dashboard/appointments (GET)', () => {
    it('should return paginated appointments list', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/appointments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter appointments by clinic ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/appointments?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((appt: any) => {
        expect(appt.clinic_id).toBe(testClinicId);
      });
    });

    it('should filter appointments by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/appointments?status=confirmed')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((appt: any) => {
        expect(appt.status).toBe('confirmed');
      });
    });

    it('should include clinic and patient details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/appointments?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('clinic');
        expect(response.body.data[0]).toHaveProperty('patient');
        expect(response.body.data[0].clinic).toHaveProperty('name');
      }
    });
  });

  describe('/dashboard/escalations (GET)', () => {
    it('should return escalation queue', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/escalations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
    });

    it('should only return calls with escalation status', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/escalations')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((call: any) => {
        expect(['callback', 'escalated']).toContain(call.status);
      });
    });

    it('should filter escalations by clinic ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/escalations?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((call: any) => {
        expect(call.clinic_id).toBe(testClinicId);
      });
    });

    it('should filter escalations by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/escalations?type=escalated')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((call: any) => {
        expect(call.status).toBe('escalated');
      });
    });
  });

  describe('/dashboard/escalations/:id/resolve (PATCH)', () => {
    it('should mark escalation as resolved', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/dashboard/escalations/${escalationCallId}/resolve`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('resolved');
      expect(response.body.data.status).toBe('resolved');
    });

    it('should return 404 for non-existent escalation', async () => {
      const response = await request(app.getHttpServer())
        .patch('/dashboard/escalations/999999/resolve')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should fail to resolve non-escalation call', async () => {
      // Try to resolve a completed call
      const response = await request(app.getHttpServer())
        .patch(`/dashboard/escalations/${testCallId}/resolve`)
        .expect(500);

      // Should fail because it's not in escalation status
      expect(response.body.message).toBeDefined();
    });
  });

  describe('/dashboard/health (GET)', () => {
    it('should return system health metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data.metrics).toHaveProperty('totalCalls24h');
      expect(response.body.data.metrics).toHaveProperty('errorRate');
      expect(response.body.data.metrics).toHaveProperty('escalationRate');
      expect(response.body.data.metrics).toHaveProperty('avgCallDuration');
    });

    it('should include health status (healthy/degraded/critical)', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(['healthy', 'degraded', 'critical']).toContain(
        response.body.data.status,
      );
    });

    it('should filter health metrics by clinic ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/health?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toHaveProperty('totalCalls24h');
    });

    it('should include issues array when health is degraded', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data.issues).toBeInstanceOf(Array);
    });
  });

  describe('Revenue Calculation', () => {
    it('should calculate estimated revenue correctly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/stats?clinicId=${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.revenue.estimated).toBeGreaterThanOrEqual(0);
      // Should include at least the cleaning appointment ($150)
      expect(response.body.data.revenue.estimated).toBeGreaterThanOrEqual(150);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page beyond total pages', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/calls?page=9999&limit=20')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle limit of 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/calls?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by start date only', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/dashboard/stats?startDate=${yesterday}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('calls');
    });

    it('should filter by end date only', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/dashboard/stats?endDate=${tomorrow}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('calls');
    });
  });
});
