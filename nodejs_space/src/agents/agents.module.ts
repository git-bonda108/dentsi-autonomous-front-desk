import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceAgentService } from './voice-agent.service';
import { SchedulerAgentService } from './scheduler-agent.service';
import { PolicyAgentService } from './policy-agent.service';
import { OpsAgentService } from './ops-agent.service';
import { DentsiAgentService } from './dentsi-agent.service';
import { SentimentAgentService } from './sentiment-agent.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIServicesModule } from '../ai-services/ai-services.module';
import { ConversationModule } from '../conversation/conversation.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MLModule } from '../ml/ml.module';

/**
 * Agents Module - Dentsi Crew™
 * 
 * Contains all AI agents and tools:
 * 
 * MAIN AGENTS:
 * - DentsiAgentService: Main orchestrator with function calling
 * - SentimentAgentService: Sentiment analysis and tone adjustment
 * - AgentToolsService: Database operation tools
 * 
 * LEGACY AGENTS (still available for specific use cases):
 * - VoiceAgent: Conversation orchestration & intent detection
 * - SchedulerAgent: Appointment booking & availability management
 * - PolicyAgent: HIPAA compliance & data privacy
 * - OpsAgent: Operations & fallback management
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule, 
    AIServicesModule,
    ConversationModule,
    SchedulingModule,
    MLModule,
  ],
  providers: [
    // Main Dentsi Agent (OpenAI Agents SDK)
    DentsiAgentService,
    SentimentAgentService,
    AgentToolsService,
    // Legacy agents (still available)
    VoiceAgentService,
    SchedulerAgentService,
    PolicyAgentService,
    OpsAgentService,
  ],
  exports: [
    DentsiAgentService,
    SentimentAgentService,
    AgentToolsService,
    VoiceAgentService,
    SchedulerAgentService,
    PolicyAgentService,
    OpsAgentService,
  ],
})
export class AgentsModule {}