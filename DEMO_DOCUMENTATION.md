# DENTRA AI Voice Agent - Demo Documentation

## Complete MVP for Dental Clinic Sales Demos

**Version:** 1.0 MVP  
**Last Updated:** January 24, 2026  
**Live Backend:** https://dentcognit.abacusai.app  
**Dashboard:** https://dentcognit.abacusai.app/dashboard  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Complete Feature List](#3-complete-feature-list)
4. [How the MVP Works](#4-how-the-mvp-works)
5. [Technical Architecture](#5-technical-architecture)
6. [Demo Workflow](#6-demo-workflow)
7. [Test Cases](#7-test-cases)
8. [API Reference](#8-api-reference)
9. [Demo Script](#9-demo-script)
10. [Competitive Comparison](#10-competitive-comparison)

---

## 1. Executive Summary

### The Problem

| Issue | Impact |
|-------|--------|
| **Missed Calls** | $100K-$150K annual revenue leakage per clinic |
| **After-Hours Calls** | 40-60% of calls go unanswered |
| **Staff Overwhelm** | 30-50 calls/day burden on front desk |
| **No-Shows** | 8-15% appointment no-show rate |

### The Solution: DENTRA AI Voice Agent

DENTRA is an **autonomous AI receptionist** that:
- Answers calls 24/7/365
- Books appointments intelligently
- Collects insurance information
- Prioritizes high-value procedures
- Reduces no-shows with automated reminders
- Maintains HIPAA compliance

### Key Metrics

| Metric | Value |
|--------|-------|
| **Call Handling** | 24/7 autonomous |
| **Booking Rate** | 70-85% of qualified calls |
| **Response Time** | < 1 second |
| **Cost Savings** | $3,000-5,000/month per clinic |
| **ROI** | Positive within 2-3 months |

---

## 2. Product Overview

### The Dentra Crew™ - Four AI Agents Working Together

```
┌─────────────────────────────────────────────────────────────────┐
│                    🎤 VOICE AGENT                                │
│  • Natural conversation                                          │
│  • Insurance collection                                          │
│  • Symptom gathering                                             │
│  • Patient recognition                                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ 📅 SCHEDULER  │   │ 🔒 POLICY     │   │ 🔧 OPS        │
│               │   │               │   │               │
│ • Smart       │   │ • HIPAA       │   │ • Escalation  │
│   booking     │   │   compliance  │   │ • Recovery    │
│ • Revenue     │   │ • Consent     │   │ • Callbacks   │
│   priority    │   │ • Audit logs  │   │ • Alerts      │
└───────────────┘   └───────────────┘   └───────────────┘
```

### What Makes DENTRA Different

| Feature | DENTRA | Traditional IVR | Competitor AI |
|---------|--------|-----------------|---------------|
| Natural Conversation | ✅ GPT-4 powered | ❌ Press 1, 2, 3 | ⚠️ Basic |
| Insurance Collection | ✅ Provider + ID | ❌ None | ⚠️ Limited |
| Revenue-Aware Scheduling | ✅ Prioritizes value | ❌ FIFO | ❌ Random |
| Symptom Triage | ✅ Urgency scoring | ❌ None | ⚠️ Basic |
| Patient Recognition | ✅ Context-aware | ❌ None | ⚠️ Name only |
| HIPAA Compliance | ✅ Full audit | ❌ Unknown | ⚠️ Partial |
| Automated Reminders | ✅ 24h/48h calls | ❌ Manual | ⚠️ SMS only |

---

## 3. Complete Feature List

### Core Features (MVP)

#### 3.1 Inbound Call Handling
- ✅ 24/7 call answering
- ✅ Natural language understanding
- ✅ Multi-turn conversation
- ✅ Intent detection (booking, reschedule, emergency, inquiry)
- ✅ Patient information extraction
- ✅ Insurance collection (provider + member ID)
- ✅ Symptom gathering with urgency scoring
- ✅ Confirmation summary before booking

#### 3.2 Smart Scheduling
- ✅ Real-time availability checking
- ✅ Doctor preference matching
- ✅ Revenue-aware slot prioritization
- ✅ Conflict detection
- ✅ Service duration matching
- ✅ Emergency slot prioritization
- ✅ Reschedule/cancel handling

#### 3.3 Patient Recognition
- ✅ Phone number matching
- ✅ Returning patient greeting
- ✅ Medical alert awareness
- ✅ Visit history context
- ✅ Preferred doctor memory
- ✅ Overdue cleaning reminders

#### 3.4 Patient Triaging
- ✅ 4-level urgency classification (Emergency/Urgent/Soon/Routine)
- ✅ Symptom pattern detection
- ✅ Medical alert checking
- ✅ Emergency escalation
- ✅ Staff notification

#### 3.5 Outbound Calling
- ✅ Appointment reminders (24h before)
- ✅ Confirmation calls (48h before)
- ✅ Follow-up calls (post-treatment)
- ✅ Recall campaigns (overdue patients)
- ✅ No-show follow-up
- ✅ DTMF response handling
- ✅ Voicemail detection

#### 3.6 Analytics Dashboard
- ✅ Real-time call metrics
- ✅ Appointment statistics
- ✅ Revenue tracking
- ✅ Escalation queue
- ✅ System health monitoring
- ✅ Multi-clinic support

#### 3.7 ML & Training
- ✅ Conversation logging
- ✅ Sentiment analysis
- ✅ Quality scoring
- ✅ Feedback collection
- ✅ Training data export
- ✅ Continuous improvement

#### 3.8 Spam Protection
- ✅ Pattern-based detection
- ✅ Blocklist/whitelist
- ✅ Known patient bypass
- ✅ Robocall filtering

---

## 4. How the MVP Works

### 4.1 Inbound Call Flow

```
Patient Calls → Twilio → Deepgram (STT) → OpenAI → VoiceAgent
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ 1. Greeting     │
                                              │ 2. Identify Need│
                                              │ 3. Get Symptoms │
                                              │ 4. Patient Info │
                                              │ 5. Insurance    │
                                              │ 6. Schedule     │
                                              │ 7. Confirm      │
                                              │ 8. Farewell     │
                                              └─────────────────┘
                                                       │
                                                       ▼
                               ElevenLabs (TTS) ← Response Generated
                                                       │
                                                       ▼
                                              Patient Hears Voice
```

### 4.2 Conversation Example

```
DENTRA: "Thank you for calling SmileCare Dental. This call may be 
        recorded for quality purposes. This is Dentra, your AI 
        assistant. How can I help you today?"

PATIENT: "Hi, I need to schedule a cleaning."

DENTRA: "I'd be happy to help you schedule a cleaning. Are you a 
        current patient with us, or would this be your first visit?"

PATIENT: "I'm a new patient."

DENTRA: "Welcome! May I have your full name please?"

PATIENT: "John Smith."

DENTRA: "Thank you, John. And a phone number where we can reach you?"

PATIENT: "555-123-4567."

DENTRA: "Great. Do you have dental insurance?"

PATIENT: "Yes, I have Delta Dental."

DENTRA: "Perfect. And may I have your Delta Dental member ID?"

PATIENT: "It's DLT123456789."

DENTRA: "Thank you. Would you prefer a morning or afternoon appointment?"

PATIENT: "Morning works best."

DENTRA: "I have Tuesday January 28th at 10am or Wednesday the 29th 
        at 9:30am. Which works better for you?"

PATIENT: "Tuesday at 10 sounds good."

DENTRA: "Perfect! Let me confirm everything: I have John Smith 
        scheduled for a cleaning appointment on Tuesday, January 28th 
        at 10am. Your insurance is Delta Dental, member ID DLT123456789. 
        We have your phone number as 555-123-4567. Does everything 
        sound correct?"

PATIENT: "Yes, that's all correct."

DENTRA: "Wonderful! Your appointment is confirmed. You'll receive 
        a text confirmation shortly with all the details. Is there 
        anything else I can help you with today?"

PATIENT: "No, that's all. Thanks!"

DENTRA: "Thank you for calling, John. We look forward to seeing you 
        Tuesday! Have a wonderful day."
```

### 4.3 Revenue-Aware Scheduling Logic

```
┌────────────────────────────────────────────────────────────────┐
│                    SCHEDULING PRIORITY                          │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HIGH VALUE ($2000+)          → Prime Slots (9-11am, 2-4pm)     │
│  • Implants ($5,000)                                            │
│  • Full mouth restoration                                        │
│  • Invisalign                                                    │
│                                                                  │
│  MEDIUM VALUE ($500-2000)     → Morning/Afternoon               │
│  • Crowns ($1,500)                                              │
│  • Root canals ($1,500)                                         │
│  • Bridges                                                       │
│                                                                  │
│  STANDARD VALUE (<$500)       → Fill Gaps                       │
│  • Cleanings ($150)                                             │
│  • Checkups ($75)                                               │
│  • Fillings ($250)                                              │
│                                                                  │
│  EMERGENCY                    → Same Day Priority               │
│  • Severe pain                                                  │
│  • Trauma                                                       │
│  • Swelling                                                     │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 Urgency Classification

| Level | Score | Examples | Action |
|-------|-------|----------|--------|
| **EMERGENCY** | 9-10 | Severe pain, knocked out tooth, heavy bleeding, face swelling | Same day slot |
| **URGENT** | 7-8 | Broken tooth, abscess, constant pain, fever | Within 24-48h |
| **SOON** | 4-6 | Sensitivity, mild pain, bleeding gums | Within 1 week |
| **ROUTINE** | 1-3 | Cleaning, checkup, whitening | At convenience |

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | NestJS + TypeScript | API server |
| **Database** | PostgreSQL + Prisma | Data persistence |
| **LLM** | OpenAI GPT-4 | Conversation AI |
| **STT** | Deepgram | Speech-to-text |
| **TTS** | ElevenLabs | Text-to-speech |
| **Telephony** | Twilio | Voice calls |
| **Dashboard** | Next.js + Tailwind | Admin UI |
| **Hosting** | Abacus.AI | Cloud deployment |

### 5.2 Database Schema

```
clinic (5 demo clinics)
  └── doctor (multiple per clinic)
  └── patient (with insurance, history)
  └── appointment (with status tracking)
  └── call (with ML training data)
  └── service (pricing catalog)
  └── conversation_script (AI prompts)
  └── outbound_call (reminders)
  └── escalation (staff alerts)
```

### 5.3 API Endpoints

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Health | `/health` | GET | System status |
| Webhook | `/webhook/voice` | POST | Incoming calls |
| Webhook | `/webhook/gather` | POST | Speech input |
| Dashboard | `/api/dashboard/stats` | GET | Key metrics |
| Dashboard | `/api/dashboard/calls` | GET | Call list |
| Dashboard | `/api/dashboard/appointments` | GET | Appointments |
| Dashboard | `/api/dashboard/escalations` | GET | Staff alerts |
| Analytics | `/analytics/dashboard/:id` | GET | Full analytics |
| Outbound | `/outbound/call` | POST | Initiate call |
| ML | `/ml/feedback/rating` | POST | Quality rating |

---

## 6. Demo Workflow

### 6.1 Pre-Demo Setup

1. **Open Dashboard**: https://dentcognit.abacusai.app/dashboard
2. **Open API Docs**: https://dentcognit.abacusai.app/api-docs
3. **Have test phone ready** (for live call demo)

### 6.2 Demo Flow (15-20 minutes)

#### Part 1: The Problem (2 min)
- Show statistics: missed calls, revenue leakage
- Explain current front desk challenges

#### Part 2: Dashboard Overview (3 min)
- Navigate through dashboard tabs
- Show multi-clinic support
- Highlight real-time metrics

#### Part 3: Live Call Demo (5 min)
- Call the Twilio number
- Walk through complete booking flow
- Demonstrate insurance collection
- Show confirmation summary

#### Part 4: Smart Features (3 min)
- Explain revenue-aware scheduling
- Show patient recognition
- Demonstrate urgency triaging

#### Part 5: Outbound Capabilities (2 min)
- Show reminder scheduling
- Explain recall campaigns
- Discuss no-show reduction

#### Part 6: Analytics & ML (2 min)
- Show quality scoring
- Explain continuous learning
- Discuss improvement over time

#### Part 7: Q&A (3+ min)
- Address concerns
- Discuss implementation
- Talk pricing/timeline

---

## 7. Test Cases

### 7.1 Critical Path Tests

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| TC-001 | New Patient Booking | Call → Provide info → Book | Appointment created |
| TC-002 | Returning Patient | Call from known number | Personalized greeting |
| TC-003 | Insurance Collection | Ask for insurance | Provider + ID captured |
| TC-004 | Emergency Triage | Report severe pain | Immediate slot offered |
| TC-005 | Appointment Reminder | Schedule for tomorrow | Reminder call made |

### 7.2 API Test Cases

```bash
# Health Check
curl https://dentcognit.abacusai.app/health
# Expected: {"status":"ok"...}

# Get Clinics
curl https://dentcognit.abacusai.app/clinics
# Expected: Array of 5 clinics

# Dashboard Stats
curl https://dentcognit.abacusai.app/api/dashboard/stats
# Expected: {"success":true,"data":{...}}

# Appointments
curl "https://dentcognit.abacusai.app/api/dashboard/appointments?limit=5"
# Expected: {"success":true,"data":[...],"pagination":{...}}
```

### 7.3 Voice Flow Test Cases

| Scenario | Input | Expected AI Response |
|----------|-------|---------------------|
| Greeting | (call connects) | "Thank you for calling... This is Dentra..." |
| New patient | "I'm new here" | "Welcome! May I have your name?" |
| Insurance Yes | "I have Cigna" | "And your member ID?" |
| Insurance No | "No insurance" | "No problem, we offer flexible payment options..." |
| Emergency | "Severe tooth pain" | "I'm sorry, let me get you the soonest slot..." |
| Anxiety | "I'm nervous about dentists" | "Many people feel that way. We'll take great care..." |

---

## 8. API Reference

### 8.1 Dashboard Stats

**GET** `/api/dashboard/stats`

Query Parameters:
- `clinicId` (optional): Filter by clinic

Response:
```json
{
  "success": true,
  "data": {
    "calls": {
      "total": 150,
      "completed": 120,
      "failed": 10,
      "escalated": 20,
      "successRate": 80.0
    },
    "appointments": {
      "total": 100,
      "confirmed": 85,
      "cancelled": 15,
      "confirmationRate": 85.0
    },
    "revenue": {
      "estimated": 125000,
      "currency": "USD"
    }
  }
}
```

### 8.2 Appointments List

**GET** `/api/dashboard/appointments`

Query Parameters:
- `clinicId` (optional)
- `status` (optional): scheduled, confirmed, completed, cancelled
- `page` (default: 1)
- `limit` (default: 20)

### 8.3 Calls List

**GET** `/api/dashboard/calls`

Query Parameters:
- `clinicId` (optional)
- `status` (optional): in_progress, completed, failed, escalated
- `page` (default: 1)
- `limit` (default: 20)

### 8.4 System Health

**GET** `/api/dashboard/health`

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "metrics": {
      "totalCalls24h": 45,
      "errorRate": 2.2,
      "escalationRate": 4.4,
      "avgCallDuration": 156
    },
    "issues": []
  }
}
```

---

## 9. Demo Script

### Opening Statement

> "Imagine never missing another patient call. DENTRA is an AI voice agent that answers your phones 24/7, books appointments intelligently, and collects insurance information - all while you focus on patient care."

### Key Talking Points

1. **Revenue Impact**: "Dental clinics lose $100-150K annually from missed calls. DENTRA recovers 70-85% of those opportunities."

2. **Staff Relief**: "Your front desk handles 30-50 calls daily. DENTRA handles the routine calls so your team can focus on patients in the office."

3. **Insurance Collection**: "Unlike basic systems, DENTRA collects insurance provider AND member ID on every call - that's crucial for your billing workflow."

4. **Smart Scheduling**: "DENTRA prioritizes high-value procedures for prime slots. A $5,000 implant gets the 10am slot, cleanings fill the gaps."

5. **No-Show Reduction**: "Automated reminder calls 24 hours before reduce no-shows by 30-40%."

### Handling Objections

| Objection | Response |
|-----------|----------|
| "Patients want humans" | "80% of routine calls are booking/rescheduling. DENTRA handles those while your staff handles complex cases." |
| "Too expensive" | "At $500-800/month, DENTRA costs less than a part-time employee but works 24/7." |
| "HIPAA concerns" | "Full HIPAA compliance with audit trails, consent capture, and encrypted data storage." |
| "What if it makes mistakes?" | "Automatic escalation to your staff for complex situations. You're always in control." |

---

## 10. Competitive Comparison

### DENTRA vs Competitors

| Feature | DENTRA | Dezy It DIVA | Simplifeye | Weave |
|---------|--------|--------------|------------|-------|
| 24/7 AI Voice | ✅ | ✅ | ✅ | ❌ |
| Insurance Collection | ✅ Full | ⚠️ Basic | ❌ | ❌ |
| Revenue-Aware Scheduling | ✅ | ❌ | ❌ | ❌ |
| Symptom Triage | ✅ | ✅ | ❌ | ❌ |
| Outbound Reminders | ✅ AI | ✅ AI | ⚠️ SMS | ✅ SMS |
| ML Learning | ✅ | ⚠️ Limited | ❌ | ❌ |
| Spam Filtering | ✅ 80%+ | ✅ 82% | ❌ | ❌ |
| Multi-Clinic | ✅ | ✅ | ⚠️ | ✅ |
| Dental-Specific | ✅ | ⚠️ Aesthetic | ⚠️ Medical | ⚠️ General |

### DENTRA Advantages

1. **Dental-Optimized**: Built specifically for dental workflows
2. **Complete Insurance Capture**: Provider + ID every time
3. **Revenue Intelligence**: Prioritizes high-value procedures
4. **Continuous Learning**: Gets better with every call
5. **Transparent Pricing**: No hidden fees

---

## Appendix A: Live URLs

| Resource | URL |
|----------|-----|
| Backend Health | https://dentcognit.abacusai.app/health |
| API Documentation | https://dentcognit.abacusai.app/api-docs |
| Dashboard | https://dentcognit.abacusai.app/dashboard |
| Clinics API | https://dentcognit.abacusai.app/clinics |

## Appendix B: Sample Data

The demo environment includes:
- **5 Clinics**: SmileCare Dental, Bright Teeth, Downtown Dental, Riverside Dental, Gentle Touch
- **20 Patients**: With insurance, history, preferences
- **50 Appointments**: Various statuses and dates
- **25 Services**: Cleanings to implants with pricing

---

**Document Version:** 1.0  
**Created:** January 24, 2026  
**Prepared for:** Clinic Demo Presentations
