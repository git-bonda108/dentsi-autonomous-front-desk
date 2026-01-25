# DENTRA - Technical Architecture & Workflow

## FOR CUSTOMER DEMOS - How It Actually Works

---

## 1. THE BIG PICTURE - What is DENTRA?

DENTRA is an **AI receptionist** that answers phone calls for dental clinics.

**What it does:**
- Patient calls clinic phone number
- AI answers (not a human)
- AI has a natural conversation
- AI books the appointment
- AI collects insurance info
- Appointment appears in the system

**Result:** Clinic never misses a call. 24/7 coverage.

---

## 2. TECH STACK - What Technologies We Use

```
┌─────────────────────────────────────────────────────────────────┐
│                        DENTRA TECH STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  TELEPHONY         │  Twilio                                     │
│  (Phone Calls)     │  - Receives incoming calls                  │
│                    │  - Makes outgoing calls (reminders)         │
│                    │  - Streams audio both ways                  │
│                                                                   │
│  SPEECH-TO-TEXT    │  Deepgram                                   │
│  (Voice → Text)    │  - Converts patient speech to text          │
│                    │  - Real-time transcription                  │
│                    │  - < 300ms latency                          │
│                                                                   │
│  AI BRAIN          │  OpenAI GPT-4 + Agents SDK                  │
│  (Understanding)   │  - Understands what patient wants           │
│                    │  - Decides what to say back                 │
│                    │  - Calls functions (book, lookup, etc.)     │
│                                                                   │
│  TEXT-TO-SPEECH    │  ElevenLabs                                 │
│  (Text → Voice)    │  - Converts AI response to natural voice    │
│                    │  - Sounds like real human                   │
│                    │  - Multiple voice options                   │
│                                                                   │
│  BACKEND           │  NestJS + TypeScript                        │
│  (Logic)           │  - Handles all business logic               │
│                    │  - Connects all services together           │
│                    │  - REST API for dashboard                   │
│                                                                   │
│  DATABASE          │  PostgreSQL + Prisma                        │
│  (Storage)         │  - Stores patients, appointments, calls     │
│                    │  - Clinic data, doctor schedules            │
│                    │  - Conversation logs for ML training        │
│                                                                   │
│  DASHBOARD         │  Streamlit / Next.js                        │
│  (Visibility)      │  - View appointments, calls, stats          │
│                    │  - Multi-clinic management                  │
│                    │  - Analytics and reports                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. CALL FLOW - Exactly What Happens When Patient Calls

### Step-by-Step (with timing):

```
TIME        WHAT HAPPENS                                WHERE
─────────────────────────────────────────────────────────────────
0:00        Patient dials clinic number                 Phone
            ↓
0:01        Twilio receives call                        Twilio Cloud
            Twilio sends webhook to our server
            ↓
0:02        Our server receives call info               DENTRA Backend
            - Caller phone number
            - Clinic being called
            ↓
0:02        Check if known patient                      Database
            - Lookup phone number in patients table
            - Load patient history if found
            ↓
0:03        Generate greeting                           OpenAI GPT-4
            - If known: "Hi Sarah! Welcome back..."
            - If new: "Thank you for calling..."
            ↓
0:03        Convert greeting to speech                  ElevenLabs
            ↓
0:04        Patient hears greeting                      Phone
            ↓
0:05        Patient speaks                              Phone
            ↓
0:06        Twilio captures audio                       Twilio Cloud
            ↓
0:06        Deepgram transcribes speech → text          Deepgram
            ↓
0:07        Text sent to AI                             OpenAI GPT-4
            AI understands intent:
            - "new_appointment"
            - "reschedule"
            - "emergency"
            - "inquiry"
            ↓
0:08        AI decides response                         OpenAI GPT-4
            May call functions:
            - lookup_patient()
            - check_availability()
            - book_appointment()
            ↓
0:09        AI response converted to speech             ElevenLabs
            ↓
0:10        Patient hears AI response                   Phone
            ↓
            ... conversation continues ...
            ↓
2:00-3:00   Call ends                                   Twilio
            - Appointment created in database
            - Call transcript saved
            - Confirmation SMS sent to patient
