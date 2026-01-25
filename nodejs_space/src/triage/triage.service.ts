import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientContext } from '../conversation/patient-context.service';

/**
 * Urgency levels for patient triaging
 */
export type UrgencyLevel = 'routine' | 'soon' | 'urgent' | 'emergency';

/**
 * Triage result with urgency and recommendations
 */
export interface TriageResult {
  urgencyLevel: UrgencyLevel;
  urgencyScore: number; // 1-10 scale
  reasons: string[];
  recommendations: string[];
  medicalAlerts: MedicalAlert[];
  estimatedWaitTime: string;
  shouldEscalate: boolean;
  escalationReason?: string;
}

/**
 * Medical alert for patient safety
 */
export interface MedicalAlert {
  type: 'allergy' | 'medication' | 'condition' | 'note';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details?: string;
}

/**
 * Symptom keywords for urgency detection
 */
interface SymptomPattern {
  keywords: string[];
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  recommendation: string;
}

/**
 * TriageService - Patient urgency classification and medical alerts
 * 
 * Features:
 * - Analyzes patient symptoms for urgency classification
 * - Detects emergency situations from conversation
 * - Provides medical alerts (allergies, medications, conditions)
 * - Recommends appropriate response timing
 */
@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  // Symptom patterns for urgency detection
  private readonly symptomPatterns: SymptomPattern[] = [
    // EMERGENCY (Level 10) - Immediate attention needed
    {
      keywords: ['severe pain', 'unbearable pain', 'extreme pain', 'worst pain'],
      urgencyLevel: 'emergency',
      urgencyScore: 10,
      recommendation: 'Schedule emergency appointment immediately',
    },
    {
      keywords: ['knocked out tooth', 'tooth fell out', 'avulsed tooth', 'lost tooth accident'],
      urgencyLevel: 'emergency',
      urgencyScore: 10,
      recommendation: 'Emergency - tooth may be saved if treated within 30 minutes',
    },
    {
      keywords: ['heavy bleeding', 'won\'t stop bleeding', 'bleeding a lot', 'uncontrolled bleeding'],
      urgencyLevel: 'emergency',
      urgencyScore: 10,
      recommendation: 'Emergency - control bleeding and see dentist immediately',
    },
    {
      keywords: ['swelling spreading', 'face swelling', 'throat swelling', 'difficulty breathing'],
      urgencyLevel: 'emergency',
      urgencyScore: 10,
      recommendation: 'Emergency - possible infection spreading, needs immediate care',
    },
    {
      keywords: ['jaw broken', 'fractured jaw', 'jaw injury', 'can\'t open mouth'],
      urgencyLevel: 'emergency',
      urgencyScore: 10,
      recommendation: 'Emergency - possible jaw fracture, needs immediate evaluation',
    },

    // URGENT (Level 7-9) - Same day or next day
    {
      keywords: ['broken tooth', 'cracked tooth', 'chipped tooth', 'tooth broke'],
      urgencyLevel: 'urgent',
      urgencyScore: 8,
      recommendation: 'Schedule within 24 hours to prevent further damage',
    },
    {
      keywords: ['abscess', 'pus', 'infection', 'swollen gum'],
      urgencyLevel: 'urgent',
      urgencyScore: 9,
      recommendation: 'Urgent - infection may spread, needs antibiotics and treatment',
    },
    {
      keywords: ['crown fell off', 'filling fell out', 'lost crown', 'lost filling'],
      urgencyLevel: 'urgent',
      urgencyScore: 7,
      recommendation: 'Schedule within 24-48 hours to protect exposed tooth',
    },
    {
      keywords: ['constant pain', 'throbbing pain', 'pain keeping me up', 'can\'t sleep'],
      urgencyLevel: 'urgent',
      urgencyScore: 8,
      recommendation: 'Schedule same day if possible for pain relief',
    },
    {
      keywords: ['fever', 'feel sick', 'swollen lymph nodes'],
      urgencyLevel: 'urgent',
      urgencyScore: 9,
      recommendation: 'Urgent - signs of spreading infection',
    },

    // SOON (Level 4-6) - Within a week
    {
      keywords: ['sensitivity', 'sensitive to cold', 'sensitive to hot', 'sensitive when eating'],
      urgencyLevel: 'soon',
      urgencyScore: 5,
      recommendation: 'Schedule within a week to evaluate cause',
    },
    {
      keywords: ['mild pain', 'slight pain', 'occasional pain', 'sometimes hurts'],
      urgencyLevel: 'soon',
      urgencyScore: 5,
      recommendation: 'Schedule within a week for evaluation',
    },
    {
      keywords: ['bleeding gums', 'gums bleed when brushing'],
      urgencyLevel: 'soon',
      urgencyScore: 4,
      recommendation: 'Schedule cleaning and gum evaluation within 1-2 weeks',
    },
    {
      keywords: ['bad breath', 'taste in mouth', 'dry mouth'],
      urgencyLevel: 'soon',
      urgencyScore: 4,
      recommendation: 'Schedule evaluation within 1-2 weeks',
    },

    // ROUTINE (Level 1-3) - Regular scheduling
    {
      keywords: ['cleaning', 'checkup', 'regular visit', 'routine'],
      urgencyLevel: 'routine',
      urgencyScore: 2,
      recommendation: 'Schedule at patient convenience',
    },
    {
      keywords: ['whitening', 'cosmetic', 'straighten', 'braces'],
      urgencyLevel: 'routine',
      urgencyScore: 1,
      recommendation: 'Schedule consultation at convenience',
    },
  ];

  // Medications that may affect dental treatment
  private readonly significantMedications = [
    { name: 'warfarin', alert: 'Blood thinner - bleeding risk during procedures' },
    { name: 'coumadin', alert: 'Blood thinner - bleeding risk during procedures' },
    { name: 'aspirin', alert: 'May increase bleeding during procedures' },
    { name: 'plavix', alert: 'Blood thinner - bleeding risk' },
    { name: 'xarelto', alert: 'Blood thinner - bleeding risk' },
    { name: 'eliquis', alert: 'Blood thinner - bleeding risk' },
    { name: 'bisphosphonates', alert: 'Risk of jaw necrosis with extractions' },
    { name: 'fosamax', alert: 'Risk of jaw necrosis with extractions' },
    { name: 'prednisone', alert: 'Steroid - may affect healing' },
    { name: 'metformin', alert: 'Diabetic - monitor blood sugar' },
    { name: 'insulin', alert: 'Diabetic - monitor blood sugar, schedule morning appointments' },
  ];

  // Conditions that require special attention
  private readonly significantConditions = [
    { name: 'diabetes', alert: 'Increased infection risk, slower healing' },
    { name: 'heart disease', alert: 'May need antibiotic prophylaxis' },
    { name: 'heart valve', alert: 'Requires antibiotic prophylaxis before procedures' },
    { name: 'pacemaker', alert: 'Avoid certain equipment' },
    { name: 'joint replacement', alert: 'May need antibiotic prophylaxis' },
    { name: 'hip replacement', alert: 'May need antibiotic prophylaxis' },
    { name: 'knee replacement', alert: 'May need antibiotic prophylaxis' },
    { name: 'immunocompromised', alert: 'Increased infection risk' },
    { name: 'hiv', alert: 'Increased infection risk, special precautions' },
    { name: 'hepatitis', alert: 'Special infection control precautions' },
    { name: 'pregnant', alert: 'Avoid X-rays, limit medications, prefer 2nd trimester' },
    { name: 'epilepsy', alert: 'Seizure precautions' },
    { name: 'anxiety', alert: 'May need sedation options discussed' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Perform triage based on patient context and current symptoms
   */
  async triagePatient(
    patientContext: PatientContext,
    currentSymptoms: string,
  ): Promise<TriageResult> {
    this.logger.log(`Triaging patient: ${patientContext.patientName || 'New patient'}`);

    // Analyze symptoms for urgency
    const symptomAnalysis = this.analyzeSymptoms(currentSymptoms);

    // Get medical alerts
    const medicalAlerts = this.generateMedicalAlerts(patientContext);

    // Check for escalation triggers
    const escalationCheck = this.checkEscalationTriggers(
      currentSymptoms,
      symptomAnalysis.urgencyLevel,
      medicalAlerts,
    );

    // Calculate estimated wait time
    const estimatedWaitTime = this.getEstimatedWaitTime(symptomAnalysis.urgencyLevel);

    const result: TriageResult = {
      urgencyLevel: symptomAnalysis.urgencyLevel,
      urgencyScore: symptomAnalysis.urgencyScore,
      reasons: symptomAnalysis.reasons,
      recommendations: symptomAnalysis.recommendations,
      medicalAlerts,
      estimatedWaitTime,
      shouldEscalate: escalationCheck.shouldEscalate,
      escalationReason: escalationCheck.reason,
    };

    this.logger.log(
      `Triage result: ${result.urgencyLevel} (score: ${result.urgencyScore}), ` +
      `${result.medicalAlerts.length} alerts, escalate: ${result.shouldEscalate}`,
    );

    return result;
  }

  /**
   * Analyze symptoms text for urgency level
   */
  private analyzeSymptoms(symptoms: string): {
    urgencyLevel: UrgencyLevel;
    urgencyScore: number;
    reasons: string[];
    recommendations: string[];
  } {
    const symptomsLower = symptoms.toLowerCase();
    let highestUrgency: UrgencyLevel = 'routine';
    let highestScore = 1;
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // Check each pattern
    for (const pattern of this.symptomPatterns) {
      for (const keyword of pattern.keywords) {
        if (symptomsLower.includes(keyword)) {
          if (pattern.urgencyScore > highestScore) {
            highestScore = pattern.urgencyScore;
            highestUrgency = pattern.urgencyLevel;
          }
          
          if (!reasons.includes(keyword)) {
            reasons.push(keyword);
          }
          
          if (!recommendations.includes(pattern.recommendation)) {
            recommendations.push(pattern.recommendation);
          }
          
          break; // Found match for this pattern
        }
      }
    }

    // Add time-based urgency factors
    if (symptomsLower.includes('getting worse') || symptomsLower.includes('spreading')) {
      highestScore = Math.min(10, highestScore + 2);
      if (highestScore >= 7) highestUrgency = 'urgent';
      if (highestScore >= 9) highestUrgency = 'emergency';
      reasons.push('Symptoms worsening/spreading');
    }

    if (symptomsLower.includes('days') || symptomsLower.includes('week')) {
      if (highestUrgency === 'routine') {
        highestUrgency = 'soon';
        highestScore = Math.max(4, highestScore);
        reasons.push('Persistent symptoms');
      }
    }

    return {
      urgencyLevel: highestUrgency,
      urgencyScore: highestScore,
      reasons: reasons.length > 0 ? reasons : ['Routine dental visit'],
      recommendations: recommendations.length > 0 ? recommendations : ['Schedule at convenience'],
    };
  }

  /**
   * Generate medical alerts from patient context
   */
  private generateMedicalAlerts(context: PatientContext): MedicalAlert[] {
    const alerts: MedicalAlert[] = [];

    // Check allergies
    for (const allergy of context.allergies) {
      const allergyLower = allergy.toLowerCase();
      
      // Critical allergies
      if (allergyLower.includes('penicillin') || allergyLower.includes('amoxicillin')) {
        alerts.push({
          type: 'allergy',
          severity: 'critical',
          message: `ALLERGY: ${allergy}`,
          details: 'Cannot prescribe penicillin-class antibiotics',
        });
      } else if (allergyLower.includes('latex')) {
        alerts.push({
          type: 'allergy',
          severity: 'critical',
          message: `ALLERGY: ${allergy}`,
          details: 'Use non-latex gloves and equipment',
        });
      } else if (allergyLower.includes('local anesthetic') || allergyLower.includes('lidocaine')) {
        alerts.push({
          type: 'allergy',
          severity: 'critical',
          message: `ALLERGY: ${allergy}`,
          details: 'Need alternative anesthetic options',
        });
      } else {
        alerts.push({
          type: 'allergy',
          severity: 'warning',
          message: `Allergy: ${allergy}`,
        });
      }
    }

    // Check medications
    for (const medication of context.medications) {
      const medLower = medication.toLowerCase();
      
      for (const sig of this.significantMedications) {
        if (medLower.includes(sig.name)) {
          alerts.push({
            type: 'medication',
            severity: 'warning',
            message: `Medication: ${medication}`,
            details: sig.alert,
          });
          break;
        }
      }
    }

    // Check conditions
    for (const condition of context.conditions) {
      const condLower = condition.toLowerCase();
      
      for (const sig of this.significantConditions) {
        if (condLower.includes(sig.name)) {
          const severity = ['heart valve', 'immunocompromised', 'pregnant'].some(c => condLower.includes(c))
            ? 'critical'
            : 'warning';
          
          alerts.push({
            type: 'condition',
            severity,
            message: `Condition: ${condition}`,
            details: sig.alert,
          });
          break;
        }
      }
    }

    // Check staff notes for alerts
    if (context.staffNotes) {
      const notesLower = context.staffNotes.toLowerCase();
      
      if (notesLower.includes('anxiety') || notesLower.includes('nervous') || notesLower.includes('phobia')) {
        alerts.push({
          type: 'note',
          severity: 'info',
          message: 'Patient has dental anxiety',
          details: 'Use gentle approach, consider sedation options',
        });
      }

      if (notesLower.includes('difficult') || notesLower.includes('gag reflex')) {
        alerts.push({
          type: 'note',
          severity: 'info',
          message: 'Patient has strong gag reflex',
          details: 'May need breaks during procedures',
        });
      }
    }

    // Check no-show history
    if (context.noShowCount >= 2) {
      alerts.push({
        type: 'note',
        severity: 'warning',
        message: `No-show history: ${context.noShowCount} missed appointments`,
        details: 'Confirm appointment 24 hours before',
      });
    }

    return alerts;
  }

  /**
   * Check if situation requires human escalation
   */
  private checkEscalationTriggers(
    symptoms: string,
    urgencyLevel: UrgencyLevel,
    alerts: MedicalAlert[],
  ): { shouldEscalate: boolean; reason?: string } {
    const symptomsLower = symptoms.toLowerCase();

    // Emergency level always escalates
    if (urgencyLevel === 'emergency') {
      return {
        shouldEscalate: true,
        reason: 'Emergency situation requires immediate human attention',
      };
    }

    // Check for specific escalation keywords
    const escalationKeywords = [
      'suicide', 'suicidal', 'kill myself',
      'chest pain', 'heart attack',
      'stroke', 'numbness face',
      'allergic reaction', 'anaphylaxis',
      'overdose',
    ];

    for (const keyword of escalationKeywords) {
      if (symptomsLower.includes(keyword)) {
        return {
          shouldEscalate: true,
          reason: `Detected keyword requiring escalation: ${keyword}`,
        };
      }
    }

    // Check for critical medical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length >= 2) {
      return {
        shouldEscalate: true,
        reason: 'Multiple critical medical alerts',
      };
    }

    // Check for explicit request for human
    if (symptomsLower.includes('speak to someone') || 
        symptomsLower.includes('talk to a person') ||
        symptomsLower.includes('real person') ||
        symptomsLower.includes('human') ||
        symptomsLower.includes('staff') ||
        symptomsLower.includes('manager')) {
      return {
        shouldEscalate: true,
        reason: 'Patient requested human assistance',
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Get estimated wait time based on urgency
   */
  private getEstimatedWaitTime(urgency: UrgencyLevel): string {
    switch (urgency) {
      case 'emergency':
        return 'Immediate - same day emergency slot';
      case 'urgent':
        return 'Within 24-48 hours';
      case 'soon':
        return 'Within 1 week';
      case 'routine':
      default:
        return 'Next available appointment (typically 1-2 weeks)';
    }
  }

  /**
   * Generate AI prompt addition for triage context
   */
  generateTriagePromptContext(result: TriageResult): string {
    const parts: string[] = [];

    // Urgency level
    parts.push(`\n## TRIAGE ASSESSMENT`);
    parts.push(`Urgency: ${result.urgencyLevel.toUpperCase()} (${result.urgencyScore}/10)`);
    parts.push(`Estimated scheduling: ${result.estimatedWaitTime}`);

    // Reasons
    if (result.reasons.length > 0) {
      parts.push(`\nIdentified concerns: ${result.reasons.join(', ')}`);
    }

    // Medical alerts
    if (result.medicalAlerts.length > 0) {
      parts.push(`\n## MEDICAL ALERTS`);
      for (const alert of result.medicalAlerts) {
        const severity = alert.severity === 'critical' ? '🔴 CRITICAL' : 
                        alert.severity === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
        parts.push(`${severity}: ${alert.message}`);
        if (alert.details) {
          parts.push(`   → ${alert.details}`);
        }
      }
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      parts.push(`\n## RECOMMENDATIONS`);
      for (const rec of result.recommendations) {
        parts.push(`• ${rec}`);
      }
    }

    // Escalation
    if (result.shouldEscalate) {
      parts.push(`\n⚠️ ESCALATION REQUIRED: ${result.escalationReason}`);
      parts.push(`→ Offer to connect patient with staff immediately`);
    }

    return parts.join('\n');
  }

  /**
   * Quick symptom check for emergency detection
   */
  isEmergency(symptoms: string): boolean {
    const symptomsLower = symptoms.toLowerCase();
    
    const emergencyPatterns = [
      'severe pain', 'unbearable', 'extreme pain',
      'knocked out', 'tooth fell out', 'avulsed',
      'heavy bleeding', 'won\'t stop bleeding',
      'swelling spreading', 'face swelling', 'throat swelling',
      'difficulty breathing', 'can\'t breathe',
      'jaw broken', 'fractured jaw',
    ];

    return emergencyPatterns.some(pattern => symptomsLower.includes(pattern));
  }

  /**
   * Get urgency level from symptoms (quick check)
   */
  getUrgencyLevel(symptoms: string): UrgencyLevel {
    const analysis = this.analyzeSymptoms(symptoms);
    return analysis.urgencyLevel;
  }
}
