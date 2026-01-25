import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Spam classification result
 */
export interface SpamCheckResult {
  isSpam: boolean;
  confidence: number; // 0-1
  reason?: string;
  blockRecommended: boolean;
  flags: string[];
}

/**
 * Known spam patterns
 */
interface SpamPattern {
  type: 'phone_prefix' | 'keyword' | 'behavior' | 'carrier';
  pattern: string | RegExp;
  weight: number;
  description: string;
}

/**
 * SpamDetectionService - Filters spam and robocalls
 * 
 * Features:
 * - Phone number pattern detection
 * - Keyword-based filtering
 * - Behavioral analysis
 * - Blocklist management
 * - Spam reporting
 */
@Injectable()
export class SpamDetectionService {
  private readonly logger = new Logger(SpamDetectionService.name);

  // Blocklist (in production, would be in database)
  private blocklist: Set<string> = new Set();
  
  // Whitelist (known good numbers)
  private whitelist: Set<string> = new Set();

  // Spam patterns with weights
  private readonly spamPatterns: SpamPattern[] = [
    // Phone prefix patterns (common robocall prefixes)
    { type: 'phone_prefix', pattern: '+1900', weight: 0.9, description: 'Premium rate number' },
    { type: 'phone_prefix', pattern: '+1800555', weight: 0.7, description: 'Known spam prefix' },
    
    // Keyword patterns in speech
    { type: 'keyword', pattern: /(?:extended warranty|car warranty)/i, weight: 0.95, description: 'Extended warranty scam' },
    { type: 'keyword', pattern: /(?:irs|internal revenue|tax debt)/i, weight: 0.9, description: 'IRS scam' },
    { type: 'keyword', pattern: /(?:social security|suspended|arrested)/i, weight: 0.85, description: 'Social security scam' },
    { type: 'keyword', pattern: /(?:congratulations|you have won|winner)/i, weight: 0.8, description: 'Prize scam' },
    { type: 'keyword', pattern: /(?:bitcoin|crypto|investment opportunity)/i, weight: 0.7, description: 'Crypto scam' },
    { type: 'keyword', pattern: /(?:free vacation|timeshare|resort)/i, weight: 0.75, description: 'Vacation scam' },
    { type: 'keyword', pattern: /(?:microsoft|apple|tech support|virus)/i, weight: 0.8, description: 'Tech support scam' },
    { type: 'keyword', pattern: /(?:credit card|bank account|verify your)/i, weight: 0.6, description: 'Phishing attempt' },
    
    // Behavioral patterns
    { type: 'behavior', pattern: 'rapid_hangup', weight: 0.5, description: 'Hung up within 5 seconds' },
    { type: 'behavior', pattern: 'no_speech', weight: 0.4, description: 'No speech detected' },
    { type: 'behavior', pattern: 'repeated_calls', weight: 0.6, description: 'Multiple calls from same number' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a call is spam
   */
  async checkSpam(
    phoneNumber: string,
    initialSpeech?: string,
    callDuration?: number,
    callHistory?: { count: number; avgDuration: number },
  ): Promise<SpamCheckResult> {
    const flags: string[] = [];
    let totalWeight = 0;
    let maxWeight = 0;

    // Check blocklist first
    if (this.blocklist.has(phoneNumber)) {
      return {
        isSpam: true,
        confidence: 1.0,
        reason: 'Number is on blocklist',
        blockRecommended: true,
        flags: ['blocklisted'],
      };
    }

    // Check whitelist
    if (this.whitelist.has(phoneNumber)) {
      return {
        isSpam: false,
        confidence: 1.0,
        blockRecommended: false,
        flags: ['whitelisted'],
      };
    }

    // Check if number is a known patient
    const existingPatient = await this.prisma.patient.findFirst({
      where: { phone: phoneNumber },
    });
    
    if (existingPatient) {
      return {
        isSpam: false,
        confidence: 0.95,
        reason: 'Known patient',
        blockRecommended: false,
        flags: ['known_patient'],
      };
    }

    // Check phone prefix patterns
    for (const pattern of this.spamPatterns.filter(p => p.type === 'phone_prefix')) {
      if (phoneNumber.startsWith(pattern.pattern as string)) {
        flags.push(pattern.description);
        totalWeight += pattern.weight;
        maxWeight = Math.max(maxWeight, pattern.weight);
      }
    }

    // Check keyword patterns in speech
    if (initialSpeech) {
      for (const pattern of this.spamPatterns.filter(p => p.type === 'keyword')) {
        if ((pattern.pattern as RegExp).test(initialSpeech)) {
          flags.push(pattern.description);
          totalWeight += pattern.weight;
          maxWeight = Math.max(maxWeight, pattern.weight);
        }
      }
    }

    // Check behavioral patterns
    if (callDuration !== undefined && callDuration < 5) {
      const rapidHangup = this.spamPatterns.find(p => p.pattern === 'rapid_hangup');
      if (rapidHangup) {
        flags.push(rapidHangup.description);
        totalWeight += rapidHangup.weight;
      }
    }

    if (initialSpeech === '' || initialSpeech === '[silence]') {
      const noSpeech = this.spamPatterns.find(p => p.pattern === 'no_speech');
      if (noSpeech) {
        flags.push(noSpeech.description);
        totalWeight += noSpeech.weight;
      }
    }

    if (callHistory && callHistory.count > 5 && callHistory.avgDuration < 10) {
      const repeated = this.spamPatterns.find(p => p.pattern === 'repeated_calls');
      if (repeated) {
        flags.push(repeated.description);
        totalWeight += repeated.weight;
      }
    }

    // Calculate spam probability
    const confidence = Math.min(totalWeight, 1.0);
    const isSpam = confidence >= 0.6 || maxWeight >= 0.8;

    const result: SpamCheckResult = {
      isSpam,
      confidence,
      reason: flags.length > 0 ? flags[0] : undefined,
      blockRecommended: confidence >= 0.8,
      flags,
    };

    if (isSpam) {
      this.logger.warn(`Spam detected from ${phoneNumber}: ${flags.join(', ')}`);
    }

    return result;
  }

  /**
   * Add number to blocklist
   */
  addToBlocklist(phoneNumber: string, reason?: string): void {
    this.blocklist.add(phoneNumber);
    this.logger.log(`Added ${phoneNumber} to blocklist: ${reason || 'manual'}`);
  }

  /**
   * Remove number from blocklist
   */
  removeFromBlocklist(phoneNumber: string): void {
    this.blocklist.delete(phoneNumber);
    this.logger.log(`Removed ${phoneNumber} from blocklist`);
  }

  /**
   * Add number to whitelist
   */
  addToWhitelist(phoneNumber: string): void {
    this.whitelist.add(phoneNumber);
    this.blocklist.delete(phoneNumber); // Remove from blocklist if present
    this.logger.log(`Added ${phoneNumber} to whitelist`);
  }

  /**
   * Report a call as spam
   */
  async reportSpam(
    callId: string,
    reportedBy: string,
    reason?: string,
  ): Promise<void> {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call || !call.caller_phone) {
      return;
    }

    // Update call as spam
    await this.prisma.call.update({
      where: { id: callId },
      data: { outcome: 'spam' },
    });

    // Add to blocklist
    this.addToBlocklist(call.caller_phone, reason || `Reported by ${reportedBy}`);

    this.logger.log(`Call ${callId} reported as spam by ${reportedBy}`);
  }

  /**
   * Get call history for a phone number
   */
  async getCallHistory(
    phoneNumber: string,
    clinicId?: string,
  ): Promise<{ count: number; avgDuration: number; outcomes: Record<string, number> }> {
    const where: any = { caller_phone: phoneNumber };
    if (clinicId) where.clinic_id = clinicId;

    const calls = await this.prisma.call.findMany({
      where,
      select: { duration: true, outcome: true },
    });

    if (calls.length === 0) {
      return { count: 0, avgDuration: 0, outcomes: {} };
    }

    const avgDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length;
    const outcomes: Record<string, number> = {};
    calls.forEach(c => {
      const outcome = c.outcome || 'unknown';
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });

    return {
      count: calls.length,
      avgDuration,
      outcomes,
    };
  }

  /**
   * Get blocklist (for admin)
   */
  getBlocklist(): string[] {
    return Array.from(this.blocklist);
  }

  /**
   * Get whitelist (for admin)
   */
  getWhitelist(): string[] {
    return Array.from(this.whitelist);
  }

  /**
   * Generate spam TwiML response
   */
  generateSpamResponse(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, but we cannot process your call at this time. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }
}
