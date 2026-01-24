import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AIServicesModule } from './ai-services/ai-services.module';
import { AgentsModule } from './agents/agents.module';
import { WebhookModule } from './webhook/webhook.module';
import { CallsModule } from './calls/calls.module';
import { ClinicsModule } from './clinics/clinics.module';
import { PatientsModule } from './patients/patients.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AIServicesModule,
    AgentsModule,
    WebhookModule,
    CallsModule,
    ClinicsModule,
    PatientsModule,
    HealthModule,
    DashboardModule,
  ],
})
export class AppModule {}
