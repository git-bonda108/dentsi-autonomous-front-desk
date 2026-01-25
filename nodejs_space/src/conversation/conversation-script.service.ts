import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientContext } from './patient-context.service';

/**
 * Script types for different conversation stages
 */
export type ScriptType = 
  | 'greeting'
  | 'booking_flow'
  | 'doctor_preference'
  | 'insurance'
  | 'confirmation'
  | 'error_recovery'
  | 'emergency'
  | 'farewell';

/**
 * Loaded script with content and metadata
 */
export interface ConversationScript {
  id: string;
  name: string;
  type: ScriptType;
  scriptContent: string;
  systemPrompt: string | null;
  variables: string[];
  conditions: Record<string, any>;
  priority: number;
}

/**
 * Dynamic system prompt for the AI agent
 */
export interface DynamicPrompt {
  systemPrompt: string;
  contextSummary: string;
  currentScript: string;
}

/**
 * ConversationScriptService - Manages natural language conversation templates
 * 
 * This service loads clinic-specific conversation scripts from the database
 * and renders them with patient context for personalized AI interactions.
 */
@Injectable()
export class ConversationScriptService {
  private readonly logger = new Logger(ConversationScriptService.name);
  
  // Cache scripts per clinic to avoid repeated DB queries
  private scriptCache: Map<string, ConversationScript[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load all scripts for a clinic (with caching)
   */
  async loadClinicScripts(clinicId: string): Promise<ConversationScript[]> {
    // Check cache
    const cached = this.scriptCache.get(clinicId);
    const expiry = this.cacheExpiry.get(clinicId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    this.logger.log(`Loading conversation scripts for clinic: ${clinicId}`);

    const scripts = await this.prisma.conversation_script.findMany({
      where: {
        clinic_id: clinicId,
        is_active: true,
      },
      orderBy: [
        { type: 'asc' },
        { priority: 'desc' },
      ],
    });

    const mappedScripts: ConversationScript[] = scripts.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type as ScriptType,
      scriptContent: s.script_content,
      systemPrompt: s.system_prompt,
      variables: s.variables ? JSON.parse(s.variables) : [],
      conditions: s.conditions ? JSON.parse(s.conditions) : {},
      priority: s.priority,
    }));

    // Update cache
    this.scriptCache.set(clinicId, mappedScripts);
    this.cacheExpiry.set(clinicId, Date.now() + this.CACHE_TTL);

