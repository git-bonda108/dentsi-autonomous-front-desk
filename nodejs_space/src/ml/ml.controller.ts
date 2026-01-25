import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { ConversationLoggerService } from './conversation-logger.service';
import { FeedbackService, FeedbackType } from './feedback.service';
import { TrainingExportService } from './training-export.service';
import type { ExportOptions } from './training-export.service';

/**
 * MLController - API endpoints for ML training infrastructure
 * 
 * Endpoints:
 * - POST /ml/feedback/rating - Submit call rating
 * - POST /ml/feedback/correction - Submit response correction
 * - POST /ml/feedback/survey - Submit patient survey
 * - GET /ml/feedback/:callId - Get feedback for a call
 * - GET /ml/stats/:clinicId - Get call statistics
 * - POST /ml/export - Export training data
 * - GET /ml/export/history - Get export history
 * - GET /ml/suggestions/:clinicId - Get improvement suggestions
 */
@Controller('ml')
export class MLController {
  private readonly logger = new Logger(MLController.name);

  constructor(
    private readonly conversationLogger: ConversationLoggerService,
    private readonly feedbackService: FeedbackService,
    private readonly trainingExport: TrainingExportService,
  ) {}

  // ==========================================================================
  // FEEDBACK ENDPOINTS
  // ==========================================================================

  /**
   * Submit call quality rating
   */
  @Post('feedback/rating')
  async submitRating(
    @Body() body: {
      callId: string;
      rating: number;
      submittedBy: string;
      notes?: string;
      tags?: string[];
    },
  ) {
    this.logger.log(`Submitting rating for call: ${body.callId}`);
    
    const result = await this.feedbackService.submitCallRating(
      body.callId,
      body.rating,
      body.submittedBy,
      body.notes,
      body.tags,
    );

    return {
      success: true,
      feedback: result,
    };
  }

  /**
   * Submit response correction
   */
  @Post('feedback/correction')
  async submitCorrection(
    @Body() body: {
      callId: string;
      turnNumber: number;
      originalResponse: string;
      correctedResponse: string;
      submittedBy: string;
      notes?: string;
      tags?: string[];
    },
  ) {
    this.logger.log(`Submitting correction for call: ${body.callId}, turn: ${body.turnNumber}`);
    
    const result = await this.feedbackService.submitCorrection(
      body.callId,
      body.turnNumber,
      body.originalResponse,
      body.correctedResponse,
      body.submittedBy,
      body.notes,
      body.tags,
    );

    return {
      success: true,
      feedback: result,
    };
  }

  /**
   * Submit patient survey
   */
  @Post('feedback/survey')
  async submitSurvey(
    @Body() body: {
      callId: string;
      ratings: {
        overall: number;
        helpfulness?: number;
        clarity?: number;
        resolution?: number;
      };
      freeformFeedback?: string;
    },
  ) {
    this.logger.log(`Submitting patient survey for call: ${body.callId}`);
    
    const result = await this.feedbackService.submitPatientSurvey(
      body.callId,
      body.ratings,
      body.freeformFeedback,
    );

    return {
      success: true,
      feedback: result,
    };
  }

  /**
   * Get feedback for a specific call
   */
  @Get('feedback/:callId')
  async getCallFeedback(@Param('callId') callId: string) {
    const feedback = await this.feedbackService.getCallFeedback(callId);
    
    return {
      success: true,
      feedback,
    };
  }

  /**
   * Flag a call for review
   */
  @Post('feedback/flag')
  async flagForReview(
    @Body() body: {
      callId: string;
      reason: string;
      flaggedBy: string;
      priority?: 'low' | 'medium' | 'high';
    },
  ) {
    await this.feedbackService.flagForReview(
      body.callId,
      body.reason,
      body.flaggedBy,
      body.priority,
    );

    return {
      success: true,
      message: 'Call flagged for review',
    };
  }

