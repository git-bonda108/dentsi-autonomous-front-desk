import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * OpenAI fine-tuning message format
 */
interface FineTuningMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI fine-tuning example (JSONL format)
 */
interface FineTuningExample {
  messages: FineTuningMessage[];
}

/**
 * Export options
 */
export interface ExportOptions {
  clinicId?: string;
  startDate?: Date;
  endDate?: Date;
  minQualityScore?: number; // Only export calls with rating >= this
  includeCorrections?: boolean; // Include staff corrections
  outcomes?: string[]; // Filter by outcome (booked, escalated, etc.)
  maxExamples?: number;
}

/**
 * Export result
 */
export interface ExportResult {
  filePath: string;
  exampleCount: number;
  totalTokensEstimate: number;
  metadata: {
    exportedAt: Date;
    filters: ExportOptions;
    outcomeBreakdown: Record<string, number>;
    avgQuality: number;
  };
}

/**
 * TrainingExportService - Exports conversation data for fine-tuning
 * 
 * Features:
 * - JSONL export for OpenAI fine-tuning
 * - Quality-based filtering
 * - Correction integration
 * - Token estimation
 */
@Injectable()
export class TrainingExportService {
  private readonly logger = new Logger(TrainingExportService.name);
  private readonly exportDir = './training-data';