```

---

## 4. THE AI AGENTS - How They Work Together

### We have 4 specialized AI agents:

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCOMING CALL                                  │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    🎤 VOICE AGENT                                │
│                                                                   │
│  WHAT IT DOES:                                                   │
│  • Greets the patient                                            │
│  • Understands what they want (intent detection)                 │
│  • Asks follow-up questions                                      │
│  • Collects patient info (name, phone, DOB)                      │
│  • Collects insurance (provider + member ID)                     │
│  • Gathers symptoms if needed                                    │
│  • Confirms all details before booking                           │
│                                                                   │
│  EXAMPLE:                                                         │
│  Patient: "I need a cleaning"                                    │
│  Agent detects: intent = "new_appointment"                       │
│  Agent asks: "Are you a current patient?"                        │
│                                                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 📅 SCHEDULER    │ │ 🔒 POLICY       │ │ 🔧 OPS          │
│    AGENT        │ │    AGENT        │ │    AGENT        │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│                 │ │                 │ │                 │
│ WHAT IT DOES:   │ │ WHAT IT DOES:   │ │ WHAT IT DOES:   │
│                 │ │                 │ │                 │
│ • Finds open    │ │ • Records       │ │ • Handles       │
│   appointment   │ │   consent       │ │   errors        │
│   slots         │ │                 │ │                 │
│                 │ │ • HIPAA         │ │ • Escalates     │
│ • Matches       │ │   compliance    │ │   to staff      │
│   doctor pref   │ │                 │ │                 │
│                 │ │ • Audit logs    │ │ • Schedules     │
│ • Prioritizes   │ │                 │ │   callbacks     │
│   high-value    │ │ • Data          │ │                 │
│   procedures    │ │   protection    │ │ • Sends alerts  │
│                 │ │                 │ │                 │
│ • Creates       │ │                 │ │                 │
│   booking       │ │                 │ │                 │
│                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 5. DATABASE - What Data We Store

```
TABLES IN DATABASE:
───────────────────

clinic
├── id, name, phone, address, hours
├── Each dental clinic location
└── Example: "SmileCare Dental, +1555123456"

doctor
├── id, name, specialty, available_hours
├── Doctors at each clinic
└── Example: "Dr. Chen, General Dentistry, Mon-Fri 9-5"

patient
├── id, name, phone, email, date_of_birth
├── insurance_provider, insurance_id
├── medical_history, preferred_doctor
└── Example: "Sarah Johnson, Delta Dental, DLT123456"

appointment
├── id, patient_id, doctor_id, date, time
├── service_type, status, notes
└── Example: "Cleaning, Jan 28 10am, Dr. Chen, Scheduled"

call
├── id, call_sid, caller_phone, transcript
├── intent, outcome, duration, sentiment
└── Example: "Call from +1555234567, 2:34 duration, booked"

