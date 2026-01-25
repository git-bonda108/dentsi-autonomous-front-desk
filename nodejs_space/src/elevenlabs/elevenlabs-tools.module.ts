import { Module } from '@nestjs/common';
import { ElevenLabsToolsController } from './elevenlabs-tools.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * ElevenLabs Tools Module
 * 
 * Provides API endpoints that ElevenLabs Conversational AI agent
 * can call as "Tools" during phone conversations.
 * 
 * Endpoints:
 * - POST /elevenlabs/tools/lookup-patient
 * - POST /elevenlabs/tools/check-availability
 * - POST /elevenlabs/tools/book-appointment
 * - POST /elevenlabs/tools/get-services
 * - POST /elevenlabs/tools/log-conversation
 */
@Module({
  imports: [PrismaModule],
  controllers: [ElevenLabsToolsController],
})
export class ElevenLabsToolsModule {}
