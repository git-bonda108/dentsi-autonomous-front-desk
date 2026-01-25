import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboundCallService } from './outbound-call.service';
import { ReminderService } from './reminder.service';
import { OutboundController } from './outbound.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * OutboundModule - Outbound calling infrastructure
 * 
 * Features:
 * - Automated appointment reminders (24h before)
 * - Confirmation calls (48h before)
 * - Post-visit follow-ups
 * - Recall campaigns for overdue patients
 * - No-show rescheduling
 * 
 * Cron jobs:
 * - Every 5 minutes: Process scheduled calls
 * - Daily at 9am: Run recall check
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [OutboundController],
  providers: [
    OutboundCallService,
    ReminderService,
  ],
  exports: [
    OutboundCallService,
    ReminderService,
  ],
})
export class OutboundModule {}