service
├── id, name, duration, price
└── Example: "Root Canal, 120 min, $1500"
```

---

## 6. CONVERSATION EXAMPLE - Full Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PATIENT CALLS: +1-555-123-4567 → SmileCare Dental               │
└─────────────────────────────────────────────────────────────────┘

DENTRA: "Thank you for calling SmileCare Dental. This call may be 
         recorded for quality purposes. This is Dentra, your AI 
         assistant. How can I help you today?"

         ▼ [Voice Agent: Greeting delivered]

PATIENT: "Hi, I need to schedule a cleaning."

         ▼ [Deepgram: Transcribed speech]
         ▼ [Voice Agent: Detected intent = "new_appointment"]

DENTRA: "I'd be happy to help you schedule a cleaning! Are you a 
         current patient with us, or would this be your first visit?"

PATIENT: "I'm a new patient."

         ▼ [Voice Agent: isNewPatient = true]

DENTRA: "Welcome! May I have your full name please?"

PATIENT: "Sarah Johnson."

         ▼ [Voice Agent: Extracted name = "Sarah Johnson"]

DENTRA: "Thank you, Sarah. And a phone number where we can reach you?"

PATIENT: "555-234-5678."

         ▼ [Voice Agent: Extracted phone = "555-234-5678"]

DENTRA: "Great! Do you have dental insurance?"

         ▼ [Voice Agent: Asking for insurance - CRITICAL STEP]

PATIENT: "Yes, I have Delta Dental."

         ▼ [Voice Agent: insuranceProvider = "Delta Dental"]

DENTRA: "Perfect. And may I have your Delta Dental member ID?"

PATIENT: "It's DLT98765432."

         ▼ [Voice Agent: insuranceId = "DLT98765432"]
         ▼ [Scheduler Agent: Check availability]

DENTRA: "Would you prefer a morning or afternoon appointment?"

PATIENT: "Morning works best."

         ▼ [Scheduler Agent: Filter for morning slots]

DENTRA: "I have Tuesday January 28th at 10am or Wednesday the 29th 
         at 9:30am. Which works better for you?"

PATIENT: "Tuesday at 10 sounds great."

         ▼ [Scheduler Agent: book_appointment() called]
         ▼ [Database: Appointment created]

DENTRA: "Perfect! Let me confirm everything:
         
         I have Sarah Johnson scheduled for a cleaning appointment 
         on Tuesday, January 28th at 10am.
         
         Your insurance is Delta Dental, member ID DLT98765432.
         We have your phone number as 555-234-5678.
         
         Does everything sound correct?"

         ▼ [Voice Agent: Full confirmation before finalizing]

PATIENT: "Yes, that's correct!"

         ▼ [Policy Agent: Consent recorded]
         ▼ [Ops Agent: Schedule SMS confirmation]

DENTRA: "Wonderful! Your appointment is confirmed. You'll receive a 
         text confirmation shortly. Is there anything else I can 
         help you with today?"

PATIENT: "No, that's all. Thanks!"

DENTRA: "Thank you for calling, Sarah. We look forward to seeing 
         you Tuesday! Have a wonderful day."

         ▼ [Call ends]
         ▼ [Database: Call logged with transcript]
         ▼ [SMS sent: Confirmation to patient]
         ▼ [Reminder scheduled: 24h before appointment]

┌─────────────────────────────────────────────────────────────────┐
│ RESULT:                                                          │
│ • Patient: Sarah Johnson (NEW)                                   │
│ • Appointment: Cleaning, Tue Jan 28, 10am                        │
│ • Insurance: Delta Dental (DLT98765432)                          │
│ • Call Duration: 2 min 34 sec                                    │
│ • Outcome: BOOKED                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. HOW TO SET UP FOR A CLINIC (Implementation)

### Step 1: Get a Phone Number
```
1. Create Twilio account
2. Buy a phone number (+1-XXX-XXX-XXXX)
3. Cost: ~$1/month + $0.01/minute
```

### Step 2: Configure Webhook
```
In Twilio Console:
Phone Number → Configure → Voice → Webhook URL:
https://your-backend.com/webhook/voice
```

### Step 3: Connect Services
```
Required API Keys:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- OPENAI_API_KEY
- DEEPGRAM_API_KEY
- ELEVENLABS_API_KEY
```

### Step 4: Add Clinic Data
```
1. Create clinic in database
2. Add doctors with schedules
3. Add services with pricing
4. Import existing patients (optional)
```

### Step 5: Go Live
```
1. Patient calls the Twilio number
2. DENTRA answers automatically
3. Appointments appear in dashboard
```

---

## 8. WHAT'S WORKING NOW (Current Status)

| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ LIVE | https://dentcognit.abacusai.app |
| Database | ✅ LIVE | 5 clinics, 50 appointments seeded |
| Voice Agent Logic | ✅ CODE READY | Intent detection, insurance collection |
| Scheduler Agent | ✅ CODE READY | Availability checking, booking |
| Dashboard | ✅ LIVE | Streamlit at localhost:8501 |
| Twilio Integration | ⏳ NEEDS PHONE | Need to buy/configure Twilio number |
| Deepgram | ⏳ NEEDS API KEY | Need to add key to .env |
| ElevenLabs | ⏳ NEEDS API KEY | Need to add key to .env |

### To Make a Live Call Work:
1. Buy Twilio phone number ($1/month)
2. Add API keys to backend
3. Point Twilio webhook to backend
4. Call the number - AI answers!

---

## 9. OUTBOUND CALLS - Reminders & Follow-ups

```
AUTOMATED OUTBOUND CALLS:
─────────────────────────

