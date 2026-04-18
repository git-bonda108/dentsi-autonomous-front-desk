import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { liveTranscriptStore, TranscriptLine, TranscriptRole } from './live-transcript.store';

@ApiTags('Transcript')
@Controller('transcript')
export class TranscriptController {
  private readonly logger = new Logger(TranscriptController.name);

  constructor(private readonly config: ConfigService) {}

  private assertSecret(secret: string | undefined): void {
    const expected = this.config.get<string>('TRANSCRIPT_WEBHOOK_SECRET');
    if (expected && secret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Poll live call transcript lines (for dashboard)' })
  live() {
    return liveTranscriptStore.getAll();
  }

  @Post('line')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Append one transcript line (ElevenLabs / custom webhook)',
  })
  appendLine(
    @Body()
    body: {
      role?: string;
      text?: string;
      ts?: string;
      source?: string;
    },
    @Headers('x-webhook-secret') secret?: string,
  ) {
    this.assertSecret(secret);
    if (!body?.text || typeof body.text !== 'string') {
      return { ok: false, error: 'text is required' };
    }
    const r = (body.role || 'agent').toLowerCase();
    const role: TranscriptRole = ['agent', 'caller', 'system'].includes(r)
      ? (r as TranscriptRole)
      : 'agent';
    const line: TranscriptLine = {
      role,
      text: body.text.trim(),
      ts: body.ts,
      source: body.source,
    };
    liveTranscriptStore.append(line);
    this.logger.log(`Transcript +1 [${role}] len=${line.text.length}`);
    return { ok: true, ...liveTranscriptStore.getAll() };
  }

  @Post('lines')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replace entire transcript (batch upload)' })
  replaceLines(
    @Body() body: { lines?: TranscriptLine[] },
    @Headers('x-webhook-secret') secret?: string,
  ) {
    this.assertSecret(secret);
    const lines = Array.isArray(body?.lines) ? body.lines : [];
    liveTranscriptStore.reset(
      lines.map((l) => ({
        role: (['agent', 'caller', 'system'].includes(String(l.role))
          ? l.role
          : 'agent') as TranscriptRole,
        text: String(l.text || ''),
        ts: l.ts,
        source: l.source,
      })),
    );
    return { ok: true, ...liveTranscriptStore.getAll() };
  }

  @Post('reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear live transcript buffer' })
  reset(@Headers('x-webhook-secret') secret?: string) {
    this.assertSecret(secret);
    liveTranscriptStore.reset();
    return { ok: true, ...liveTranscriptStore.getAll() };
  }
}
