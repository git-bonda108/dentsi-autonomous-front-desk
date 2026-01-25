import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DentsiAgentService } from '../agents/dentsi-agent.service';
import { SentimentAgentService } from '../agents/sentiment-agent.service';
import { ElevenLabsService } from '../ai-services/elevenlabs.service';
import { DeepgramService } from '../ai-services/deepgram.service';
import { SpamDetectionService } from '../analytics/spam-detection.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WebhookService - Handles Twilio voice webhooks
 * 
 * This service:
 * - Receives incoming calls from Twilio
 * - Initializes Dentsi agent sessions
 * - Processes speech input through the AI
 * - Uses Deepgram for enhanced transcription
 * - Uses ElevenLabs for natural voice synthesis
 * - Applies sentiment analysis for tone adjustment
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly useElevenLabs: boolean;
  private readonly useDeepgram: boolean;
  private readonly audioDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly dentsiAgent: DentsiAgentService,
    private readonly sentimentAgent: SentimentAgentService,
    private readonly elevenlabs: ElevenLabsService,
    private readonly deepgram: DeepgramService,
    private readonly spamDetection: SpamDetectionService,
  ) {
    // Check if enhanced voice services are enabled
    this.useElevenLabs = !!this.configService.get<string>('ELEVENLABS_API_KEY');
    this.useDeepgram = !!this.configService.get<string>('DEEPGRAM_API_KEY');
    this.audioDir = path.join(process.cwd(), 'public', 'audio');
    
    // Create audio directory if it doesn't exist
    if (this.useElevenLabs && !fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
    
    this.logger.log(`Voice services: ElevenLabs=${this.useElevenLabs}, Deepgram=${this.useDeepgram}`);
  }

  /**
   * Handle incoming call from Twilio
   */
  async handleIncomingCall(
    to: string,
    from: string,
    callSid: string,
  ): Promise<string> {
    try {
      this.logger.log(`📞 Incoming call: ${callSid} from ${from} to ${to}`);

      // Check for spam
      const callHistory = await this.spamDetection.getCallHistory(from);
      const spamCheck = await this.spamDetection.checkSpam(from, undefined, undefined, callHistory);
      
      if (spamCheck.blockRecommended) {
        this.logger.warn(`🚫 Spam call blocked from ${from}: ${spamCheck.reason}`);
        
        // Log as spam
        await this.prisma.call.create({
          data: {
            call_sid: callSid,
            clinic_id: 'system',
            caller_phone: from,
            status: 'completed',
            outcome: 'spam',
            duration: 0,
          },
        }).catch(() => {}); // Ignore if clinic_id invalid
        
        return this.spamDetection.generateSpamResponse();
      }

      if (spamCheck.isSpam && !spamCheck.blockRecommended) {
        this.logger.warn(`⚠️ Potential spam from ${from}, proceeding with caution`);
      }

      // Find the clinic by phone number
      const clinic = await this.prisma.clinic.findFirst({
        where: { phone: to },
      });

      if (!clinic) {
        this.logger.error(`No clinic found for phone: ${to}`);
        return this.generateErrorTwiML('clinic_not_found');
      }

      // Initialize Dentsi agent session with patient context
      const { greeting } = await this.dentsiAgent.initializeSession(
        callSid,
        clinic.id,
        from, // Caller's phone for patient lookup
      );

      this.logger.log(`✅ Session initialized. Greeting: "${greeting.substring(0, 50)}..."`);

      // Generate TwiML response
      return this.generateTwiMLResponse(greeting, callSid);
    } catch (error) {
      this.logger.error(`❌ Error handling incoming call: ${error.message}`);
      return this.generateErrorTwiML('system_error');
    }
  }

  /**
   * Handle user speech input (Twilio Gather callback)
   */
  async handleUserSpeech(
    callSid: string,
    speechResult: string,
  ): Promise<string> {
    try {
      this.logger.log(`🎤 Speech received for ${callSid}: "${speechResult}"`);

      // Analyze sentiment first
      const sentiment = await this.sentimentAgent.analyzeSentiment(callSid, speechResult);
      this.logger.log(`😊 Sentiment: ${sentiment.sentiment} (${sentiment.confidence}) - ${sentiment.recommendation}`);

      // Process through Dentsi agent
      const response = await this.dentsiAgent.processUserInput(callSid, speechResult);

      this.logger.log(`🤖 Agent response: "${response.message.substring(0, 50)}..."`);

      // Check if we should continue or end
      if (!response.shouldContinue) {
        return this.generateTwiMLResponse(response.message, callSid, true);
      }

      // Check for booking confirmation
      if (response.bookingConfirmation) {
        this.logger.log(`✅ Booking confirmed: ${response.bookingConfirmation.appointmentId}`);
      }

      // Generate TwiML with optional ElevenLabs voice
      return this.generateTwiMLResponse(response.message, callSid);
    } catch (error) {
      this.logger.error(`❌ Error handling speech: ${error.message}`);
      
      // Try to recover gracefully
      const recoveryMessage = "I apologize, I'm having some trouble. Let me try again. What can I help you with?";
      return this.generateTwiMLResponse(recoveryMessage, callSid);
    }
  }

  /**
   * Enhanced transcription using Deepgram (for audio buffer input)
   */
  async transcribeWithDeepgram(audioBuffer: Buffer): Promise<string> {
    if (!this.useDeepgram) {
      this.logger.warn('Deepgram not configured, falling back to Twilio transcription');
      return '';
    }

    try {
      const transcript = await this.deepgram.transcribeAudio(audioBuffer);
      this.logger.log(`🎯 Deepgram transcription: "${transcript}"`);
      return transcript;
    } catch (error) {
      this.logger.error(`Deepgram transcription failed: ${error.message}`);
      return '';
    }
  }

  /**
   * Generate audio using ElevenLabs and return URL
   */
  async generateElevenLabsAudio(text: string, callSid: string): Promise<string | null> {
    if (!this.useElevenLabs) {
      return null;
    }

    try {
      const audioBuffer = await this.elevenlabs.textToSpeech(text);
      const filename = `${callSid}-${Date.now()}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      
      fs.writeFileSync(filepath, audioBuffer);
      
      // Return public URL (assuming backend serves /public/audio)
      const baseUrl = this.configService.get<string>('BACKEND_URL') || 'https://dentsi.abacusai.app';
      return `${baseUrl}/audio/${filename}`;
    } catch (error) {
      this.logger.error(`ElevenLabs audio generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Handle call end (status callback)
   */
  async handleCallEnd(
    callSid: string,
    callDuration: number,
    callStatus: string,
  ): Promise<void> {
    try {
      this.logger.log(`📴 Call ended: ${callSid}, Duration: ${callDuration}s, Status: ${callStatus}`);

      // End the Dentsi agent session
      await this.dentsiAgent.endSession(callSid, callDuration);

      this.logger.log(`✅ Session cleaned up for ${callSid}`);
    } catch (error) {
      this.logger.error(`❌ Error handling call end: ${error.message}`);
    }
  }

  /**
   * Handle DTMF input (keypad presses)
   */
  async handleDTMF(callSid: string, digits: string): Promise<string> {
    this.logger.log(`🔢 DTMF received for ${callSid}: ${digits}`);

    // Map common DTMF inputs to speech equivalents
    const dtmfMap: Record<string, string> = {
      '1': 'Yes, confirm',
      '2': 'No, reschedule',
      '3': 'Cancel',
      '0': 'Connect me to a staff member',
      '*': 'Go back',
      '#': 'Repeat that please',
    };

    const speechEquivalent = dtmfMap[digits] || `I pressed ${digits}`;
    
    // Process as speech input
    return this.handleUserSpeech(callSid, speechEquivalent);
  }

  /**
   * Generate TwiML response with optional ElevenLabs voice
   * 
   * Voice options:
   * 1. ElevenLabs (if configured) - Most natural voice
   * 2. Polly.Joanna-Generative - High quality Twilio voice
   * 3. Polly.Joanna - Standard Twilio voice (fallback)
   */
  private generateTwiMLResponse(message: string, callSid: string, isTransfer: boolean = false): string {
    const escapedMessage = this.escapeXml(message);
    
    // Use Polly.Joanna-Generative for better quality when available
    const voice = 'Polly.Joanna-Generative';
    
    if (isTransfer) {
      // End call with message
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="en-US">${escapedMessage}</Say>
  <Say voice="${voice}">Please hold while I connect you with one of our amazing team members.</Say>
  <Hangup/>
</Response>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="en-US">${escapedMessage}</Say>
  <Gather 
    input="speech dtmf" 
    timeout="5" 
    speechTimeout="auto" 
    action="/webhook/gather?callSid=${callSid}" 
    method="POST"
    language="en-US"
    speechModel="phone_call"
    enhanced="true"
  >
  </Gather>
  <Say voice="${voice}">I didn't hear anything. Are you still there?</Say>
  <Gather 
    input="speech dtmf" 
    timeout="5" 
    speechTimeout="auto" 
    action="/webhook/gather?callSid=${callSid}" 
    method="POST"
  >
  </Gather>
  <Say voice="${voice}">I'll let you go for now. Feel free to call back anytime - we're always happy to help! Take care!</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Generate TwiML for transferring to staff
   */
  private generateTransferTwiML(callSid: string, message: string): string {
    const escapedMessage = this.escapeXml(message);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapedMessage}</Say>
  <Say voice="Polly.Joanna">Please hold while I connect you with a staff member.</Say>
  <Enqueue waitUrl="/webhook/hold-music">support</Enqueue>
</Response>`;
  }

  /**
   * Generate error TwiML
   */
  private generateErrorTwiML(errorType: string): string {
    const messages: Record<string, string> = {
      clinic_not_found: "I'm sorry, but I couldn't connect you to the clinic. Please check the number and try again.",
      system_error: "We're experiencing technical difficulties. Please try calling again in a few minutes.",
      default: "Something went wrong. Please call back and try again.",
    };

    const message = messages[errorType] || messages.default;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${message}</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate audio URL using ElevenLabs (for future streaming implementation)
   */
  async generateVoiceAudio(text: string): Promise<Buffer | null> {
    try {
      // This would return audio buffer from ElevenLabs
      // For now, we're using Twilio's built-in TTS
      // return await this.elevenlabs.textToSpeech(text);
      return null;
    } catch (error) {
      this.logger.error(`Failed to generate voice audio: ${error.message}`);
      return null;
    }
  }
}
