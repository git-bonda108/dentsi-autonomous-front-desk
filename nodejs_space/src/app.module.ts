import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AIServicesModule } from './ai-services/ai-services.module';
import { AgentsModule } from './agents/agents.module';
import { ConversationModule } from './conversation/conversation.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { TriageModule } from './triage/triage.module';
import { MLModule } from './ml/ml.module';
import { OutboundModule } from './outbound/outbound.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhookModule } from './webhook/webhook.module';
import { CallsModule } from './calls/calls.module';
import { ClinicsModule } from './clinics/clinics.module';
import { PatientsModule } from './patients/patients.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ElevenLabsToolsModule } from './elevenlabs/elevenlabs-tools.module';

/**
 * DENTSI - AI Voice Agent for Dental Appointment Automation
 * 
 * Main Application Module
 * 
 * Architecture:
 * - PrismaModule: Database access
 * - AIServicesModule: OpenAI, Deepgram, ElevenLabs integrations
 * - ConversationModule: Patient context and script management
 * - AgentsModule: Dentsi AI agent with OpenAI Agents SDK
 * - WebhookModule: Twilio voice webhook handlers
 * - ElevenLabsToolsModule: API endpoints for ElevenLabs agent tools
 * - DashboardModule: Dashboard API endpoints
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Core modules
    PrismaModule,
    AIServicesModule,
    ConversationModule,
    SchedulingModule,
    TriageModule,
    MLModule,
    OutboundModule,
    AnalyticsModule,
    AgentsModule,
    
    // Feature modules
    WebhookModule,
    CallsModule,
    ClinicsModule,
    PatientsModule,
    HealthModule,
    DashboardModule,
    
    // ElevenLabs Integration
    ElevenLabsToolsModule,
  ],
})
export class AppModule {}
