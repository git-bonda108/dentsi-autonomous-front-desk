import { Module } from '@nestjs/common';
import { TranscriptController } from './transcript.controller';

@Module({
  controllers: [TranscriptController],
})
export class TranscriptModule {}
