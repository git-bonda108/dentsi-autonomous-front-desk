import { Module } from '@nestjs/common';
import { VoiceAgentService } from './voice-agent.service';
import { SchedulerAgentService } from './scheduler-agent.service';
import { PolicyAgentService } from './policy-agent.service';
import { OpsAgentService } from './ops-agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIServicesModule } from '../ai-services/ai-services.module';

/**
 * Agents Module - Dentra Crew™
 * 
 * Contains all 4 specialized AI agents:
 * - VoiceAgent: Conversation orchestration & intent detection
 * - SchedulerAgent: Appointment booking & availability management
 * - PolicyAgent: HIPAA compliance & data privacy
 * - OpsAgent: Operations & fallback management
 */
@Module({
  imports: [PrismaModule, AIServicesModule],
  providers: [
    VoiceAgentService,
    SchedulerAgentService,
    PolicyAgentService,
    OpsAgentService,
  ],
  exports: [
    VoiceAgentService,
    SchedulerAgentService,
    PolicyAgentService,
    OpsAgentService,
  ],
})
export class AgentsModule {}