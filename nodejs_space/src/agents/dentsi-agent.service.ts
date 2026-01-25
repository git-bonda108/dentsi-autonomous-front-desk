import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { PatientContextService, PatientContext } from '../conversation/patient-context.service';
import { ConversationScriptService } from '../conversation/conversation-script.service';
import { AgentToolsService, AvailableSlot, BookingConfirmation } from './tools/agent-tools.service';
import { ConversationLoggerService } from '../ml/conversation-logger.service';

/**
 * Conversation message format
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

/**
 * Tool call interface for OpenAI function calling
 */
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Agent response with potential tool calls
 */
export interface AgentResponse {
  message: string;
  toolCalls?: ToolCall[];
  shouldContinue: boolean;
  intent?: string;
  bookingConfirmation?: BookingConfirmation;
}

/**
 * Call session state
 */
export interface CallSession {
  callSid: string;
  clinicId: string;
  clinicName: string;
  patientContext: PatientContext;
  conversationHistory: ConversationMessage[];
  currentIntent: string | null;
  bookingInProgress: boolean;
  selectedSlot: AvailableSlot | null;
  createdPatientId: string | null;
}

/**
 * Tool definitions for OpenAI function calling
 */
const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'lookup_patient',
      description: 'Look up a patient by their phone number to get their history and preferences',
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description: 'Patient phone number',
          },
        },
        required: ['phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_patient',
      description: 'Create a new patient record',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Patient full name' },
          phone: { type: 'string', description: 'Patient phone number' },
          email: { type: 'string', description: 'Patient email (optional)' },
          dateOfBirth: { type: 'string', description: 'Date of birth YYYY-MM-DD (optional)' },
          insuranceProvider: { type: 'string', description: 'Insurance company name (optional)' },
          insuranceId: { type: 'string', description: 'Insurance member/policy ID (optional)' },
        },
        required: ['name', 'phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_doctors',
      description: 'Get list of available doctors at the clinic',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check available appointment slots',
      parameters: {
        type: 'object',
        properties: {
          serviceType: {
            type: 'string',
            description: 'Type of service (cleaning, checkup, filling, crown, root canal, extraction, emergency)',
          },
          preferredDate: {
            type: 'string',
            description: 'Preferred date YYYY-MM-DD (optional)',
          },
          preferredTime: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening'],
            description: 'Preferred time of day (optional)',
          },
          preferredDoctorId: {
            type: 'string',
            description: 'Preferred doctor ID (optional)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book an appointment for the patient',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
          doctorId: { type: 'string', description: 'Doctor ID' },
          dateTime: { type: 'string', description: 'Appointment date and time ISO format' },
          serviceType: { type: 'string', description: 'Type of service' },
          reason: { type: 'string', description: 'Reason for visit (optional)' },
        },
        required: ['patientId', 'doctorId', 'dateTime', 'serviceType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_appointments',
      description: 'Get patient upcoming appointments',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_patient_insurance',
      description: 'Update patient insurance information',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
          insuranceProvider: { type: 'string', description: 'Insurance company name' },
          insuranceId: { type: 'string', description: 'Member/Policy ID' },
          insuranceGroup: { type: 'string', description: 'Group number (optional)' },
        },
        required: ['patientId', 'insuranceProvider', 'insuranceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_escalation',
      description: 'Escalate to human staff when needed',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['emergency', 'complex_request', 'complaint', 'technical_issue', 'human_requested'],
            description: 'Type of escalation',
          },
          reason: { type: 'string', description: 'Reason for escalation' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority level',
          },
        },
        required: ['type', 'reason', 'priority'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_services',
      description: 'Get list of dental services offered',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_clinic_info',
      description: 'Get clinic information like hours and address',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_appointment',
      description: 'Reschedule an existing appointment to a new date/time',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'Current appointment ID' },
          newDoctorId: { type: 'string', description: 'Doctor ID for the new appointment' },
          newDateTime: { type: 'string', description: 'New appointment date/time in ISO format' },
        },
        required: ['appointmentId', 'newDoctorId', 'newDateTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancel an existing appointment',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'Appointment ID to cancel' },
          reason: { type: 'string', description: 'Reason for cancellation (optional)' },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assess_urgency',
      description: 'Assess patient symptoms for urgency level (emergency, urgent, soon, routine). Use when patient describes pain or dental issues.',
      parameters: {
        type: 'object',
        properties: {
          symptoms: { type: 'string', description: 'Description of patient symptoms or concerns' },
        },
        required: ['symptoms'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_medical_alerts',
      description: 'Get patient medical alerts including allergies, medications, and conditions',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_history',
      description: 'Get comprehensive patient history including past visits, treatments, and preferences',
      parameters: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_date',
      description: 'Validate that a date matches the specified day of week. Use this BEFORE booking when patient mentions both a day and date.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date to validate in YYYY-MM-DD format' },
          expectedDayOfWeek: { type: 'string', description: 'Expected day of week (Monday, Tuesday, etc.)' },
        },
        required: ['date', 'expectedDayOfWeek'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'parse_natural_date',
      description: 'Parse natural language date references like "next Tuesday", "January 26th", "this Friday" into actual dates',
      parameters: {
        type: 'object',
        properties: {
          dateText: { type: 'string', description: 'Natural language date text' },
        },
        required: ['dateText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_sentiment',
      description: 'Analyze patient sentiment and speech clarity to adjust conversation tone',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Patient speech text to analyze' },
        },
        required: ['text'],
      },
    },
  },
];