24 HOURS BEFORE APPOINTMENT:
┌─────────────────────────────────────────────────────────────────┐
│ DENTRA calls patient automatically:                              │
│                                                                   │
│ "Hi Sarah, this is Dentra calling from SmileCare Dental.        │
│  I'm calling to remind you about your cleaning appointment       │
│  tomorrow at 10am with Dr. Chen.                                 │
│                                                                   │
│  Press 1 to confirm.                                             │
│  Press 2 to reschedule."                                         │
│                                                                   │
│ Patient presses 1 → Appointment confirmed                        │
│ Patient presses 2 → "When would work better for you?"            │
└─────────────────────────────────────────────────────────────────┘

RECALL CAMPAIGNS (Overdue Patients):
┌─────────────────────────────────────────────────────────────────┐
│ For patients who haven't visited in 6+ months:                   │
│                                                                   │
│ "Hi John, this is Dentra from SmileCare Dental.                 │
│  It's been about 8 months since your last cleaning.             │
│  Regular checkups are important for your dental health.          │
│                                                                   │
│  Press 1 to book an appointment.                                 │
│  Press 2 for a callback from our staff."                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. ANALYTICS - How We Measure Success

```
DASHBOARD METRICS:
──────────────────

📞 CALL METRICS
├── Total Calls: How many calls received
├── Booking Rate: % of calls that became appointments
├── Avg Duration: How long calls take
├── Escalation Rate: % sent to human staff
└── Spam Filtered: % of robocalls blocked

📅 APPOINTMENT METRICS
├── Total Booked: Appointments created by AI
├── Confirmation Rate: % confirmed via reminder
├── No-Show Rate: % who missed appointment
├── Cancellation Rate: % cancelled
└── Revenue Estimate: Based on service prices

👥 PATIENT METRICS
├── New Patients: First-time callers
├── Returning Patients: Recognized by phone
├── Insurance Breakdown: By provider
└── Overdue for Cleaning: 6+ months since visit

🎯 AI QUALITY METRICS
├── Sentiment Score: Patient happiness (-1 to +1)
├── Intent Accuracy: Correct understanding
├── Response Time: How fast AI responds
└── First-Call Resolution: Handled without escalation
```

---

## 11. DIAGRAM - Complete System Architecture

```
                         ┌─────────────────┐
                         │   PATIENT       │
                         │   PHONE CALL    │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    TWILIO       │
                         │  (Cloud Phone)  │
                         │                 │
                         │ Receives call   │
                         │ Streams audio   │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌─────────────────┐         ┌─────────────────┐
           │   DEEPGRAM      │         │   ELEVENLABS    │
           │ (Speech→Text)   │         │ (Text→Speech)   │
           │                 │         │                 │
           │ Patient voice   │         │ AI response     │
           │ becomes text    │         │ becomes voice   │
           └────────┬────────┘         └────────▲────────┘
                    │                           │
                    ▼                           │
           ┌────────────────────────────────────┴────────┐
           │              DENTRA BACKEND                  │
           │                (NestJS)                      │
           │                                              │
           │  ┌──────────────────────────────────────┐   │
           │  │         OPENAI AGENTS SDK             │   │
           │  │                                       │   │
           │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │
           │  │  │ Voice   │ │Scheduler│ │ Policy  │ │   │
           │  │  │ Agent   │ │ Agent   │ │ Agent   │ │   │
           │  │  └────┬────┘ └────┬────┘ └────┬────┘ │   │
           │  │       │          │          │       │   │
           │  │       └──────────┼──────────┘       │   │
           │  │                  │                   │   │
           │  │           ┌──────┴──────┐           │   │
           │  │           │  Ops Agent  │           │   │
           │  │           └─────────────┘           │   │
           │  └──────────────────────────────────────┘   │
           │                    │                        │
           │                    ▼                        │
           │         ┌──────────────────┐               │
           │         │   TOOL FUNCTIONS │               │
           │         │                  │               │
           │         │ • lookup_patient │               │
           │         │ • book_appointment│              │
           │         │ • check_availability│            │
           │         │ • update_insurance│              │
           │         └─────────┬────────┘               │
           │                   │                        │
           └───────────────────┼────────────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   POSTGRESQL    │
                      │   (Database)    │
                      │                 │
                      │ • Patients      │
                      │ • Appointments  │
                      │ • Calls         │
                      │ • Doctors       │
                      │ • Clinics       │
                      └────────┬────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   DASHBOARD     │
                      │  (Streamlit)    │
                      │                 │
                      │ View all data   │
                      │ Analytics       │
                      │ Manage clinics  │
                      └─────────────────┘
```

