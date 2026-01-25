import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { AIServicesModule } from '../ai-services/ai-services.module';
import { AgentsModule } from '../agents/agents.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OutboundModule } from '../outbound/outbound.module';
import { AnalyticsModule } from '../analytics/analytics.module';

/**
 * WebhookModule - Handles Twilio voice webhooks
 * 
 * Endpoints:
 * - POST /webhook/voice - Incoming call handler
 * - POST /webhook/gather - Speech/DTMF input handler
 * - POST /webhook/end - Call end handler
 * - POST /webhook/status - Call status callback
 * - POST /webhook/outbound - Outbound call TwiML
 * - POST /webhook/outbound/gather - Outbound DTMF handler
 * - POST /webhook/outbound/status - Outbound status callback
 * 
 * Voice Integration:
 * - Deepgram: Enhanced speech-to-text (if configured)
 * - ElevenLabs: Natural text-to-speech (if configured)
 * - Polly.Joanna-Generative: Fallback TTS via Twilio
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AIServicesModule, 
    AgentsModule,
    forwardRef(() => OutboundModule),
    AnalyticsModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