/**
 * DentsiAgentService - Main AI Agent Orchestrator
 * 
 * This is the brain of DENTSI, implementing the OpenAI Agents SDK pattern:
 * - Multi-turn conversation handling
 * - Tool/function calling for database operations
 * - Context injection from patient history
 * - Handoff to specialized sub-agents if needed
 */
@Injectable()
export class DentsiAgentService {
  private readonly logger = new Logger(DentsiAgentService.name);
  private readonly openai: OpenAI;
  private sessions: Map<string, CallSession> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly patientContextService: PatientContextService,
    private readonly scriptService: ConversationScriptService,
    private readonly tools: AgentToolsService,
    private readonly conversationLogger: ConversationLoggerService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Initialize a new call session
   */
  async initializeSession(
    callSid: string,
    clinicId: string,
    callerPhone: string,
  ): Promise<{ session: CallSession; greeting: string }> {
    this.logger.log(`Initializing session for call: ${callSid}`);

    // Get clinic info
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new Error(`Clinic not found: ${clinicId}`);
    }

    // Build patient context
    const patientContext = await this.patientContextService.buildContextFromPhone(
      callerPhone,
      clinicId,
    );

    // Get available doctors and services for context
    const [doctors, services] = await Promise.all([
      this.prisma.doctor.findMany({
        where: { clinic_id: clinicId, is_active: true },
      }),
      this.prisma.service.findMany({
        where: { clinic_id: clinicId, is_active: true },
      }),
    ]);

    // Build system prompt with full context
    const contextSummary = this.patientContextService.generateContextSummary(patientContext);
    const systemPrompt = this.scriptService.buildAgentSystemPrompt(
      clinic.name,
      patientContext,
      contextSummary,
      doctors.map((d) => `${d.name} (${d.specialty})`),
      services.map((s) => s.service_name),
    );

    // Create session
    const session: CallSession = {
      callSid,
      clinicId,
      clinicName: clinic.name,
      patientContext,
      conversationHistory: [
        { role: 'system', content: systemPrompt },
      ],
      currentIntent: null,
      bookingInProgress: false,
      selectedSlot: null,
      createdPatientId: patientContext.patientId,
    };

    this.sessions.set(callSid, session);

    // Start conversation logging for ML training
    this.conversationLogger.startCall(
      callSid,
      clinicId,
      callerPhone,
      patientContext.patientId,
    );

    // Log system prompt
    this.conversationLogger.logTurn(callSid, 'system', systemPrompt);

    // Generate greeting based on patient type
    const greeting = await this.generateGreeting(session);

    // Add greeting to history
    session.conversationHistory.push({
      role: 'assistant',
      content: greeting,
    });