  /**
   * Get flagged calls
   */
  @Get('feedback/flagged/:clinicId')
  async getFlaggedCalls(
    @Param('clinicId') clinicId: string,
    @Query('limit') limit?: string,
  ) {
    const flagged = await this.feedbackService.getFlaggedCalls(
      clinicId,
      limit ? parseInt(limit) : 50,
    );

    return {
      success: true,
      flagged,
    };
  }

  // ==========================================================================
  // STATISTICS ENDPOINTS
  // ==========================================================================

  /**
   * Get call statistics for a clinic
   */
  @Get('stats/:clinicId')
  async getCallStats(
    @Param('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.conversationLogger.getCallStats(clinicId, start, end);

    return {
      success: true,
      stats,
      period: { startDate: start, endDate: end },
    };
  }

  /**
   * Get feedback summary for a clinic
   */
  @Get('feedback/summary/:clinicId')
  async getFeedbackSummary(
    @Param('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const summary = await this.feedbackService.getClinicFeedbackSummary(clinicId, start, end);

    return {
      success: true,
      summary,
      period: { startDate: start, endDate: end },
    };
  }

  // ==========================================================================
  // TRAINING EXPORT ENDPOINTS
  // ==========================================================================

  /**
   * Export training data
   */
  @Post('export')
  async exportTrainingData(@Body() options: ExportOptions) {
    this.logger.log('Starting training data export...');
    
    const result = await this.trainingExport.exportForFineTuning(options);

    return {
      success: true,
      export: result,
    };
  }

  /**
   * Export high-quality examples only
   */
  @Post('export/high-quality')
  async exportHighQuality(@Body() body: { clinicId?: string }) {
    const result = await this.trainingExport.exportHighQualityExamples(body.clinicId);

    return {
      success: true,
      export: result,
    };
  }

  /**
   * Export booking conversations
   */
  @Post('export/bookings')
  async exportBookings(@Body() body: { clinicId?: string }) {
    const result = await this.trainingExport.exportBookingExamples(body.clinicId);

    return {
      success: true,
      export: result,
    };
  }

  /**
   * Create training/validation split
   */
  @Post('export/split')
  async createValidationSet(
    @Body() body: { clinicId: string; testPercentage?: number },
  ) {
    const result = await this.trainingExport.createValidationSet(
      body.clinicId,
      body.testPercentage,
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get export history
   */
  @Get('export/history')
  async getExportHistory() {
    const history = await this.trainingExport.getExportHistory();

    return {
      success: true,
      exports: history,
    };
  }

  /**
   * Estimate fine-tuning cost
   */
  @Get('export/cost-estimate')
  async estimateCost(@Query('tokens') tokens: string) {
    const tokenCount = parseInt(tokens) || 100000;
    const estimate = this.trainingExport.estimateFineTuningCost(tokenCount);

    return {
      success: true,
      tokenCount,
      ...estimate,
    };
  }

  /**
   * Clean up old exports
   */
  @Post('export/cleanup')
  async cleanupExports(@Body() body: { keepCount?: number }) {
    const deleted = await this.trainingExport.cleanupOldExports(body.keepCount);

    return {
      success: true,
      deletedCount: deleted,
    };
  }

  // ==========================================================================
  // IMPROVEMENT SUGGESTIONS
  // ==========================================================================

  /**
   * Get improvement suggestions based on feedback
   */
  @Get('suggestions/:clinicId')
  async getImprovementSuggestions(
    @Param('clinicId') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const suggestions = await this.feedbackService.generateImprovementSuggestions(
      clinicId,
      start,
      end,
    );

    return {
      success: true,
      suggestions,
      period: { startDate: start, endDate: end },
    };
  }

  /**
   * Get corrections for training review
   */
  @Get('corrections/:clinicId')
  async getCorrections(
    @Param('clinicId') clinicId: string,
    @Query('limit') limit?: string,
  ) {
    const corrections = await this.feedbackService.getCorrections(
      clinicId,
      limit ? parseInt(limit) : 100,
    );

    return {
      success: true,
      corrections,
      count: corrections.length,
    };
  }
}