  constructor(private readonly prisma: PrismaService) {
    // Ensure export directory exists
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export training data as JSONL for OpenAI fine-tuning
   */
  async exportForFineTuning(options: ExportOptions = {}): Promise<ExportResult> {
    this.logger.log('Starting training data export...');

    // Build query filters
    const where: any = {};
    
    if (options.clinicId) {
      where.clinic_id = options.clinicId;
    }
    
    if (options.startDate || options.endDate) {
      where.created_at = {};
      if (options.startDate) where.created_at.gte = options.startDate;
      if (options.endDate) where.created_at.lte = options.endDate;
    }
    
    if (options.minQualityScore) {
      where.quality_rating = { gte: options.minQualityScore };
    }
    
    if (options.outcomes && options.outcomes.length > 0) {
      where.outcome = { in: options.outcomes };
    }

    // Fetch calls with conversation logs
    const calls = await this.prisma.call.findMany({
      where,
      include: {
        conversation_logs: {
          orderBy: { turn_number: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
      take: options.maxExamples || 1000,
    });

    this.logger.log(`Found ${calls.length} calls for export`);

    // Get corrections if requested
    let corrections: Map<string, { turnNumber: number; corrected: string }[]> = new Map();
    if (options.includeCorrections) {
      const correctionData = await this.prisma.feedback.findMany({
        where: {
          type: 'correction',
          corrected_response: { not: null },
        },
      });

      correctionData.forEach(c => {
        const callCorrections = corrections.get(c.call_id) || [];
        callCorrections.push({
          turnNumber: c.turn_number || 0,
          corrected: c.corrected_response || '',
        });
        corrections.set(c.call_id, callCorrections);
      });
    }

    // Convert to fine-tuning examples
    const examples: FineTuningExample[] = [];
    const outcomeBreakdown: Record<string, number> = {};
    let totalQuality = 0;
    let qualityCount = 0;

    for (const call of calls) {
      // Track outcome
      const outcome = call.outcome || 'unknown';
      outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1;

      // Track quality
      if (call.quality_rating) {
        totalQuality += call.quality_rating;
        qualityCount++;
      }

      // Build messages
      const messages: FineTuningMessage[] = [];
      const callCorrections = corrections.get(call.id) || [];

      for (const log of call.conversation_logs) {
        // Map role
        let role: 'system' | 'user' | 'assistant';
        if (log.role === 'system') {
          role = 'system';
        } else if (log.role === 'user') {
          role = 'user';
        } else if (log.role === 'assistant') {
          role = 'assistant';
        } else {
          // Skip tool calls for fine-tuning (handled differently)
          continue;
        }

        // Check for correction
        let content = log.content;
        const correction = callCorrections.find(c => c.turnNumber === log.turn_number);
        if (correction && role === 'assistant') {
          content = correction.corrected; // Use corrected version
        }

        messages.push({ role, content });
      }

      // Only include if we have meaningful conversation
      if (messages.length >= 3) { // At least system + user + assistant
        examples.push({ messages });
      }
    }

    // Write JSONL file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training-${timestamp}.jsonl`;
    const filePath = path.join(this.exportDir, filename);

    const jsonlContent = examples
      .map(ex => JSON.stringify(ex))
      .join('\n');

    fs.writeFileSync(filePath, jsonlContent);

    // Estimate tokens (rough: ~4 chars per token)
    const totalChars = examples.reduce(
      (sum, ex) => sum + ex.messages.reduce((s, m) => s + m.content.length, 0),
      0,
    );
    const totalTokensEstimate = Math.ceil(totalChars / 4);

    const result: ExportResult = {
      filePath,
      exampleCount: examples.length,
      totalTokensEstimate,
      metadata: {
        exportedAt: new Date(),
        filters: options,
        outcomeBreakdown,
        avgQuality: qualityCount > 0 ? totalQuality / qualityCount : 0,
      },
    };

    this.logger.log(
      `Exported ${examples.length} examples to ${filePath} ` +
      `(~${totalTokensEstimate} tokens)`,
    );

    return result;
  }

  /**
   * Export high-quality examples only (4+ rating)
   */
  async exportHighQualityExamples(clinicId?: string): Promise<ExportResult> {
    return this.exportForFineTuning({
      clinicId,
      minQualityScore: 4,
      includeCorrections: true,
      outcomes: ['booked', 'rescheduled', 'inquiry_answered'],
    });
  }

  /**
   * Export successful booking conversations
   */
  async exportBookingExamples(clinicId?: string): Promise<ExportResult> {
    return this.exportForFineTuning({
      clinicId,
      outcomes: ['booked'],
      includeCorrections: true,
    });
  }

  /**
   * Generate system prompt from best examples
   */
  async generateImprovedSystemPrompt(clinicId: string): Promise<{
    systemPrompt: string;
    basedOnExamples: number;
  }> {
    // Get high-quality calls
    const calls = await this.prisma.call.findMany({
      where: {
        clinic_id: clinicId,
        quality_rating: { gte: 4 },
      },
      include: {
        conversation_logs: {
          where: { role: 'system' },
          take: 1,
        },
      },
      take: 10,
    });

    if (calls.length === 0) {
      return {
        systemPrompt: 'Not enough high-quality examples to generate improved prompt',
        basedOnExamples: 0,
      };
    }

    // Extract common patterns from system prompts
    // (In production, this would use GPT to analyze and synthesize)
    const systemPrompt = calls[0]?.conversation_logs[0]?.content || '';

    return {
      systemPrompt,
      basedOnExamples: calls.length,
    };
  }

  /**
   * Create validation dataset (for evaluating fine-tuned model)
   */
  async createValidationSet(
    clinicId: string,
    testPercentage: number = 0.1,
  ): Promise<{
    trainingPath: string;
    validationPath: string;
    trainingCount: number;
    validationCount: number;
  }> {
    // Export all high-quality examples
    const allExamples = await this.exportForFineTuning({
      clinicId,
      minQualityScore: 4,
      includeCorrections: true,
    });

    // Read and split
    const content = fs.readFileSync(allExamples.filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    // Shuffle
    const shuffled = lines.sort(() => Math.random() - 0.5);

    // Split
    const splitIndex = Math.floor(shuffled.length * (1 - testPercentage));
    const trainingLines = shuffled.slice(0, splitIndex);
    const validationLines = shuffled.slice(splitIndex);

    // Write files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const trainingPath = path.join(this.exportDir, `training-${timestamp}.jsonl`);
    const validationPath = path.join(this.exportDir, `validation-${timestamp}.jsonl`);

    fs.writeFileSync(trainingPath, trainingLines.join('\n'));
    fs.writeFileSync(validationPath, validationLines.join('\n'));

    // Remove original file
    fs.unlinkSync(allExamples.filePath);

    return {
      trainingPath,
      validationPath,
      trainingCount: trainingLines.length,
      validationCount: validationLines.length,
    };
  }

  /**
   * Get export history
   */
  async getExportHistory(): Promise<{
    filename: string;
    createdAt: Date;
    size: number;
  }[]> {
    const files = fs.readdirSync(this.exportDir);
    
    return files
      .filter(f => f.endsWith('.jsonl'))
      .map(filename => {
        const filePath = path.join(this.exportDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          createdAt: stats.mtime,
          size: stats.size,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Calculate cost estimate for fine-tuning
   */
  estimateFineTuningCost(tokenCount: number): {
    trainingCost: number;
    inferenceCostPer1k: number;
    notes: string;
  } {
    // OpenAI gpt-4o-mini fine-tuning pricing (as of 2024)
    // Training: $3.00 per 1M tokens
    // Inference: $0.30 per 1M input tokens, $1.20 per 1M output tokens
    
    const trainingCost = (tokenCount / 1_000_000) * 3.00;
    const inferenceCostPer1k = 0.0003 + 0.0012; // Rough average

    return {
      trainingCost: Math.round(trainingCost * 100) / 100,
      inferenceCostPer1k: Math.round(inferenceCostPer1k * 10000) / 10000,
      notes: 'Based on gpt-4o-mini fine-tuning rates. Actual costs may vary.',
    };
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(keepCount: number = 10): Promise<number> {
    const exports = await this.getExportHistory();
    
    if (exports.length <= keepCount) {
      return 0;
    }

    const toDelete = exports.slice(keepCount);
    
    for (const file of toDelete) {
      fs.unlinkSync(path.join(this.exportDir, file.filename));
    }

    return toDelete.length;
  }
}
