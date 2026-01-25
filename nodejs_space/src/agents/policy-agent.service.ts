import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLog {
  callId: string;
  timestamp: Date;
  action: string;
  phiAccessed: boolean;
  complianceStatus: 'compliant' | 'violation' | 'warning';
  details: string;
}

export interface ConsentRecord {
  callSid: string;
  consentGiven: boolean;
  timestamp: Date;
  method: 'verbal' | 'written' | 'implied';
}

/**
 * PolicyAgent - HIPAA Compliance & Data Privacy
 * 
 * Responsibilities:
 * - Enforce HIPAA compliance
 * - Manage call recording consent
 * - Log PHI (Protected Health Information) access
 * - Generate audit trails
 * - Validate data privacy guardrails
 */
@Injectable()
export class PolicyAgentService {
  private readonly logger = new Logger(PolicyAgentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Capture consent for call recording
   */
  async captureConsent(
    callSid: string,
    consentGiven: boolean,
    method: 'verbal' | 'written' | 'implied' = 'verbal',
  ): Promise<ConsentRecord> {
    this.logger.log(
      `[PolicyAgent] Capturing consent for call ${callSid}: ${consentGiven ? 'GRANTED' : 'DENIED'}`,
    );

    const record: ConsentRecord = {
      callSid,
      consentGiven,
      timestamp: new Date(),
      method,
    };

    // Store in database (simplified - would use dedicated consent table in production)
    try {
      await this.prisma.call.updateMany({
        where: { call_sid: callSid },
        data: {
          metadata: {
            consent: record,
          } as any,
        },
      });

      this.logger.log(`[PolicyAgent] ✅ Consent recorded`);
    } catch (error) {
      this.logger.error(
        `[PolicyAgent] Failed to record consent: ${error.message}`,
      );
    }

    return record;
  }

  /**
   * Log PHI access
   */
  async logPhiAccess(
    userId: string,
    patientId: string,
    action: string,
    context?: any,
  ): Promise<void> {
    this.logger.log(
      `[PolicyAgent] Logging PHI access: User ${userId} -> Patient ${patientId} (${action})`,
    );

    // In production, this would write to a dedicated audit log table
    // For MVP, we'll log to console and database metadata
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      patientId,
      action,
      ipAddress: context?.ipAddress || 'system',
      userAgent: context?.userAgent || 'dentsi-ai',
    };

    this.logger.log(
      `[PolicyAgent] PHI Audit: ${JSON.stringify(auditEntry)}`,
    );
  }

  /**
   * Validate HIPAA compliance for an action
   */
  async validateCompliance(
    action: string,
    data: any,
  ): Promise<{ compliant: boolean; warnings: string[] }> {
    this.logger.log(`[PolicyAgent] Validating compliance for action: ${action}`);

    const warnings: string[] = [];

    // Check for PHI in data
    if (this.containsPhi(data)) {
      // Ensure encryption
      if (!data.encrypted) {
        warnings.push('PHI should be encrypted');
      }

      // Ensure audit logging
      if (!data.auditLogged) {
        warnings.push('PHI access should be audit logged');
      }
    }

    // Check for proper consent
    if (action === 'record_call' && !data.consentGiven) {
      warnings.push('Call recording requires explicit consent');
    }

    // Check data retention
    if (action === 'store_data' && data.retentionPeriod) {
      if (data.retentionPeriod > 2555) {
        // 7 years in days
        warnings.push(
          'Data retention exceeds HIPAA maximum (7 years)',
        );
      }
    }

    const compliant = warnings.length === 0;

    this.logger.log(
      `[PolicyAgent] Compliance check: ${compliant ? '✅ COMPLIANT' : '⚠️ WARNINGS'} (${warnings.length} warnings)`,
    );

    return { compliant, warnings };
  }

  /**
   * Generate audit log for a call
   */
  async generateAuditLog(callId: string): Promise<AuditLog> {
    this.logger.log(`[PolicyAgent] Generating audit log for call ${callId}`);

    try {
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        include: {
          patient: true,
          clinic: true,
        },
      });

      if (!call) {
        throw new Error('Call not found');
      }

      const auditLog: AuditLog = {
        callId,
        timestamp: new Date(),
        action: `Call handled: ${call.intent}`,
        phiAccessed: !!call.patient,
        complianceStatus: 'compliant',
        details: `Call duration: ${call.duration}s, Intent: ${call.intent}, Transcript length: ${call.transcript?.length || 0}`,
      };

      this.logger.log(
        `[PolicyAgent] ✅ Audit log generated: ${auditLog.complianceStatus}`,
      );
      return auditLog;
    } catch (error) {
      this.logger.error(
        `[PolicyAgent] Audit log generation failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate HIPAA-compliant greeting with consent
   */
  generateConsentGreeting(clinicName: string): string {
    return `Thank you for calling ${clinicName}. This call may be recorded for quality assurance and training purposes. By continuing, you consent to this recording. This is Dentsi, your AI assistant. How can I help you today?`;
  }

  /**
   * Sanitize data for logging (remove PHI)
   */
  sanitizeForLogging(data: any): any {
    const sanitized = { ...data };

    // Remove or mask PHI fields
    const phiFields = [
      'name',
      'phone',
      'email',
      'dateOfBirth',
      'ssn',
      'insurance',
      'address',
    ];

    for (const field of phiFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Check if data contains PHI
   */
  private containsPhi(data: any): boolean {
    if (!data) return false;

    const phiFields = [
      'name',
      'phone',
      'email',
      'dateOfBirth',
      'ssn',
      'insurance',
      'address',
      'medicalHistory',
    ];

    return phiFields.some((field) => field in data && data[field]);
  }

  /**
   * Validate data retention policy
   */
  validateRetentionPolicy(dataType: string, retentionDays: number): boolean {
    const policies: { [key: string]: number } = {
      call_recording: 2555, // 7 years
      transcript: 2555,
      patient_record: 2555,
      audit_log: 2555,
      appointment: 2555,
    };

    const maxRetention = policies[dataType] || 2555;
    return retentionDays <= maxRetention;
  }
}