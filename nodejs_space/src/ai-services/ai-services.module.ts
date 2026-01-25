import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { DeepgramService } from './deepgram.service';
import { ElevenLabsService } from './elevenlabs.service';

/**
 * AI Services Module
 * 
 * Provides AI-powered services:
 * - OpenAI: LLM for conversation and intent
 * - Deepgram: Enhanced speech-to-text
 * - ElevenLabs: Natural text-to-speech
 */
@Module({
  imports: [ConfigModule],
  providers: [OpenAIService, DeepgramService, ElevenLabsService],
  exports: [OpenAIService, DeepgramService, ElevenLabsService],
})
export class AIServicesModule {}
