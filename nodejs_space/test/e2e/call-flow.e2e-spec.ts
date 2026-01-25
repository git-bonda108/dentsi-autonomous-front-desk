/**
 * DENTSI MVP - End-to-End Test Suite
 * 
 * Tests the complete call flow from incoming call to appointment booking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('DENTSI Call Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testClinicId: string;
  let testPatientId: string;
  let testCallSid: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test data
    const clinic = await prisma.clinic.create({
      data: {
        name: 'Test Dental Clinic',
        phone: '+15551234567',
        address: '123 Test St',
        hours: JSON.stringify({ mon: '9:00-17:00', tue: '9:00-17:00' }),
        timezone: 'America/New_York',
      },
    });
    testClinicId = clinic.id;

    const patient = await prisma.patient.create({
      data: {
        clinic_id: testClinicId,
        name: 'Test Patient',
        phone: '+15559876543',
        email: 'test@example.com',
      },
    });
    testPatientId = patient.id;

    testCallSid = `CA${Date.now()}test`;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.patient.deleteMany({ where: { clinic_id: testClinicId } });
    await prisma.clinic.delete({ where: { id: testClinicId } });
    await app.close();
  });

  // ===========================================================================
  // TEST CASE 1: Health Check
  // ===========================================================================
  describe('TC-001: Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  // ===========================================================================
  // TEST CASE 2: Incoming Call - Known Patient
  // ===========================================================================
  describe('TC-002: Incoming Call Flow - Known Patient', () => {
    it('should handle incoming call from known patient', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhook/voice')
        .send({
          To: '+15551234567',
          From: '+15559876543',
          CallSid: testCallSid,
        })
        .expect(200);

      // Should return TwiML
      expect(response.text).toContain('<?xml');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Say');
      // Should greet by name
      expect(response.text).toContain('Test Patient');
    });
  });

  // ===========================================================================
  // TEST CASE 3: Speech Processing
  // ===========================================================================
  describe('TC-003: Speech Input Processing', () => {
    it('should process speech and respond appropriately', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhook/gather')
        .query({ callSid: testCallSid })
        .send({
          SpeechResult: 'I would like to schedule a cleaning appointment',
          CallSid: testCallSid,
        })
        .expect(200);

      expect(response.text).toContain('<?xml');
      expect(response.text).toContain('<Response>');
    });
  });

  // ===========================================================================
  // TEST CASE 4: Call End
  // ===========================================================================
  describe('TC-004: Call End Handling', () => {
    it('should properly end call session', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhook/end')
        .query({ callSid: testCallSid })
        .send({
          CallSid: testCallSid,
          CallDuration: '120',
          CallStatus: 'completed',
        })
        .expect(200);

      expect(response.text).toContain('<Hangup/>');
    });
  });

  // ===========================================================================
  // TEST CASE 5: Spam Detection
  // ===========================================================================
  describe('TC-005: Spam Detection', () => {
    it('should detect spam keywords', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/spam/check')
        .send({
          phoneNumber: '+19001234567',
          initialSpeech: 'This is about your extended warranty',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.isSpam).toBe(true);
      expect(response.body.result.confidence).toBeGreaterThan(0.5);
    });

    it('should not flag known patients as spam', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/spam/check')
        .send({
          phoneNumber: '+15559876543', // Test patient phone
        })
        .expect(200);

      expect(response.body.result.isSpam).toBe(false);
      expect(response.body.result.flags).toContain('known_patient');
    });
  });

  // ===========================================================================
  // TEST CASE 6: Analytics Dashboard
  // ===========================================================================
  describe('TC-006: Analytics Dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/dashboard/${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('keyMetrics');
      expect(response.body).toHaveProperty('calls');
      expect(response.body).toHaveProperty('appointments');
      expect(response.body).toHaveProperty('patients');
      expect(response.body).toHaveProperty('quality');
    });
  });

  // ===========================================================================
  // TEST CASE 7: ML Feedback
  // ===========================================================================
  describe('TC-007: ML Feedback System', () => {
    it('should accept quality rating', async () => {
      // First create a call to rate
      const call = await prisma.call.create({
        data: {
          clinic_id: testClinicId,
          call_sid: `CA${Date.now()}rating`,
          status: 'completed',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/ml/feedback/rating')
        .send({
          callId: call.id,
          rating: 5,
          submittedBy: 'test_staff',
          notes: 'Excellent call handling',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feedback).toHaveProperty('rating', 5);
    });
  });

  // ===========================================================================
  // TEST CASE 8: Outbound Call Scheduling
  // ===========================================================================
  describe('TC-008: Outbound Call System', () => {
    it('should get recall patients', async () => {
      const response = await request(app.getHttpServer())
        .get(`/outbound/recall-patients/${testClinicId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('patients');
      expect(response.body).toHaveProperty('count');
    });
  });
});
