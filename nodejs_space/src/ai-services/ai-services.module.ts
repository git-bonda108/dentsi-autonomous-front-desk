import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { DeepgramService } from './deepgram.service';
import { ElevenLabsService } from './elevenlabs.service';

@Module({
  providers: [OpenAIService, DeepgramService, ElevenLabsService],
  exports: [OpenAIService, DeepgramService, ElevenLabsService],
})
export class AIServicesModule {}