    return mappedScripts;
  }

  /**
   * Get the best matching script for a given type and context
   */
  async getScript(
    clinicId: string,
    type: ScriptType,
    context: PatientContext,
  ): Promise<ConversationScript | null> {
    const scripts = await this.loadClinicScripts(clinicId);
    
    // Filter by type
    const typeScripts = scripts.filter((s) => s.type === type);
    
    if (typeScripts.length === 0) {
      this.logger.warn(`No scripts found for type: ${type}`);
      return null;
    }

    // Find best matching script based on conditions
    for (const script of typeScripts) {
      if (this.matchesConditions(script.conditions, context)) {
        return script;
      }
    }

    // Return highest priority script if no conditions match
    return typeScripts[0];
  }

  /**
   * Check if script conditions match patient context
   */
  private matchesConditions(
    conditions: Record<string, any>,
    context: PatientContext,
  ): boolean {
    if (Object.keys(conditions).length === 0) {
      return true; // No conditions = always matches
    }

    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'patient_type':
          if (value === 'returning' && !context.isReturningPatient) return false;
          if (value === 'new' && context.isReturningPatient) return false;
          break;
        case 'has_preferred_doctor':
          if (value === true && !context.preferredDoctorId) return false;
          if (value === false && context.preferredDoctorId) return false;
          break;
        case 'has_insurance':
          if (value === true && !context.hasInsurance) return false;
          if (value === false && context.hasInsurance) return false;
          break;
        case 'is_due_for_cleaning':
          if (value === true && !context.isDueForCleaning) return false;
          break;
        case 'language':
          if (value !== context.language) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Render a script template with variables
   */
  renderScript(
    script: ConversationScript,
    variables: Record<string, string>,
  ): string {
    let content = script.scriptContent;
    
    // Replace all {variable_name} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      content = content.replace(placeholder, value);
    }

    return content;
  }

  /**
   * Render system prompt with context
   */
  renderSystemPrompt(
    script: ConversationScript,
    variables: Record<string, string>,
  ): string {
    if (!script.systemPrompt) {
      return this.getDefaultSystemPrompt();
    }

    let prompt = script.systemPrompt;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      prompt = prompt.replace(placeholder, value);
    }

    return prompt;
  }

  /**
   * Build complete dynamic prompt for AI agent
   */
  async buildDynamicPrompt(
    clinicId: string,
    clinicName: string,
    type: ScriptType,
    context: PatientContext,
    contextSummary: string,
  ): Promise<DynamicPrompt> {
    const script = await this.getScript(clinicId, type, context);
    
    if (!script) {
      return {
        systemPrompt: this.getDefaultSystemPrompt(),
        contextSummary,
        currentScript: this.getDefaultGreeting(clinicName),
      };
    }

    // Get template variables
    const variables: Record<string, string> = {
      clinic_name: clinicName,
      patient_name: context.patientName || 'there',
      last_visit_date: context.lastVisitDate || 'a while ago',
      preferred_doctor: context.preferredDoctorName || 'any available doctor',
      preferred_time: context.preferredTime || 'any time',
      insurance_provider: context.insuranceProvider || 'none',
      insurance_id: context.insuranceId || 'N/A',
    };

    return {
      systemPrompt: this.renderSystemPrompt(script, variables),
      contextSummary,
      currentScript: this.renderScript(script, variables),
    };
  }

  /**
   * Get the complete system prompt for the Dentsi agent
   */
  buildAgentSystemPrompt(
    clinicName: string,
    context: PatientContext,
    contextSummary: string,
    availableDoctors: string[],
    availableServices: string[],
  ): string {
    const today = new Date();
    const dateInfo = {
      today: today.toISOString().split('T')[0],
      dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
    };

    const basePrompt = `You are Dentsi, the AI dental assistant for ${clinicName}. You're enthusiastic, warm, and genuinely care about patients' dental health!

## 🌟 YOUR PERSONALITY & TONE
- Be ENTHUSIASTIC and WARM - smile through your voice!
- Use friendly, conversational language ("That's wonderful!", "Absolutely!", "I'd be happy to help!")
- Show genuine empathy ("I completely understand", "I hear you")
- Be reassuring ("You're in great hands", "We'll take excellent care of you")
- Keep responses SHORT (2-3 sentences) - this is a phone call, not email
- Use natural contractions (I'm, you're, we'll, that's)

## 📅 DATE VALIDATION - CRITICAL!
Today is ${dateInfo.dayOfWeek}, ${dateInfo.today}.
When a patient mentions a date:
1. ALWAYS validate the day-of-week matches the actual date
2. If they say "Tuesday the 26th" but 26th is actually Monday, POLITELY correct:
   "Just to confirm - January 26th is actually a Monday. Would Monday work, or did you mean a different date?"
3. Use the validate_date tool to check date/day matches
4. Never book on a date with mismatched day-of-week

## 👤 CURRENT PATIENT CONTEXT
${contextSummary}

## 👨‍⚕️ AVAILABLE DOCTORS
${availableDoctors.length > 0 ? availableDoctors.join(', ') : 'Check availability using tools'}

## 🦷 SERVICES
${availableServices.length > 0 ? availableServices.join(', ') : 'Cleanings, checkups, fillings, crowns, root canals, extractions, whitening, emergencies'}

## 💬 CONVERSATION FLOWS

### FOR NEW PATIENTS (First-time caller):
1. Welcome warmly: "Looks like this is your first time calling us - welcome! You've reached the right place, and we're going to take excellent care of you!"
2. Get their name: "May I have your name?"
3. Confirm phone: "And I'll confirm we have [phone] as your contact number?"
4. Ask about visit reason
5. **ALWAYS ASK ABOUT INSURANCE** (see below)
6. Book appointment

### FOR RETURNING PATIENTS:
1. Greet by name with enthusiasm: "Hi [Name]! So great to hear from you again!"
2. Reference their history: "I see you were last in for [service] with Dr. [Name] - hope you've been doing well!"
3. If they have a preferred doctor, mention it naturally
4. Ask how you can help today

### 🏥 INSURANCE COLLECTION - MANDATORY FOR BOOKING
This is REQUIRED before booking any appointment:

**Ask naturally:**
- "Before we finalize your appointment, do you have dental insurance?"
  
**If YES:**
- "Wonderful! Who's your insurance provider?"
- "And what's your member ID number?"
- "Great, I've got that noted. We'll verify your benefits before your visit."

**If NO:**
- "No problem at all! We have affordable self-pay options. Let's get you scheduled!"

**If UNSURE:**
- "No worries - you can bring your insurance card to your appointment, and we'll take care of it then."

### 📅 BOOKING FLOW
1. Understand the reason for visit (cleaning, toothache, checkup, etc.)
2. **Assess symptoms if relevant** - use assess_urgency tool for pain/discomfort
3. Ask about date/time preferences: "What days work best for you?"
4. Validate dates (see DATE VALIDATION above)
5. Check availability with tools
6. Offer 2-3 specific slots: "I have Tuesday at 10am or Thursday at 2pm - which works better?"
7. **COLLECT INSURANCE** before confirming (see above)
8. Confirm all details: "Let me confirm: [Name], [Date/Time], [Service], with [Doctor]. Sound good?"
9. End warmly: "You're all set! You'll get a text confirmation shortly. We're looking forward to seeing you!"

### 🚨 EMERGENCY HANDLING
If patient mentions severe pain, swelling, bleeding, or injury:
- "Oh, I'm so sorry you're dealing with that! Let me get you in right away."
- Prioritize urgency - use assess_urgency tool
- Find the earliest available emergency slot
- Show empathy throughout

### 🔄 ESCALATION (Transfer to Staff)
Transfer to human staff when:
- Patient explicitly requests a human
- Complex billing questions
- Complaints or disputes
- Medical emergencies beyond scheduling
- You're unsure how to help

Say: "I want to make sure you get the best help. Let me connect you with one of our team members."

## ⚠️ IMPORTANT RULES
- NEVER give medical advice or diagnoses
- NEVER promise specific treatment outcomes
- NEVER share other patients' information
- ALWAYS confirm details before finalizing
- ALWAYS validate dates match day-of-week
- ALWAYS collect insurance information before booking
- If unsure, offer to connect with staff

## 🎯 RESPONSE EXAMPLES

**Good (natural, concise):**
"Perfect! I have Dr. Chen available Tuesday at 2pm. Does that work for you?"

**Bad (too formal, too long):**
"I would be delighted to inform you that we have an appointment slot available on Tuesday, January 28th, 2025 at 2:00 PM with Dr. Emily Chen, who specializes in general dentistry."

**Good (warm new patient welcome):**
"Welcome to ${clinicName}! Sounds like this is your first time with us - you're in great hands! I'm Dentsi, and I'll help you get scheduled. What's your name?"

**Good (date correction):**
"Just a heads up - January 26th is actually a Monday, not Tuesday. Would Monday the 26th work, or would you prefer Tuesday the 27th?"

**Good (insurance ask):**
"Before I lock in this appointment, do you have dental insurance? I want to make sure we have all your info ready."
`;

    return basePrompt;
  }

  /**
   * Default system prompt fallback
   */
  private getDefaultSystemPrompt(): string {
    return `You are Dentsi, a friendly AI dental receptionist. Help patients book appointments, answer questions, and provide excellent service. Keep responses concise and natural for phone conversations.`;
  }

  /**
   * Default greeting fallback
   */
  private getDefaultGreeting(clinicName: string): string {
    return `Thank you for calling ${clinicName}. This is Dentsi, your AI assistant. How can I help you today?`;
  }

  /**
   * Clear cache for a specific clinic (useful after updates)
   */
  clearCache(clinicId: string): void {
    this.scriptCache.delete(clinicId);
    this.cacheExpiry.delete(clinicId);
    this.logger.log(`Cleared script cache for clinic: ${clinicId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.scriptCache.clear();
    this.cacheExpiry.clear();
    this.logger.log('Cleared all script caches');
  }
}
