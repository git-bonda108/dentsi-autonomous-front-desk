import { Module } from '@nestjs/common';
import { AgentToolsService } from './agent-tools.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationModule } from '../../conversation/conversation.module';
import { SchedulingModule } from '../../scheduling/scheduling.module';
import { TriageModule } from '../../triage/triage.module';

/**
 * AgentToolsModule - Function tools for AI agents
 * 
 * Provides tool services that can be called by the AI agent
 * to perform database operations and business logic.
 * 
 * Features:
 * - Patient lookup and management
 * - Smart appointment scheduling with doctor preferences
 * - Conflict detection and resolution
 * - Service catalog access
 * - Patient triaging and urgency classification
 * - Medical alert handling
 */
@Module({
  imports: [
    PrismaModule, 
    ConversationModule,
    SchedulingModule,
    TriageModule,
  ],
  providers: [AgentToolsService],
  exports: [AgentToolsService],
})
export class AgentToolsModule {}
