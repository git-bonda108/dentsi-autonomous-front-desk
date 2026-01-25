import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Feedback types
 */
export type FeedbackType = 
  | 'quality_rating'     // Overall call quality (1-5)
  | 'response_rating'    // Specific response quality (1-5)
  | 'correction'         // Staff corrected AI response
  | 'escalation_review'  // Review of escalated call
  | 'patient_survey'     // Post-call patient survey
  | 'staff_annotation';  // Staff notes on conversation

/**
 * Feedback entry
 */
export interface FeedbackEntry {
  id: string;
  callId: string;
  clinicId: string;
  type: FeedbackType;
  rating?: number; // 1-5 scale
  turnNumber?: number; // Specific turn being rated
  originalResponse?: string; // What AI said
  correctedResponse?: string; // What it should have said
  notes?: string;
  tags?: string[]; // Categories like 'tone', 'accuracy', 'helpfulness'
  submittedBy: string; // staff_id or 'patient' or 'system'
  createdAt: Date;
}

/**
 * Training improvement suggestion
 */
export interface ImprovementSuggestion {
  category: string;
  issue: string;
  frequency: number;
  examples: {
    original: string;
    corrected: string;
    context: string;
  }[];
  recommendation: string;
}

/**
 * FeedbackService - Collects and analyzes feedback for continuous improvement
 * 
 * Features:
 * - Quality ratings collection
 * - Staff corrections
 * - Patient surveys
 * - Pattern analysis
 * - Improvement suggestions
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit quality rating for a call
   */
  async submitCallRating(
    callId: string,
    rating: number, // 1-5
    submittedBy: string,
    notes?: string,
    tags?: string[],
  ): Promise<FeedbackEntry> {
    this.logger.log(`Submitting call rating: ${callId}, rating: ${rating}`);

    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    // Update call quality rating
    await this.prisma.call.update({
      where: { id: callId },
      data: { quality_rating: rating },
    });

    // Store detailed feedback
    const feedback = await this.prisma.feedback.create({
      data: {
        call_id: callId,
        clinic_id: call.clinic_id,
        type: 'quality_rating',
        rating,
        notes,
        tags: tags ? JSON.stringify(tags) : null,
        submitted_by: submittedBy,
      },
    });

    return {
      id: feedback.id,
      callId: feedback.call_id,
      clinicId: feedback.clinic_id,
      type: 'quality_rating',
      rating,
      notes: notes || undefined,
      tags,
      submittedBy,
      createdAt: feedback.created_at,
    };
  }

  /**
   * Submit correction for a specific AI response
   */
  async submitCorrection(
    callId: string,
    turnNumber: number,
    originalResponse: string,
    correctedResponse: string,
    submittedBy: string,
    notes?: string,
    tags?: string[],
  ): Promise<FeedbackEntry> {
    this.logger.log(`Submitting correction for call ${callId}, turn ${turnNumber}`);

    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        call_id: callId,
        clinic_id: call.clinic_id,
        type: 'correction',
        turn_number: turnNumber,
        original_response: originalResponse,
        corrected_response: correctedResponse,
        notes,
        tags: tags ? JSON.stringify(tags) : null,
        submitted_by: submittedBy,
      },
    });

    return {
      id: feedback.id,
      callId: feedback.call_id,
      clinicId: feedback.clinic_id,
      type: 'correction',
      turnNumber,
      originalResponse,
      correctedResponse,
      notes: notes || undefined,
      tags,
      submittedBy,
      createdAt: feedback.created_at,
    };
  }

  /**
   * Submit post-call patient survey
   */
  async submitPatientSurvey(
    callId: string,
    ratings: {
      overall: number; // 1-5
      helpfulness?: number;
      clarity?: number;
      resolution?: number;
    },
    freeformFeedback?: string,
  ): Promise<FeedbackEntry> {
    this.logger.log(`Submitting patient survey for call ${callId}`);

    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        call_id: callId,
        clinic_id: call.clinic_id,
        type: 'patient_survey',
        rating: ratings.overall,
        notes: freeformFeedback,
        tags: JSON.stringify({
          helpfulness: ratings.helpfulness,
          clarity: ratings.clarity,
          resolution: ratings.resolution,
        }),
        submitted_by: 'patient',
      },
    });

    // Update call with patient rating
    await this.prisma.call.update({
      where: { id: callId },
      data: { quality_rating: ratings.overall },
    });

    return {
      id: feedback.id,
      callId: feedback.call_id,
      clinicId: feedback.clinic_id,
      type: 'patient_survey',
      rating: ratings.overall,
      notes: freeformFeedback,
      submittedBy: 'patient',
      createdAt: feedback.created_at,
    };
  }

  /**
   * Get feedback for a specific call
   */
  async getCallFeedback(callId: string): Promise<FeedbackEntry[]> {
    const feedbacks = await this.prisma.feedback.findMany({
      where: { call_id: callId },
      orderBy: { created_at: 'desc' },
    });

    return feedbacks.map(f => ({
      id: f.id,
      callId: f.call_id,
      clinicId: f.clinic_id,
      type: f.type as FeedbackType,
      rating: f.rating || undefined,
      turnNumber: f.turn_number || undefined,
      originalResponse: f.original_response || undefined,
      correctedResponse: f.corrected_response || undefined,
      notes: f.notes || undefined,
      tags: f.tags ? JSON.parse(f.tags) : undefined,
      submittedBy: f.submitted_by,
      createdAt: f.created_at,
    }));
  }

  /**
   * Get clinic feedback summary
   */
  async getClinicFeedbackSummary(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalFeedback: number;
    avgRating: number;
    ratingDistribution: Record<number, number>;
    correctionCount: number;
    commonIssues: { tag: string; count: number }[];
    improvementNeeded: boolean;
  }> {
    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const totalFeedback = feedbacks.length;
    if (totalFeedback === 0) {
      return {
        totalFeedback: 0,
        avgRating: 0,
        ratingDistribution: {},
        correctionCount: 0,
        commonIssues: [],
        improvementNeeded: false,
      };
    }

    // Calculate average rating
    const withRating = feedbacks.filter(f => f.rating !== null);
    const avgRating = withRating.length > 0
      ? withRating.reduce((sum, f) => sum + (f.rating || 0), 0) / withRating.length
      : 0;

    // Rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    withRating.forEach(f => {
      const r = f.rating || 0;
      if (r >= 1 && r <= 5) {
        ratingDistribution[r]++;
      }
    });

    // Correction count
    const correctionCount = feedbacks.filter(f => f.type === 'correction').length;

    // Common issues from tags
    const tagCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      if (f.tags) {
        try {
          const tags = JSON.parse(f.tags);
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    const commonIssues = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Determine if improvement is needed
    const improvementNeeded = avgRating < 3.5 || correctionCount > totalFeedback * 0.1;

    return {
      totalFeedback,
      avgRating,
      ratingDistribution,
      correctionCount,
      commonIssues,
      improvementNeeded,
    };
  }

  /**
   * Get corrections for training improvement
   */
  async getCorrections(
    clinicId: string,
    limit: number = 100,
  ): Promise<{
    turnNumber: number;
    original: string;
    corrected: string;
    tags: string[];
    callId: string;
  }[]> {
    const corrections = await this.prisma.feedback.findMany({
      where: {
        clinic_id: clinicId,
        type: 'correction',
        original_response: { not: null },
        corrected_response: { not: null },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return corrections.map(c => ({
      turnNumber: c.turn_number || 0,
      original: c.original_response || '',
      corrected: c.corrected_response || '',
      tags: c.tags ? JSON.parse(c.tags) : [],
      callId: c.call_id,
    }));
  }

  /**
   * Generate improvement suggestions based on feedback
   */
  async generateImprovementSuggestions(
    clinicId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ImprovementSuggestion[]> {
    const corrections = await this.getCorrections(clinicId, 200);
    
    if (corrections.length === 0) {
      return [];
    }

    // Group corrections by tag
    const tagGroups: Record<string, typeof corrections> = {};
    corrections.forEach(c => {
      c.tags.forEach(tag => {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(c);
      });
    });

    // Generate suggestions
    const suggestions: ImprovementSuggestion[] = [];

    // Category-specific suggestions
    const categoryRecommendations: Record<string, string> = {
      'tone': 'Fine-tune the model with examples of more empathetic and professional responses',
      'accuracy': 'Review and update the system prompt with more accurate information',
      'helpfulness': 'Add more helpful context and suggestions to responses',
      'clarity': 'Simplify language and use shorter sentences',
      'timing': 'Adjust response timing and pacing',
      'escalation': 'Review escalation triggers and thresholds',
      'booking': 'Improve booking flow and confirmation language',
      'medical': 'Enhance medical terminology understanding',
    };

    for (const [tag, group] of Object.entries(tagGroups)) {
      if (group.length >= 2) { // Only suggest if pattern appears multiple times
        suggestions.push({
          category: tag,
          issue: `${group.length} corrections related to ${tag}`,
          frequency: group.length,
          examples: group.slice(0, 3).map(c => ({
            original: c.original,
            corrected: c.corrected,
            context: `Call ${c.callId}, turn ${c.turnNumber}`,
          })),
          recommendation: categoryRecommendations[tag] || 
            `Review ${tag} patterns and update training examples`,
        });
      }
    }

    // Sort by frequency
    suggestions.sort((a, b) => b.frequency - a.frequency);

    return suggestions;
  }

  /**
   * Flag a call for review
   */
  async flagForReview(
    callId: string,
    reason: string,
    flaggedBy: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<void> {
    await this.prisma.feedback.create({
      data: {
        call_id: callId,
        clinic_id: (await this.prisma.call.findUnique({ where: { id: callId } }))?.clinic_id || '',
        type: 'staff_annotation',
        notes: `FLAGGED FOR REVIEW: ${reason}`,
        tags: JSON.stringify({ priority, reason }),
        submitted_by: flaggedBy,
      },
    });

    this.logger.log(`Call ${callId} flagged for review: ${reason}`);
  }

  /**
   * Get calls flagged for review
   */
  async getFlaggedCalls(
    clinicId: string,
    limit: number = 50,
  ): Promise<{
    callId: string;
    reason: string;
    priority: string;
    flaggedBy: string;
    flaggedAt: Date;
  }[]> {
    const flagged = await this.prisma.feedback.findMany({
      where: {
        clinic_id: clinicId,
        type: 'staff_annotation',
        notes: { startsWith: 'FLAGGED FOR REVIEW:' },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return flagged.map(f => {
      let priority = 'medium';
      let reason = f.notes?.replace('FLAGGED FOR REVIEW:', '').trim() || '';
      
      try {
        const tags = f.tags ? JSON.parse(f.tags) : {};
        priority = tags.priority || 'medium';
        reason = tags.reason || reason;
      } catch (e) {
        // Ignore parse errors
      }

      return {
        callId: f.call_id,
        reason,
        priority,
        flaggedBy: f.submitted_by,
        flaggedAt: f.created_at,
      };
    });
  }
}
