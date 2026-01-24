import {
  Controller,
  Post,
  Body,
  Query,
  Logger,
  HttpCode,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('voice')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle incoming voice call from Twilio' })
  async handleVoiceCall(
    @Body('To') to: string,
    @Body('From') from: string,
    @Body('CallSid') callSid: string,
  ): Promise<string> {
    this.logger.log(`Voice call from ${from} to ${to}, CallSid: ${callSid}`);
    return await this.webhookService.handleIncomingCall(to, callSid);
  }

  @Post('gather')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle speech input from caller' })
  async handleGather(
    @Query('callSid') callSid: string,
    @Body('SpeechResult') speechResult: string,
    @Body('CallSid') bodyCallSid: string,
  ): Promise<string> {
    const sid = callSid || bodyCallSid;
    this.logger.log(`Gather from ${sid}: ${speechResult}`);
    return await this.webhookService.handleUserSpeech(sid, speechResult);
  }

  @Post('end')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  @ApiOperation({ summary: 'Handle call end' })
  async handleEnd(
    @Query('callSid') callSid: string,
    @Body('CallSid') bodyCallSid: string,
    @Body('CallDuration') duration: string,
  ): Promise<string> {
    const sid = callSid || bodyCallSid;
    const durationNum = parseInt(duration || '0', 10);
    this.logger.log(`Call ended: ${sid}, Duration: ${durationNum}s`);
    await this.webhookService.handleCallEnd(sid, durationNum);
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`;
  }

  @Post('status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle call status updates' })
  async handleStatus(
    @Body('CallSid') callSid: string,
    @Body('CallStatus') status: string,
    @Body('CallDuration') duration: string,
  ): Promise<void> {
    this.logger.log(`Call status: ${callSid} - ${status}`);
    if (status === 'completed' && duration) {
      await this.webhookService.handleCallEnd(
        callSid,
        parseInt(duration, 10),
      );
    }
  }
}
