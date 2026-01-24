# DENTRA - MVP Features Document

**AI Voice Agent for Automated Dental Appointment Booking**

---

## 🎯 MVP SCOPE (Current Release)

### **1. Inbound Call Handling via Twilio**

**Feature:** Patients call a dedicated Twilio phone number and interact with AI voice agent

- Patient dials clinic's Twilio number
- AI agent answers immediately with personalized greeting
- Natural conversation flow using voice recognition
- Handles multiple concurrent calls simultaneously
- 24/7 availability (after-hours, weekends, holidays)

**What this does:** Eliminates missed calls and ensures every patient inquiry is captured, even when staff is unavailable.

---

### **2. Caller ID & Patient Recognition**

**Feature:** Automatic identification of returning patients based on phone number

- **Returning Patient Flow:**
  - System matches caller's phone number against patient database
  - AI greets patient by name: "Hi Sarah, welcome back to Smile Dental!"
  - Loads patient's complete history into conversation context
  - References last visit, upcoming appointments, preferences

- **New Patient Flow:**
  - System identifies caller as new patient
  - AI provides welcoming first-time greeting
  - Collects basic information (name, phone, reason for visit)
  - Creates new patient record in database

**What this does:** Creates personalized experience for returning patients while efficiently onboarding new patients.

---

### **3. Patient History Retrieval & Context**

**Feature:** AI accesses patient's complete history during conversation

**Information Available to AI:**
- Previous visits and treatment history
- Upcoming scheduled appointments
- Doctor preferences
- Insurance information
- Medical notes and allergies
- Past appointment patterns (preferred times, no-show history)

**Conversation Examples:**
- "I see you had a cleaning 6 months ago. Ready for your next one?"
- "You usually prefer morning appointments with Dr. Smith. Would you like the same?"
- "Your insurance is active with Delta Dental. We'll verify coverage."

**What this does:** Enables AI to have informed, contextual conversations rather than starting from scratch each time.

---

### **4. Insurance Verification**

**Feature:** AI collects and validates insurance information during call

**Workflow:**

**A. Patient Has Insurance:**
- AI asks: "Do you have dental insurance?"
- Patient provides insurance company name and ID
- AI logs insurance details to patient record
- AI confirms: "Great! We have your Delta Dental information. Our staff will verify coverage before your appointment."
- **Appointment booking proceeds**

**B. Patient Doesn't Have Insurance:**
- AI asks: "Do you have dental insurance?"
- Patient says "No" or "I'm not sure"
- AI responds: "No problem! Our staff will discuss payment options when you arrive. Let's get you scheduled."
- **Appointment booking proceeds** (insurance is not a blocker)

**C. Insurance ID Not Available:**
- Patient says: "Yes, but I don't have my card with me"
- AI responds: "That's okay! A staff member will help you with insurance details later. Let's book your appointment now."
- **Appointment booking proceeds**
- Staff follows up before appointment for insurance verification

**What this does:** Collects insurance information when available but never blocks appointment booking. Ensures patients get scheduled regardless of insurance status.

---

### **5. Doctor Preference Handling**

**Feature:** AI honors patient's doctor preferences during scheduling

**Workflow:**

**A. Returning Patient with Saved Preference:**
- System loads patient's preferred doctor from database
- AI offers: "Would you like to see Dr. Smith again? You saw her last time."
- If yes → Search availability for Dr. Smith
- If no → Ask which doctor they'd prefer

**B. Patient Requests Specific Doctor:**
- Patient says: "I'd like to see Dr. Johnson"
- AI searches Dr. Johnson's available appointment slots
- Presents options: "Dr. Johnson has availability on Tuesday at 2 PM or Thursday at 10 AM"

**C. No Doctor Preference:**
- Patient says: "Any doctor is fine" or "I don't have a preference"
- AI searches availability across all doctors
- Presents first available slots with doctor names
- Example: "We have Tuesday 3 PM with Dr. Martinez or Wednesday 11 AM with Dr. Kim"

**D. Preferred Doctor Not Available:**
- AI checks preferred doctor's schedule first
- If no slots in patient's timeframe:
  - AI: "Dr. Smith is fully booked this week. Would you like to wait for her next availability, or see another doctor sooner?"
  - Patient chooses: wait or see another doctor

**What this does:** Respects patient-doctor relationships while ensuring flexible scheduling options.

---

### **6. Intelligent Appointment Scheduling**

**Feature:** AI books appointments in real-time with clinic's calendar system

