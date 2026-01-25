import { Module } from '@nestjs/common';
import { TriageService } from './triage.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * TriageModule - Patient urgency classification and medical alerts
 * 
 * Features:
 * - Symptom-based urgency classification
 * - Emergency detection
 * - Medical alert generation (allergies, medications, conditions)
 * - Escalation trigger detection
 */
@Module({
  imports: [PrismaModule],
  providers: [TriageService],
  exports: [TriageService],
})
export class TriageModule {}
