import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly apiKey: string;
  private readonly voiceId: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ELEVENLABS_API_KEY') || '';
    // Use configured voice or default to Rachel (professional, friendly female)
    this.voiceId = this.configService.get<string>('ELEVENLABS_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM';
    this.logger.log(`ElevenLabs initialized with voice: ${this.voiceId}`);
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          text,
          // eleven_turbo_v2_5 is optimized for low latency (phone calls)
          // eleven_multilingual_v2 is highest quality
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.6,        // Higher = more consistent, lower = more expressive
            similarity_boost: 0.8, // Higher = closer to original voice
            style: 0.3,            // Natural conversational style
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        },
      );

      this.logger.log(`🎙️ ElevenLabs generated audio for: "${text.substring(0, 50)}..."`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('❌ ElevenLabs error:', error.response?.data || error.message);
      throw error;
    }
  }

  async streamTextToSpeech(text: string): Promise<ReadableStream> {
    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error streaming speech:', error);
      throw error;
    }
  }
}