**Capabilities:**
- Checks real-time availability across all doctors
- Handles multiple appointment types (cleaning, checkup, emergency, consultation)
- Suggests available time slots based on patient preferences
- Handles rescheduling and cancellations
- Sends confirmation details

**Conversation Flow:**
1. AI asks: "What type of appointment do you need?" (cleaning, exam, pain, etc.)
2. Patient specifies reason for visit
3. AI asks: "Do you prefer morning or afternoon? Any specific day?"
4. Patient provides preferences
5. AI checks availability and offers 2-3 options
6. Patient selects preferred slot
7. AI confirms: "Perfect! You're booked for Tuesday, January 21st at 2 PM with Dr. Smith for a cleaning."
8. Appointment saved to database

**What this does:** Converts phone calls directly into confirmed appointments without human intervention.

---

### **7. AI-Powered Conversation Flow**

**Feature:** Natural language understanding and multi-turn conversations

**AI Capabilities:**
- Speech-to-text conversion (Deepgram)
- Natural language understanding (OpenAI GPT-4)
- Text-to-speech synthesis (ElevenLabs)
- Context retention across conversation
- Error handling and clarification requests

**Conversation Scenarios AI Handles:**

**A. Appointment Booking:**
- "I need a cleaning"
- "My tooth hurts"
- "I'd like to schedule a checkup"

**B. Information Requests:**
- "What are your hours?"
- "Do you accept my insurance?"
- "How much does a cleaning cost?"

**C. Existing Appointment Management:**
- "I need to reschedule my appointment"
- "When is my next appointment?"
- "I need to cancel"

**D. Complex Scenarios:**
- Multiple questions in one call
- Changing mind mid-conversation
- Requesting callback from staff

**What this does:** Provides human-like conversation experience that understands context and handles complex interactions.

---

### **8. Human Escalation Workflow**

**Feature:** AI recognizes when to transfer to human staff

**Escalation Triggers:**
- Patient requests to speak with staff
- Emergency dental situations (severe pain, injury, bleeding)
- Complex insurance questions AI cannot answer
- Complaints or sensitive issues
- Technical issues preventing booking
- Questions outside AI's knowledge base

**Escalation Process:**
1. AI recognizes escalation trigger
2. AI: "I'll connect you with a staff member who can help. Please hold."
3. Creates escalation ticket in dashboard
4. Logs conversation details for staff context
5. Transfers call or schedules callback

**What this does:** Ensures patients always get appropriate help while maximizing AI automation for routine tasks.

---

### **9. Real-Time Dashboard & Monitoring**

**Feature:** Web-based dashboard for clinic staff to monitor AI agent activity

**Dashboard Views:**

**A. Overview Stats:**
- Total calls received today
- Appointments booked
- Success rate percentage
- Active escalations requiring attention

**B. Appointments List:**
- All booked appointments
- Filter by status (confirmed, pending, cancelled)
- Filter by clinic location
- Sort by date/time
- View appointment details

**C. Call Log:**
- Complete list of all incoming calls
- Call duration
- Outcome (booked, escalated, information only)
- Full conversation transcript
- Audio recording playback

**D. Escalations Dashboard:**
- Active issues requiring staff attention
- Escalation type and priority
- Patient information
- AI conversation context
- Resolve/close actions

**E. Clinic Management:**
- Manage multiple clinic locations
- View stats per location
- Switch between clinics

**F. System Health:**
- API status monitoring
- Error rate tracking
- Service uptime

**What this does:** Provides complete visibility into AI agent performance and enables staff to manage operations efficiently.

---

### **10. Multi-Clinic Support**

**Feature:** Single platform supports multiple dental clinic locations

- Each clinic has dedicated Twilio phone number
- Separate calendars and staff for each location
- Unified dashboard view across all locations
- Filter/switch between clinics in dashboard
- Independent service menus and pricing per clinic

**What this does:** Enables dental groups and multi-location practices to centralize operations.

---

### **11. Complete Call Workflow (End-to-End)**

**Feature:** Complete patient journey from call to confirmed appointment

**Step-by-Step Flow:**

1. **Call Initiated**
   - Patient dials Twilio number
   - System receives call webhook

2. **Caller Identification**
   - System checks phone number against patient database
   - Loads patient history if found
   - Creates new patient record if not found

3. **AI Greeting**
   - Returning patient: "Hi [Name], welcome back to [Clinic]!"
   - New patient: "Thank you for calling [Clinic]. I'm the AI assistant. How can I help?"

4. **Conversation & Intent Recognition**
   - AI listens to patient request
   - Identifies intent (book appointment, ask question, reschedule, etc.)
   - Asks clarifying questions

