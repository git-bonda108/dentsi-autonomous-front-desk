import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientInfo } from './voice-agent.service';

export interface FallbackAction {
  type: 'retry' | 'callback' | 'escalate' | 'voicemail';
  message: string;
  reason: string;
  requiresStaffNotification: boolean;
}

export interface CallContext {
  callSid: string;
  clinicId: string;
  intent?: string;
  patientInfo?: PatientInfo;
  conversationHistory?: string[];
}

export interface CallbackQueueEntry {
  id: string;
  patientInfo: PatientInfo;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * OpsAgent - Operations & Fallback Management
 * 
 * Responsibilities:
 * - Handle system failures gracefully
 * - Manage escalation to human staff
 * - Maintain callback queue
 * - Send staff notifications
 * - Error recovery strategies
 */
@Injectable()
export class OpsAgentService {
  private readonly logger = new Logger(OpsAgentService.name);

  // In-memory callback queue (would be database in production)
  private callbackQueue: CallbackQueueEntry[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle system failures with appropriate fallback
   */
  async handleFailure(
    error: Error,
    context: CallContext,
  ): Promise<FallbackAction> {
    this.logger.error(
      `[OpsAgent] Handling failure: ${error.message} (Call: ${context.callSid})`,
    );

    // Classify error type
    const errorType = this.classifyError(error);

    let fallbackAction: FallbackAction;

    switch (errorType) {
      case 'timeout':
        // PMS or API timeout - retry with fallback
        fallbackAction = {
          type: 'retry',
          message:
            "I apologize for the delay. Let me try that again...",
          reason: 'API timeout',
          requiresStaffNotification: false,
        };
        break;

      case 'no_availability':
        // No slots available - offer callback
        fallbackAction = {
          type: 'callback',
          message:
            "I don't have any openings this week. Would you like me to call you when we have a cancellation, or would you prefer to schedule for next week?",
          reason: 'No available slots',
          requiresStaffNotification: true,
        };
        break;

      case 'ambiguous_input':
        // Unclear user intent - ask for clarification
        fallbackAction = {
          type: 'retry',
          message:
            "I want to make sure I understand correctly. Are you looking to schedule a new appointment or reschedule an existing one?",
          reason: 'Ambiguous user input',
          requiresStaffNotification: false,
        };
        break;

      case 'system_error':
        // Critical system failure - escalate
        fallbackAction = {
          type: 'escalate',
          message:
            "I apologize, I'm experiencing technical difficulties. Can I have your name and number? A staff member will call you back within the hour.",
          reason: 'System error',
          requiresStaffNotification: true,
        };
        break;

      case 'emergency':
        // Emergency case - immediate escalation
        fallbackAction = {
          type: 'escalate',
          message:
            "This sounds urgent. Let me connect you with someone right away. Please hold for just a moment.",
          reason: 'Emergency escalation',
          requiresStaffNotification: true,
        };
        break;

      default:
        // Unknown error - safe fallback to callback
        fallbackAction = {
          type: 'callback',
          message:
            "I apologize for the inconvenience. Can I get your name and phone number? I'll have someone call you back shortly.",
          reason: 'Unknown error',
          requiresStaffNotification: true,
        };
    }

    // Log the fallback action
    await this.logFallbackAction(context, fallbackAction, error);

    this.logger.log(
      `[OpsAgent] Fallback action: ${fallbackAction.type} - "${fallbackAction.message}"`,
    );

    return fallbackAction;
  }

  /**
   * Escalate to human staff
   */
  async escalateToStaff(
    callId: string,
    reason: string,
    urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    this.logger.warn(
      `[OpsAgent] ⚠️ Escalating call ${callId} to staff: ${reason} (${urgency})`,
    );

    // In production, this would:
    // 1. Send SMS/email to on-call staff
    // 2. Create ticket in staff dashboard
    // 3. Update call record with escalation flag

    try {
      await this.prisma.call.update({
        where: { id: callId },
        data: {
          metadata: {
            escalated: true,
            escalationReason: reason,
            escalationUrgency: urgency,
            escalationTime: new Date().toISOString(),
          } as any,
        },
      });

      this.logger.log(`[OpsAgent] ✅ Escalation recorded in database`);
    } catch (error) {
      this.logger.error(
        `[OpsAgent] Failed to record escalation: ${error.message}`,
      );
    }

    // Send notification
    await this.notifyStaff(
      `Call escalation: ${reason}`,
      urgency === 'urgent' ? 'critical' : 'warning',
    );
  }

  /**
   * Add patient to callback queue
   */
  async addToCallbackQueue(
    patientInfo: PatientInfo,
    reason: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<CallbackQueueEntry> {
    this.logger.log(
      `[OpsAgent] Adding to callback queue: ${patientInfo.name} (${priority})`,
    );

    const entry: CallbackQueueEntry = {
      id: `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientInfo,
      reason,
      priority,
      createdAt: new Date(),
      status: 'pending',
    };

    this.callbackQueue.push(entry);

    // Sort queue by priority
    this.callbackQueue.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.logger.log(
      `[OpsAgent] ✅ Added to queue (position: ${this.callbackQueue.indexOf(entry) + 1})`,
    );

    // Notify staff
    if (priority === 'urgent' || priority === 'high') {
      await this.notifyStaff(
        `New ${priority} priority callback: ${patientInfo.name} - ${reason}`,
        priority === 'urgent' ? 'critical' : 'warning',
      );
    }

    return entry;
  }

  /**
   * Send notification to staff
   */
  async notifyStaff(
    message: string,
    urgency: 'info' | 'warning' | 'critical' = 'info',
  ): Promise<void> {
    this.logger.log(
      `[OpsAgent] 🔔 Staff notification (${urgency}): ${message}`,
    );

    // In production, this would send:
    // - SMS to on-call staff
    // - Email notification
    // - Push notification to mobile app
    // - Update staff dashboard

    // For MVP, we'll just log
    const icon = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    }[urgency];

    console.log(`\n${icon} STAFF NOTIFICATION (${urgency.toUpperCase()})`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
  }

  /**
   * Get callback queue
   */
  getCallbackQueue(
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  ): CallbackQueueEntry[] {
    if (status) {
      return this.callbackQueue.filter((entry) => entry.status === status);
    }
    return [...this.callbackQueue];
  }

  /**
   * Update callback queue entry status
   */
  updateCallbackStatus(
    entryId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  ): boolean {
    const entry = this.callbackQueue.find((e) => e.id === entryId);
    if (entry) {
      entry.status = status;
      this.logger.log(
        `[OpsAgent] Updated callback ${entryId} status to ${status}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Classify error type for appropriate handling
   */
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('no slots') || message.includes('not available')) {
      return 'no_availability';
    }
    if (message.includes('ambiguous') || message.includes('unclear')) {
      return 'ambiguous_input';
    }
    if (message.includes('emergency') || message.includes('urgent')) {
      return 'emergency';
    }
    if (
      message.includes('database') ||
      message.includes('connection') ||
      message.includes('network')
    ) {
      return 'system_error';
    }

    return 'unknown';
  }

  /**
   * Log fallback action for audit
   */
  private async logFallbackAction(
    context: CallContext,
    action: FallbackAction,
    error: Error,
  ): Promise<void> {
    // Log to database for audit trail
    const logEntry = {
      timestamp: new Date().toISOString(),
      callSid: context.callSid,
      errorMessage: error.message,
      fallbackType: action.type,
      fallbackReason: action.reason,
      requiresNotification: action.requiresStaffNotification,
    };

    this.logger.log(
      `[OpsAgent] Fallback logged: ${JSON.stringify(logEntry)}`,
    );
  }

  /**
   * Generate recovery message for user
   */
  generateRecoveryMessage(errorType: string): string {
    const messages: { [key: string]: string } = {
      timeout: "I apologize for the delay. Let me try that again...",
      no_availability:
        "I don't see any openings right now. Would you like me to check next week?",
      system_error:
        "I'm experiencing technical difficulties. Can I get your number for a callback?",
      emergency: "This sounds urgent. Let me connect you with someone immediately.",
      unknown:
        "I apologize for the inconvenience. Let me have someone call you back.",
    };

    return messages[errorType] || messages.unknown;
  }
}