    return { session, greeting };
  }

  /**
   * Generate personalized greeting with full context awareness
   */
  private async generateGreeting(session: CallSession): Promise<string> {
    const { patientContext, clinicName } = session;

    if (patientContext.isReturningPatient) {
      // Use first name if available
      const firstName = patientContext.patientName?.split(' ')[0] || patientContext.patientName;
      let greeting = `Hi ${firstName}! So wonderful to hear from you again! This is Dentsi at ${clinicName}.`;
      
      // Priority 1: Upcoming appointments (might be calling about existing appointment)
      if (patientContext.upcomingAppointments.length > 0) {
        const next = patientContext.upcomingAppointments[0];
        greeting += ` I see you have a ${next.service} coming up on ${next.date} at ${next.time}`;
        if (next.doctorName) {
          greeting += ` with ${next.doctorName}`;
        }
        greeting += `. Are you calling about that, or is there something else I can help with today?`;
      }
      // Priority 2: Quote their last visit history
      else if (patientContext.lastVisitDate) {
        greeting += ` I see you were last in`;
        if (patientContext.treatmentHistory && patientContext.treatmentHistory.length > 0) {
          const lastTreatment = patientContext.treatmentHistory[0];
          greeting += ` for a ${lastTreatment}`;
        }
        greeting += ` - hope you've been doing well!`;
        
        // Check if due for cleaning
        if (patientContext.isDueForCleaning) {
          const monthsAgo = patientContext.lastVisitDaysAgo 
            ? Math.floor(patientContext.lastVisitDaysAgo / 30) 
            : 6;
          greeting += ` It's been about ${monthsAgo} months - would you like to schedule your next cleaning`;
          if (patientContext.preferredDoctorName) {
            greeting += ` with ${patientContext.preferredDoctorName}`;
          }
          greeting += `?`;
        } else {
          greeting += ` What can I help you with today?`;
        }
      }
      // Priority 3: Has preferred doctor (personalize)
      else if (patientContext.preferredDoctorName) {
        greeting += ` I see you usually see ${patientContext.preferredDoctorName}. What can I help you with today?`;
      }
      // Default
      else {
        greeting += ` What can I help you with today?`;
      }
      
      return greeting;
    } else {
      // New patient - EXTRA warm welcome
      return `Hello and welcome to ${clinicName}! This is Dentsi, your AI dental assistant. ` +
             `Looks like this is your first time calling us - you've reached the right place, ` +
             `and we're going to take excellent care of you! May I have your name?`;
    }
  }

  /**
   * Process user input and generate response
   */
  async processUserInput(callSid: string, userMessage: string): Promise<AgentResponse> {
    const session = this.sessions.get(callSid);
    
    if (!session) {
      this.logger.error(`No session found for call: ${callSid}`);
      return {
        message: "I apologize, but I'm having trouble with our connection. Could you please call back?",
        shouldContinue: false,
      };
    }

    // Add user message to history
    session.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Log user message for ML training
    const sentiment = this.conversationLogger.analyzeSentiment(userMessage);
    const intent = this.conversationLogger.detectIntent(userMessage);
    this.conversationLogger.logTurn(callSid, 'user', userMessage, {
      sentiment,
      intent,
    });

    try {
      // Call OpenAI with tools
      const startTime = Date.now();
      const response = await this.runAgentLoop(session);
      const latencyMs = Date.now() - startTime;
      
      // Add assistant response to history
      session.conversationHistory.push({
        role: 'assistant',
        content: response.message,
      });

      // Log assistant response for ML training
      this.conversationLogger.logTurn(callSid, 'assistant', response.message, {
        latencyMs,
      });

      return response;
    } catch (error) {
      this.logger.error(`Error processing input: ${error.message}`);
      return {
        message: "I apologize, I'm having some technical difficulties. Let me connect you with our staff.",
        shouldContinue: false,
      };
    }
  }

  /**
   * Main agent loop - handles tool calls iteratively
   */
  private async runAgentLoop(session: CallSession): Promise<AgentResponse> {
    const maxIterations = 5; // Prevent infinite loops
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Prepare messages for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = 
        session.conversationHistory.map((msg) => {
          if (msg.role === 'tool') {
            return {
              role: 'tool' as const,
              content: msg.content,
              tool_call_id: msg.tool_call_id!,
            };
          }
          return {
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          };
        });

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4',
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 300, // Keep responses concise for voice
      });

      const assistantMessage = completion.choices[0].message;

      // Check if there are tool calls to process
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        this.logger.log(`Processing ${assistantMessage.tool_calls.length} tool calls`);

        // Add assistant message with tool calls to history (for context)
        session.conversationHistory.push({
          role: 'assistant',
          content: assistantMessage.content || '',
        });

        // Process each tool call
        for (const tc of assistantMessage.tool_calls) {
          // Cast to our ToolCall interface
          const toolCall = tc as unknown as ToolCall;
          const toolStartTime = Date.now();
          const toolResult = await this.executeTool(session, toolCall);
          const toolLatency = Date.now() - toolStartTime;
          
          // Log tool call for ML training
          const toolArgs = JSON.parse(toolCall.function.arguments);
          this.conversationLogger.logToolCall(
            session.callSid,
            toolCall.function.name,
            toolArgs,
            toolResult,
            toolLatency,
          );
          
          // Add tool result to history
          session.conversationHistory.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
          });
        }

        // Continue the loop to get the next response
        continue;
      }

      // No tool calls - we have a final response
      const responseText = assistantMessage.content || "I'm here to help. What would you like to do?";
      
      // Check for booking confirmation in response
      let bookingConfirmation: BookingConfirmation | undefined;
      if (session.bookingInProgress && responseText.toLowerCase().includes('booked')) {
        // Extract booking info if available
        // This would be populated during book_appointment tool execution
      }

      return {
        message: responseText,
        shouldContinue: true,
        intent: session.currentIntent || undefined,
        bookingConfirmation,
      };
    }

    // Max iterations reached
    this.logger.warn(`Max iterations reached for call: ${session.callSid}`);
    return {
      message: "Let me connect you with our staff to complete your request.",
      shouldContinue: false,
    };
  }

  /**
   * Execute a tool call
   */
  private async executeTool(session: CallSession, toolCall: ToolCall): Promise<any> {
    const { name, arguments: argsString } = toolCall.function;
    const args = JSON.parse(argsString);

    this.logger.log(`Executing tool: ${name} with args: ${argsString}`);

    switch (name) {
      case 'lookup_patient':
        return this.tools.lookupPatient(args.phone, session.clinicId);

      case 'create_patient': {
        const result = await this.tools.createPatient(
          session.clinicId,
          args.name,
          args.phone,
          args.email,
          args.dateOfBirth,
          args.insuranceProvider,
          args.insuranceId,
        );
        if (result.success && result.data) {
          session.createdPatientId = result.data.patientId;
        }
        return result;
      }

      case 'get_doctors':
        return this.tools.getDoctors(session.clinicId);

      case 'check_availability': {
        session.bookingInProgress = true;
        return this.tools.checkAvailability(
          session.clinicId,
          args.serviceType,
          args.preferredDate,
          args.preferredTime,
          args.preferredDoctorId || session.patientContext.preferredDoctorId || undefined,
        );
      }

      case 'book_appointment': {
        const result = await this.tools.bookAppointment(
          session.clinicId,
          args.patientId || session.createdPatientId || session.patientContext.patientId!,
          args.doctorId,
          args.dateTime,
          args.serviceType,
          args.reason,
          session.callSid,
        );
        if (result.success) {
          session.bookingInProgress = false;
        }
        return result;
      }

      case 'get_upcoming_appointments':
        return this.tools.getUpcomingAppointments(
          args.patientId || session.patientContext.patientId!,
        );

      case 'update_patient_insurance':
        return this.tools.updatePatientInsurance(
          args.patientId || session.patientContext.patientId!,
          args.insuranceProvider,
          args.insuranceId,
          args.insuranceGroup,
        );

      case 'create_escalation':
        return this.tools.createEscalation(
          session.clinicId,
          session.callSid,
          args.type,
          args.reason,
          args.priority,
          session.conversationHistory.map((m) => `${m.role}: ${m.content}`).join('\n'),
        );

      case 'get_services':
        return this.tools.getServices(session.clinicId);

      case 'get_clinic_info':
        return this.tools.getClinicInfo(session.clinicId);

      case 'reschedule_appointment':
        return this.tools.rescheduleAppointment(
          args.appointmentId,
          args.newDoctorId,
          args.newDateTime,
        );

      case 'cancel_appointment':
        return this.tools.cancelAppointment(
          args.appointmentId,
          args.reason,
        );

      case 'assess_urgency':
        return this.tools.assessUrgency(
          session.patientContext,
          args.symptoms,
        );

      case 'get_medical_alerts':
        return this.tools.getMedicalAlerts(
          args.patientId || session.patientContext.patientId!,
        );

      case 'get_patient_history':
        return this.tools.getPatientHistory(
          args.patientId || session.patientContext.patientId!,
        );

      case 'validate_date':
        return this.validateDate(args.date, args.expectedDayOfWeek);

      case 'parse_natural_date':
        return this.parseNaturalDate(args.dateText);

      case 'analyze_sentiment':
        return this.analyzeSentiment(args.text);

      default:
        this.logger.warn(`Unknown tool: ${name}`);
        return { success: false, error: 'Unknown tool', message: 'Tool not found' };
    }
  }

  /**
   * End a call session
   */
  async endSession(callSid: string, duration: number): Promise<void> {
    const session = this.sessions.get(callSid);
    
    if (!session) {
      return;
    }

    this.logger.log(`Ending session for call: ${callSid}, duration: ${duration}s`);

    // Determine outcome
    const outcome = this.determineCallOutcome(session);

    // Save call record with full transcript
    try {
      const transcript = session.conversationHistory
        .filter((m) => m.role !== 'system' && m.role !== 'tool')
        .map((m) => `${m.role === 'assistant' ? 'Dentsi' : 'Patient'}: ${m.content}`)
        .join('\n');

      await this.prisma.call.upsert({
        where: { call_sid: callSid },
        create: {
          call_sid: callSid,
          clinic_id: session.clinicId,
          patient_id: session.patientContext.patientId,
          caller_phone: session.patientContext.phone,
          transcript,
          duration,
          status: 'completed',
          intent: session.currentIntent,
          outcome,
        },
        update: {
          transcript,
          duration,
          status: 'completed',
          intent: session.currentIntent,
          outcome,
        },
      });

      // End conversation logging (persists to conversation_log table)
      await this.conversationLogger.endCall(callSid, outcome, {
        appointmentBooked: session.bookingInProgress,
        patientCreated: session.createdPatientId !== session.patientContext.patientId,
      });

    } catch (error) {
      this.logger.error(`Failed to save call record: ${error.message}`);
    }

    // Clean up session
    this.sessions.delete(callSid);
  }

  /**
   * Determine call outcome based on conversation
   */
  private determineCallOutcome(session: CallSession): 'booked' | 'rescheduled' | 'cancelled' | 'escalated' | 'inquiry_answered' | 'abandoned' | 'spam' {
    // Check conversation for outcome indicators
    const lastMessages = session.conversationHistory.slice(-5);
    const combinedContent = lastMessages.map(m => m.content).join(' ').toLowerCase();

    if (session.bookingInProgress || combinedContent.includes('appointment has been booked')) {
      return 'booked';
    }
    if (combinedContent.includes('rescheduled')) {
      return 'rescheduled';
    }
    if (combinedContent.includes('cancelled') || combinedContent.includes('canceled')) {
      return 'cancelled';
    }
    if (combinedContent.includes('escalat') || combinedContent.includes('transfer')) {
      return 'escalated';
    }
    
    return 'inquiry_answered';
  }

  /**
   * Get session (for webhook service)
   */
  getSession(callSid: string): CallSession | undefined {
    return this.sessions.get(callSid);
  }

  /**
   * Validate that a date matches the expected day of week
   */
  private validateDate(dateStr: string, expectedDayOfWeek: string): any {
    try {
      const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
      const actualDayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const isValid = actualDayOfWeek.toLowerCase() === expectedDayOfWeek.toLowerCase();

      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (isValid) {
        return {
          success: true,
          isValid: true,
          date: dateStr,
          dayOfWeek: actualDayOfWeek,
          formattedDate,
          message: `${formattedDate} - date and day match correctly.`,
        };
      } else {
        // Find the correct date for the expected day
        const suggestions = this.findNextDayOfWeek(expectedDayOfWeek, date);
        return {
          success: true,
          isValid: false,
          date: dateStr,
          actualDayOfWeek,
          expectedDayOfWeek,
          formattedDate,
          message: `${dateStr} is actually a ${actualDayOfWeek}, not ${expectedDayOfWeek}.`,
          suggestion: `Did you mean ${suggestions.formattedDate}?`,
          suggestedDate: suggestions.date,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid date format',
        message: 'Please provide date in YYYY-MM-DD format',
      };
    }
  }

  /**
   * Find the next occurrence of a day of week
   */
  private findNextDayOfWeek(dayName: string, referenceDate: Date): { date: string; formattedDate: string } {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    if (targetDay === -1) {
      return { date: '', formattedDate: 'invalid day' };
    }

    const result = new Date(referenceDate);
    const currentDay = result.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntilTarget);

    return {
      date: result.toISOString().split('T')[0],
      formattedDate: result.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }

  /**
   * Parse natural language date references
   */
  private parseNaturalDate(dateText: string): any {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
    
    const text = dateText.toLowerCase().trim();

    // Today/Tomorrow
    if (text.includes('today')) {
      return this.formatDateResult(today);
    }
    if (text.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return this.formatDateResult(tomorrow);
    }

    // Next [day] or This [day]
    const dayMatch = text.match(/(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const isNext = dayMatch[1].toLowerCase() === 'next';
      const targetDay = dayMatch[2].toLowerCase();
      const result = this.getNextDayOccurrence(targetDay, isNext);
      return this.formatDateResult(result);
    }

    // [day] alone
    const singleDayMatch = text.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
    if (singleDayMatch) {
      const result = this.getNextDayOccurrence(singleDayMatch[1].toLowerCase(), false);
      return this.formatDateResult(result);
    }

    // Month day (January 26th, Jan 26)
    const monthDayMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})/i);
    if (monthDayMatch) {
      const months: Record<string, number> = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11,
      };
      const month = months[monthDayMatch[1].toLowerCase()];
      const day = parseInt(monthDayMatch[2]);
      const year = today.getFullYear();
      const result = new Date(year, month, day, 12, 0, 0);
      
      // If date is in the past, assume next year
      if (result < today) {
        result.setFullYear(year + 1);
      }
      
      return this.formatDateResult(result);
    }

    return {
      success: false,
      error: 'Could not parse date',
      message: `I couldn't understand "${dateText}". Could you give me a specific date like "January 28th" or "next Tuesday"?`,
    };
  }

  /**
   * Get next occurrence of a day of week
   */
  private getNextDayOccurrence(dayName: string, nextWeek: boolean): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const targetDay = days.indexOf(dayName);
    const currentDay = today.getDay();
    
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || nextWeek) {
      daysToAdd += 7;
    }
    if (nextWeek && daysToAdd <= 7) {
      daysToAdd += 7;
    }

    const result = new Date(today);
    result.setDate(result.getDate() + daysToAdd);
    return result;
  }

  /**
   * Format date result for tool response
   */
  private formatDateResult(date: Date): any {
    return {
      success: true,
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedDate: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      message: `Parsed date: ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
    };
  }

  /**
   * Analyze patient sentiment and speech patterns
   */
  private analyzeSentiment(text: string): any {
    const lowerText = text.toLowerCase();

    // Sentiment indicators
    const positiveWords = ['thank', 'great', 'perfect', 'wonderful', 'excellent', 'good', 'happy', 'pleased', 'appreciate'];
    const negativeWords = ['frustrated', 'angry', 'upset', 'terrible', 'horrible', 'awful', 'bad', 'hate', 'annoyed', 'disappointed'];
    const anxiousWords = ['nervous', 'scared', 'worried', 'anxious', 'afraid', 'fear', 'pain', 'hurt'];
    const urgentWords = ['emergency', 'urgent', 'asap', 'immediately', 'severe', 'bleeding', 'swollen', 'unbearable'];
    const confusedWords = ['confused', 'don\'t understand', 'what do you mean', 'sorry', 'pardon', 'repeat'];

    // Count matches
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
    const anxiousCount = anxiousWords.filter(w => lowerText.includes(w)).length;
    const urgentCount = urgentWords.filter(w => lowerText.includes(w)).length;
    const confusedCount = confusedWords.filter(w => lowerText.includes(w)).length;

    // Determine primary sentiment
    let sentiment = 'neutral';
    let confidence = 0.5;
    let recommendation = 'Continue with normal conversational tone.';

    if (urgentCount > 0) {
      sentiment = 'urgent';
      confidence = 0.9;
      recommendation = 'Show empathy and prioritize getting them help quickly. Use calming, reassuring language.';
    } else if (anxiousCount > 0) {
      sentiment = 'anxious';
      confidence = 0.8;
      recommendation = 'Be extra reassuring and gentle. Say things like "You\'re in great hands" and "We\'ll take excellent care of you."';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      confidence = 0.7;
      recommendation = 'Acknowledge their frustration. Consider offering to transfer to staff if they seem very upset.';
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive';
      confidence = 0.7;
      recommendation = 'Match their positive energy! Be upbeat and enthusiastic.';
    } else if (confusedCount > 0) {
      sentiment = 'confused';
      confidence = 0.7;
      recommendation = 'Slow down, speak clearly, and offer to repeat or clarify. Ask simpler questions.';
    }

    // Speech clarity assessment
    const wordCount = text.split(/\s+/).length;
    const avgWordLength = text.replace(/\s+/g, '').length / wordCount;
    const hasCompleteThought = text.length > 10 && (text.includes(' ') || text.includes(','));

    return {
      success: true,
      sentiment,
      confidence,
      recommendation,
      speechClarity: {
        wordCount,
        isComplete: hasCompleteThought,
        clarity: hasCompleteThought ? 'clear' : 'unclear',
      },
      indicators: {
        positive: positiveCount,
        negative: negativeCount,
        anxious: anxiousCount,
        urgent: urgentCount,
        confused: confusedCount,
      },
    };
  }
}