---

## 12. COST BREAKDOWN

| Service | Cost | Notes |
|---------|------|-------|
| Twilio Phone Number | $1/month | Per clinic |
| Twilio Voice | $0.013/min | Inbound calls |
| OpenAI GPT-4 | ~$0.03/call | Avg 500 tokens |
| Deepgram | $0.0043/min | Speech-to-text |
| ElevenLabs | ~$0.01/call | Text-to-speech |
| PostgreSQL | $0-50/month | Depends on hosting |
| Backend Hosting | $20-100/month | Depends on scale |

**Total per call: ~$0.05-0.10**  
**For 1000 calls/month: ~$50-100**

---

## 13. DEMO SCRIPT FOR CUSTOMERS

### Opening (30 seconds):
> "DENTRA is an AI receptionist that answers your phones 24/7. When a patient calls, the AI has a natural conversation, collects their information and insurance, and books the appointment - all automatically."

### Show Dashboard (1 minute):
> "Here's our dashboard. You can see all appointments booked by AI, call analytics, and patient data across all your locations."

### Explain the Technology (1 minute):
> "Here's how it works: Patient calls your number. Twilio receives the call. We convert their voice to text using Deepgram. Our AI powered by GPT-4 understands what they need. Then we convert the AI's response back to natural speech using ElevenLabs. The whole thing takes less than a second."

### Key Differentiators (1 minute):
> "What makes DENTRA different:
> 1. We collect full insurance information - provider AND member ID
> 2. We prioritize high-value procedures for your best appointment slots
> 3. We recognize returning patients and remember their preferences
> 4. We triage emergencies and get them same-day slots"

### ROI (30 seconds):
> "Dental clinics lose $100-150K annually from missed calls. DENTRA recovers 70-85% of that. At $500/month, you'll see positive ROI within 2-3 months."

---

## 14. TEST CASES - What to Test

### Test Case 1: New Patient Booking
```
CALL THE NUMBER AND SAY:
"I need to schedule a cleaning. I'm a new patient. My name is 
John Smith. My phone is 555-123-4567. I have Cigna insurance, 
member ID CIG123456. Morning works best."

EXPECTED:
✓ AI greets you
✓ AI asks for name, phone
✓ AI asks about insurance (provider AND ID)
✓ AI offers appointment slots
✓ AI confirms all details before booking
✓ Appointment appears in dashboard
```

### Test Case 2: Returning Patient
```
CALL FROM A KNOWN PHONE NUMBER

EXPECTED:
✓ AI recognizes: "Hi Sarah! Welcome back..."
✓ AI mentions last visit or preferred doctor
✓ Faster booking flow (already has info)
```

### Test Case 3: Emergency
```
SAY: "I have severe tooth pain, it's really bad"

EXPECTED:
✓ AI detects urgency
✓ AI prioritizes same-day appointment
✓ AI shows empathy: "I'm sorry you're in pain..."
```

### Test Case 4: Reschedule
```
SAY: "I need to reschedule my appointment"

EXPECTED:
✓ AI finds existing appointment
✓ AI offers alternative times
✓ AI updates the booking
```

---

## 15. SUMMARY - What DENTRA Does

```
PROBLEM                          SOLUTION
─────────────────────────────────────────────────────────────────
Missed calls = Lost revenue  →   AI answers 24/7
Staff overwhelmed           →   AI handles routine calls
No after-hours coverage     →   AI works nights/weekends
Patients forget appointments →  AI makes reminder calls
Insurance info missing      →   AI collects provider + ID
High no-show rates          →   AI confirms appointments
```

---

**Document Version:** 1.0  
**For:** Customer Demos  
**Last Updated:** January 24, 2026
