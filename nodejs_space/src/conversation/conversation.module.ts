import { Module } from '@nestjs/common';
import { PatientContextService } from './patient-context.service';
import { ConversationScriptService } from './conversation-script.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * ConversationModule - Manages conversation context and scripts
 * 
 * This module provides:
 * - PatientContextService: Builds rich context from patient history
 * - ConversationScriptService: Loads and renders conversation templates
 */
@Module({
  imports: [PrismaModule],
  providers: [
    PatientContextService,
    ConversationScriptService,
  ],
  exports: [
    PatientContextService,
    ConversationScriptService,
  ],
})
export class ConversationModule {}
