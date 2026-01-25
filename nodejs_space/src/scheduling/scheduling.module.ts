import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * SchedulingModule - Smart appointment scheduling
 * 
 * Features:
 * - Doctor availability parsing
 * - Preference-aware slot finding
 * - Conflict detection and resolution
 * - Service duration matching
 */
@Module({
  imports: [PrismaModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
