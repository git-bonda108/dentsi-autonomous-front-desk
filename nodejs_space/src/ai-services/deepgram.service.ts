import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

@Injectable()
export class DeepgramService {
  private readonly logger = new Logger(DeepgramService.name);
  private deepgram: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPGRAM_API_KEY');
    this.deepgram = createClient(apiKey);
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
        },
      );

      if (error) {
        this.logger.error('Deepgram transcription error:', error);
        return '';
      }

      const transcript =
        result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      this.logger.log(`Transcribed: ${transcript}`);
      return transcript;
    } catch (error) {
      this.logger.error('Error transcribing audio:', error);
      return '';
    }
  }

  createLiveTranscription(onTranscript: (text: string) => void) {
    const connection = this.deepgram.listen.live({
      model: 'nova-2',
      punctuate: true,
      smart_format: true,
      interim_results: true,
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript && data.is_final) {
        this.logger.log(`Live transcript: ${transcript}`);
        onTranscript(transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      this.logger.error('Live transcription error:', error);
    });

    return connection;
  }
}