5. **Patient History Review** (if returning patient)
   - AI mentions last visit
   - References upcoming appointments
   - Notes doctor preferences

6. **Insurance Collection**
   - AI asks about insurance
   - Logs information if provided
   - Proceeds regardless of insurance status

7. **Appointment Type Selection**
   - AI asks reason for visit
   - Patient specifies (cleaning, pain, checkup, etc.)
   - AI selects appropriate appointment duration

8. **Doctor Preference Handling**
   - AI checks if patient has preferred doctor
   - Offers preferred doctor's availability
   - Shows alternatives if needed

9. **Time Slot Selection**
   - AI asks patient's preferred day/time
   - Searches real-time availability
   - Presents 2-3 options
   - Patient selects preferred slot

10. **Booking Confirmation**
    - AI confirms all details
    - Saves appointment to database
    - Provides confirmation: "You're all set! [Date], [Time], [Doctor], [Service]"

11. **Call Completion**
    - AI asks if patient needs anything else
    - Provides clinic contact information if needed
    - Ends call gracefully

12. **Post-Call Updates**
    - Appointment appears in dashboard immediately
    - Staff can view call transcript and recording
    - Patient record updated with new appointment

**What this does:** Delivers complete automated booking experience from first ring to confirmed appointment.

---

## 📋 OUT OF SCOPE (Next Release)

### **Features Planned for Future Releases:**

1. **Outbound Calling**
   - AI calls patients for appointment reminders
   - Confirmation calls 24 hours before appointment
   - Recall campaigns for overdue patients
   - Post-treatment follow-up calls

2. **SMS & Email Integration**
   - Text confirmations after booking
   - Email confirmations with calendar invite
   - Reminder texts 24 hours before appointment
   - Two-way SMS conversations

3. **Practice Management System Integration**
   - Direct sync with Dentrix
   - Integration with Open Dental
   - Curve Dental connectivity
   - Real-time two-way calendar sync

4. **Advanced Analytics**
   - Detailed revenue reports
   - Conversion funnel analysis
   - Patient behavior insights
   - AI performance trends over time

5. **Machine Learning Enhancements**
   - Fine-tuned AI model on clinic's conversations
   - Continuous learning from interactions
   - A/B testing of conversation strategies
   - Personalized response optimization

6. **Screen Pop Notifications**
   - Real-time caller info displayed to staff
   - Desktop/browser notifications for incoming calls
   - Patient profile pop-up during call
   - WebSocket-based live updates

7. **HIPAA Compliance Certification**
   - Formal SOC 2 Type II certification
   - Third-party security audit
   - Complete audit logging system
   - Business Associate Agreements

8. **Payment Processing**
   - Collect payment over phone
   - Copay collection at booking
   - Integration with Stripe/Square
   - Payment plan setup

9. **Multi-Language Support**
   - Spanish language conversations
   - Additional language options
   - Auto-detection of caller's language

10. **Voice Biometrics**
    - Patient authentication via voice
    - Enhanced security for sensitive operations
    - Fraud prevention

---

## 🛠️ TECHNOLOGY STACK

### **Voice & AI Services**
- **Twilio Programmable Voice** - Inbound call handling, telephony infrastructure
- **Deepgram** - Speech-to-text (STT) conversion, real-time transcription
- **OpenAI GPT-4** - Natural language understanding, conversation intelligence
- **ElevenLabs** - Text-to-speech (TTS) synthesis, natural-sounding voice

### **Backend**
- **NestJS** - TypeScript backend framework
- **Node.js** - Runtime environment
- **PostgreSQL** - Relational database
- **Prisma ORM** - Database management and migrations

### **Frontend Dashboard**
- **Next.js** - React framework for dashboard
- **React** - UI component library
- **Tailwind CSS** - Styling framework
- **Recharts** - Data visualization

### **Infrastructure**
- **Abacus AI Platform** - Cloud hosting and deployment
- **WebSocket (Socket.io)** - Real-time dashboard updates (future)
- **REST API** - Backend communication

### **Architecture Pattern**
- **Multi-Agent AI System** - 4 specialized agents:
  - **Voice Agent** - Handles speech and conversation
  - **Scheduler Agent** - Manages appointment booking logic
  - **Policy Agent** - Enforces business rules and policies
  - **Ops Agent** - Handles escalations and monitoring

---

**Document Purpose:** External socialization and stakeholder communication  
**Version:** 1.0  
**Date:** January 16, 2026  
**Status:** MVP Scope Definition
