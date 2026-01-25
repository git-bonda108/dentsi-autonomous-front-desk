import { Module } from '@nestjs/common';
import { SpamDetectionService } from './spam-detection.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AnalyticsModule - Comprehensive analytics and spam detection
 * 
 * Features:
 * - Spam call detection and filtering
 * - Call analytics (volume, duration, outcomes)
 * - Appointment analytics (bookings, cancellations, no-shows)
 * - Patient analytics (new, returning, engagement)
 * - Quality scoring (responsiveness, accuracy, empathy)
 * - Dashboard aggregation
 * 
 * API Endpoints:
 * - GET /analytics/calls/:clinicId - Call analytics
 * - GET /analytics/appointments/:clinicId - Appointment analytics
 * - GET /analytics/patients/:clinicId - Patient analytics
 * - GET /analytics/quality/:clinicId - Aggregate quality score
 * - GET /analytics/dashboard/:clinicId - Full dashboard
 * - POST /analytics/spam/check - Check spam
 * - POST /analytics/spam/report - Report spam
 */
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [
    SpamDetectionService,
    AnalyticsService,
  ],
  exports: [
    SpamDetectionService,
    AnalyticsService,
  ],
})
export class AnalyticsModule {}
