import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { SpamDetectionService } from './spam-detection.service';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsPeriod } from './analytics.service';

/**
 * AnalyticsController - API endpoints for analytics and spam detection
 * 
 * Endpoints:
 * - GET /analytics/calls/:clinicId - Call analytics
 * - GET /analytics/appointments/:clinicId - Appointment analytics
 * - GET /analytics/patients/:clinicId - Patient analytics
 * - GET /analytics/quality/:clinicId - Aggregate quality score
 * - GET /analytics/quality/call/:callId - Individual call quality
 * - POST /analytics/spam/check - Check if number is spam
 * - POST /analytics/spam/report - Report spam
 * - POST /analytics/spam/block - Add to blocklist
 * - GET /analytics/spam/blocklist - Get blocklist
 */
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly spamDetectionService: SpamDetectionService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ==========================================================================
  // CALL ANALYTICS
  // ==========================================================================

  /**
   * Get call analytics for a clinic
   */
  @Get('calls/:clinicId')
  async getCallAnalytics(
    @Param('clinicId') clinicId: string,
    @Query('period') period?: AnalyticsPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const analytics = await this.analyticsService.getCallAnalytics(
      clinicId,
      period || 'month',
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      analytics,
    };
  }

  // ==========================================================================
  // APPOINTMENT ANALYTICS
  // ==========================================================================

  /**
   * Get appointment analytics for a clinic
   */
  @Get('appointments/:clinicId')
  async getAppointmentAnalytics(
    @Param('clinicId') clinicId: string,
    @Query('period') period?: AnalyticsPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const analytics = await this.analyticsService.getAppointmentAnalytics(
      clinicId,
      period || 'month',
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      analytics,
    };
  }

  // ==========================================================================
  // PATIENT ANALYTICS
  // ==========================================================================

  /**
   * Get patient analytics for a clinic
   */
  @Get('patients/:clinicId')
  async getPatientAnalytics(
    @Param('clinicId') clinicId: string,
    @Query('period') period?: AnalyticsPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const analytics = await this.analyticsService.getPatientAnalytics(
      clinicId,
      period || 'month',
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      analytics,
    };
  }

  // ==========================================================================
  // QUALITY SCORING
  // ==========================================================================

  /**
   * Get aggregate quality score for a clinic
   */
  @Get('quality/:clinicId')
  async getAggregateQuality(
    @Param('clinicId') clinicId: string,
    @Query('period') period?: AnalyticsPeriod,
  ) {
    const quality = await this.analyticsService.getAggregateQualityScore(
      clinicId,
      period || 'month',
    );

    return {
      success: true,
      quality,
    };
  }

  /**
   * Get quality score for a specific call
   */
  @Get('quality/call/:callId')
  async getCallQuality(@Param('callId') callId: string) {
    const quality = await this.analyticsService.calculateQualityScore(callId);

    return {
      success: true,
      quality,
    };
  }

  // ==========================================================================
  // COMPREHENSIVE DASHBOARD
  // ==========================================================================

  /**
   * Get all analytics for dashboard
   */
  @Get('dashboard/:clinicId')
  async getDashboard(
    @Param('clinicId') clinicId: string,
    @Query('period') period?: AnalyticsPeriod,
  ) {
    const p = period || 'month';

    const [calls, appointments, patients, quality] = await Promise.all([
      this.analyticsService.getCallAnalytics(clinicId, p),
      this.analyticsService.getAppointmentAnalytics(clinicId, p),
      this.analyticsService.getPatientAnalytics(clinicId, p),
      this.analyticsService.getAggregateQualityScore(clinicId, p),
    ]);

    // Calculate key metrics
    const keyMetrics = {
      totalCalls: calls.totalCalls,
      bookingRate: Math.round(calls.bookingRate * 100),
      avgQuality: Math.round(quality.overall),
      noShowRate: Math.round(appointments.noShowRate * 100),
      newPatients: patients.newPatients,
      estimatedRevenue: appointments.estimatedRevenue,
    };

    // Alerts
    const alerts: { type: 'warning' | 'error' | 'info'; message: string }[] = [];
    
    if (appointments.noShowRate > 0.1) {
      alerts.push({ type: 'warning', message: `No-show rate is ${Math.round(appointments.noShowRate * 100)}% - consider sending reminders` });
    }
    if (calls.spamRate > 0.05) {
      alerts.push({ type: 'warning', message: `Spam rate is ${Math.round(calls.spamRate * 100)}% - review blocklist` });
    }
    if (patients.overdueForCleaning > 50) {
      alerts.push({ type: 'info', message: `${patients.overdueForCleaning} patients overdue for cleaning - run recall campaign` });
    }
    if (quality.overall < 70) {
      alerts.push({ type: 'error', message: 'Quality score below 70 - review recommendations' });
    }

    return {
      success: true,
      period: p,
      keyMetrics,
      alerts,
      calls,
      appointments,
      patients,
      quality,
    };
  }

  // ==========================================================================
  // SPAM DETECTION
  // ==========================================================================

  /**
   * Check if a phone number is spam
   */
  @Post('spam/check')
  async checkSpam(
    @Body() body: {
      phoneNumber: string;
      initialSpeech?: string;
      callDuration?: number;
    },
  ) {
    const callHistory = await this.spamDetectionService.getCallHistory(body.phoneNumber);
    
    const result = await this.spamDetectionService.checkSpam(
      body.phoneNumber,
      body.initialSpeech,
      body.callDuration,
      callHistory,
    );

    return {
      success: true,
      result,
    };
  }

  /**
   * Report a call as spam
   */
  @Post('spam/report')
  async reportSpam(
    @Body() body: {
      callId: string;
      reportedBy: string;
      reason?: string;
    },
  ) {
    await this.spamDetectionService.reportSpam(
      body.callId,
      body.reportedBy,
      body.reason,
    );

    return {
      success: true,
      message: 'Call reported as spam',
    };
  }

  /**
   * Add number to blocklist
   */
  @Post('spam/block')
  async addToBlocklist(
    @Body() body: {
      phoneNumber: string;
      reason?: string;
    },
  ) {
    this.spamDetectionService.addToBlocklist(body.phoneNumber, body.reason);

    return {
      success: true,
      message: `${body.phoneNumber} added to blocklist`,
    };
  }

  /**
   * Remove number from blocklist
   */
  @Post('spam/unblock')
  async removeFromBlocklist(@Body() body: { phoneNumber: string }) {
    this.spamDetectionService.removeFromBlocklist(body.phoneNumber);

    return {
      success: true,
      message: `${body.phoneNumber} removed from blocklist`,
    };
  }

  /**
   * Add number to whitelist
   */
  @Post('spam/whitelist')
  async addToWhitelist(@Body() body: { phoneNumber: string }) {
    this.spamDetectionService.addToWhitelist(body.phoneNumber);

    return {
      success: true,
      message: `${body.phoneNumber} added to whitelist`,
    };
  }

  /**
   * Get blocklist
   */
  @Get('spam/blocklist')
  async getBlocklist() {
    const blocklist = this.spamDetectionService.getBlocklist();

    return {
      success: true,
      blocklist,
      count: blocklist.length,
    };
  }

  /**
   * Get whitelist
   */
  @Get('spam/whitelist')
  async getWhitelist() {
    const whitelist = this.spamDetectionService.getWhitelist();

    return {
      success: true,
      whitelist,
      count: whitelist.length,
    };
  }

  /**
   * Get call history for a phone number
   */
  @Get('spam/history/:phoneNumber')
  async getCallHistory(
    @Param('phoneNumber') phoneNumber: string,
    @Query('clinicId') clinicId?: string,
  ) {
    const history = await this.spamDetectionService.getCallHistory(
      phoneNumber,
      clinicId,
    );

    return {
      success: true,
      phoneNumber,
      history,
    };
  }
}
