import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { AIServicesModule } from '../ai-services/ai-services.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AIServicesModule, AgentsModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
