import { Module } from '@nestjs/common';
import { ConversationLoggerService } from './conversation-logger.service';
import { FeedbackService } from './feedback.service';
import { TrainingExportService } from './training-export.service';
import { MLController } from './ml.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * MLModule - Machine Learning infrastructure for continuous improvement
 * 
 * Features:
 * - Conversation logging for training data
 * - Feedback collection and analysis
 * - Training data export for fine-tuning
 * - Quality metrics and improvement suggestions
 * 
 * API Endpoints:
 * - POST /ml/feedback/rating - Submit call rating
 * - POST /ml/feedback/correction - Submit correction
 * - POST /ml/export - Export training data
 * - GET /ml/stats/:clinicId - Get call statistics
 * - GET /ml/suggestions/:clinicId - Get improvement suggestions
 */
@Module({
  imports: [PrismaModule],
  controllers: [MLController],
  providers: [
    ConversationLoggerService,
    FeedbackService,
    TrainingExportService,
  ],
  exports: [
    ConversationLoggerService,
    FeedbackService,
    TrainingExportService,
  ],
})
export class MLModule {}
