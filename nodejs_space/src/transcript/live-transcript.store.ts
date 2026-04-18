export type TranscriptRole = 'agent' | 'caller' | 'system';

export interface TranscriptLine {
  role: TranscriptRole;
  text: string;
  ts?: string;
  source?: string;
}

/**
 * In-memory live transcript bus for the dashboard (Batch 2).
 * ElevenLabs / Twilio webhooks POST lines here; Streamlit polls GET /transcript/live.
 * For multi-instance production, replace with Redis or DB-backed store.
 */
class LiveTranscriptStore {
  private lines: TranscriptLine[] = [];
  private readonly maxLines = 800;
  private updatedAt = new Date().toISOString();

  append(line: TranscriptLine): void {
    const ts =
      line.ts ||
      new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    this.lines.push({ ...line, ts });
    if (this.lines.length > this.maxLines) {
      this.lines = this.lines.slice(-this.maxLines);
    }
    this.updatedAt = new Date().toISOString();
  }

  getAll(): { lines: TranscriptLine[]; updated_at: string } {
    return { lines: [...this.lines], updated_at: this.updatedAt };
  }

  reset(initial?: TranscriptLine[]): void {
    this.lines = initial ? [...initial] : [];
    this.updatedAt = new Date().toISOString();
  }
}

export const liveTranscriptStore = new LiveTranscriptStore();
