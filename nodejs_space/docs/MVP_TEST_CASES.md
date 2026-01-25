# DENTSI MVP - Test Cases

## Overview

This document outlines all test cases for the DENTSI AI Voice Agent MVP. Tests are organized by feature area and priority.

---

## 1. INBOUND CALL FLOW

### TC-001: New Patient Call
**Priority:** Critical  
**Preconditions:** Clinic exists with phone number configured

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call clinic number from unknown phone | Call connects, TwiML returned |
| 2 | System greets caller | Generic greeting: "Thank you for calling..." |
| 3 | Ask for name | AI asks "May I have your name please?" |
| 4 | Provide name "John Smith" | AI confirms and asks for phone |
| 5 | Request appointment | AI offers available slots |
| 6 | Select slot | Appointment created, confirmation given |
| 7 | End call | Call logged, transcript saved |

### TC-002: Returning Patient Call
**Priority:** Critical  
**Preconditions:** Patient exists with phone number

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call from known patient phone | Call connects, patient recognized |
| 2 | System greets by name | "Hi [FirstName]! Welcome back..." |
| 3 | If overdue for cleaning | AI mentions: "It's been X months..." |
| 4 | If has upcoming appointment | AI mentions: "I see you have an appointment..." |
| 5 | Request booking | AI uses preferred doctor if set |

### TC-003: Emergency Call
**Priority:** Critical  
**Preconditions:** Patient describes emergency symptoms

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Patient says "severe pain" | Urgency detected as EMERGENCY |
| 2 | AI triages | Immediate scheduling offered |
| 3 | If after hours | Escalation created, staff notified |

### TC-004: Spam Call Detection
**Priority:** High  
**Preconditions:** None

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call from blocklisted number | Call blocked with polite message |
| 2 | Caller mentions "extended warranty" | Spam detected, call logged |
| 3 | Multiple rapid calls from same number | Flagged as suspicious |

---

## 2. APPOINTMENT SCHEDULING

### TC-010: Book New Appointment
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request cleaning appointment | AI offers available slots |
| 2 | Specify preferred day | Slots filtered to that day |
| 3 | Request specific doctor | AI checks doctor availability |
| 4 | Confirm slot | Appointment created |
| 5 | Provide insurance info | Insurance stored on patient record |
| 6 | End call | Confirmation provided, reminder scheduled |

### TC-011: Reschedule Appointment
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "I need to reschedule" | AI looks up upcoming appointments |
| 2 | Confirm which appointment | AI finds alternative slots |
| 3 | Select new slot | Appointment updated |
| 4 | Conflict detected | AI offers alternatives |

### TC-012: Cancel Appointment
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "I need to cancel" | AI confirms which appointment |
| 2 | Confirm cancellation | Appointment cancelled |
| 3 | AI offers to reschedule | Patient can book new time |

### TC-013: Doctor Preference
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "I want to see Dr. Smith" | AI checks Dr. Smith's availability |
| 2 | Dr. Smith unavailable | AI offers similar doctors |
| 3 | Patient insists | AI shows next available with Dr. Smith |

### TC-014: Conflict Detection
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request slot already booked | AI detects conflict |
| 2 | AI suggests alternatives | Alternative slots offered |
| 3 | Double-booking attempted | System prevents duplicate |

---

## 3. PATIENT TRIAGING

### TC-020: Routine Request
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "I need a cleaning" | Urgency: ROUTINE |
| 2 | Normal scheduling flow | Standard 1-2 week availability |

### TC-021: Urgent Request
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "My tooth broke" | Urgency: URGENT |
| 2 | Prioritized scheduling | Same-day or next-day slots offered |

### TC-022: Emergency Request
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "Severe pain, swelling" | Urgency: EMERGENCY |
| 2 | Medical alerts checked | Allergies/medications noted |
| 3 | Immediate action | Same-day emergency slot or escalation |

### TC-023: Medical Alert Handling
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Patient has penicillin allergy | Alert flagged in context |
| 2 | Patient on blood thinners | Alert shown to AI |
| 3 | AI acknowledges in conversation | "I see you have allergies on file..." |

---

## 4. OUTBOUND CALLS

### TC-030: Appointment Reminder (24h)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Appointment scheduled for tomorrow | Reminder call scheduled |
| 2 | Reminder time reached | Outbound call initiated |
| 3 | Patient presses 1 | Appointment confirmed |
| 4 | Patient presses 2 | Reschedule requested, staff notified |

### TC-031: Confirmation Call (48h)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | New appointment booked | Confirmation scheduled for 48h before |
| 2 | Call made | Patient confirms or reschedules |

### TC-032: No-Show Follow-up
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Patient misses appointment | Status updated to no_show |
| 2 | Follow-up scheduled | Call made 24h later |
| 3 | Patient answers | Offered reschedule |
| 4 | No-show count incremented | Patient record updated |

### TC-033: Recall Campaign
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Patient overdue 6+ months | Listed in recall report |
| 2 | Campaign triggered | Recall call scheduled |
| 3 | Patient presses 1 | Booking requested, staff follows up |

### TC-034: Voicemail Detection
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Outbound call made | Twilio machine detection enabled |
| 2 | Voicemail detected | Appropriate message left |
| 3 | Call marked as voicemail | Status updated |

---

## 5. ML & ANALYTICS

### TC-040: Conversation Logging
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call starts | Logging initiated |
| 2 | Each turn captured | User/assistant messages logged |
| 3 | Tool calls logged | Function calls with args/results |
| 4 | Call ends | Full transcript persisted |

### TC-041: Sentiment Analysis
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Positive message | Sentiment > 0 |
| 2 | Negative message | Sentiment < 0 |
| 3 | Neutral message | Sentiment ≈ 0 |

### TC-042: Intent Detection
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "Book appointment" | Intent: booking |
| 2 | "Cancel my visit" | Intent: cancellation |
| 3 | "My tooth hurts" | Intent: report_symptom |

### TC-043: Quality Rating
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Staff submits rating | Rating stored |
| 2 | Correction submitted | Original and corrected saved |
| 3 | Quality score calculated | Components scored 0-100 |

### TC-044: Training Export
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Export requested | JSONL file created |
| 2 | Quality filter applied | Only 4+ rated calls included |
| 3 | Corrections applied | Corrected responses used |

---

## 6. ANALYTICS DASHBOARD

### TC-050: Call Analytics
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request call analytics | Volume, duration, outcomes returned |
| 2 | Filter by period | Data filtered correctly |
| 3 | Trend data included | Daily/weekly trends |

### TC-051: Appointment Analytics
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request appointment analytics | Bookings, cancellations, no-shows |
| 2 | Revenue estimates | Calculated from service prices |
| 3 | Popular times shown | Peak hours/days identified |

### TC-052: Patient Analytics
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request patient analytics | Total, new, active counts |
| 2 | Overdue patients listed | 6+ months since visit |
| 3 | Insurance breakdown | By provider |

---

## 7. API VALIDATION

### TC-060: Webhook Validation
**Priority:** Critical

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/webhook/voice` | POST | TwiML response |
| `/webhook/gather` | POST | TwiML response |
| `/webhook/end` | POST | 200 OK |
| `/webhook/status` | POST | 200 OK |
| `/webhook/outbound` | POST | TwiML response |

### TC-061: Analytics API
**Priority:** High

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/analytics/calls/:clinicId` | GET | CallAnalytics |
| `/analytics/appointments/:clinicId` | GET | AppointmentAnalytics |
| `/analytics/dashboard/:clinicId` | GET | Full dashboard |
| `/analytics/spam/check` | POST | SpamCheckResult |

### TC-062: ML API
**Priority:** Medium

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/ml/feedback/rating` | POST | Feedback created |
| `/ml/feedback/correction` | POST | Correction saved |
| `/ml/export` | POST | JSONL file path |
| `/ml/suggestions/:clinicId` | GET | Improvement list |

### TC-063: Outbound API
**Priority:** Medium

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/outbound/call` | POST | Call initiated |
| `/outbound/pending/:clinicId` | GET | Pending calls |
| `/outbound/recall-campaign` | POST | Campaign started |

---

## 8. INTEGRATION TESTS

### TC-070: Full Booking Flow
**Priority:** Critical

```
1. Incoming call from new patient
2. Collect patient info (name, phone)
3. Create patient record
4. Check doctor availability
5. Book appointment
6. Schedule reminder
7. End call
8. Verify: Patient created, appointment created, reminder scheduled
```

### TC-071: Full Reschedule Flow
**Priority:** High

```
1. Incoming call from existing patient
2. Patient requests reschedule
3. Identify appointment
4. Find new slot
5. Update appointment
6. Update reminders
7. Verify: Appointment updated, old reminder cancelled, new scheduled
```

### TC-072: Emergency Escalation Flow
**Priority:** High

```
1. Incoming call with emergency symptoms
2. Triage as emergency
3. Check for same-day slots
4. If none: Create escalation
5. Transfer or callback offered
6. Verify: Escalation created, priority=critical
```

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Database seeded with test data
- [ ] All environment variables configured
- [ ] Twilio webhook URLs configured
- [ ] OpenAI API key valid
- [ ] ElevenLabs API key valid
- [ ] Deepgram API key valid

### Critical Path Tests (Must Pass)
- [ ] TC-001: New Patient Call
- [ ] TC-002: Returning Patient Call
- [ ] TC-010: Book New Appointment
- [ ] TC-030: Appointment Reminder
- [ ] TC-060: Webhook Validation
- [ ] TC-070: Full Booking Flow

### Smoke Test (Quick Validation)
1. `GET /health` → 200 OK
2. `POST /webhook/voice` → Valid TwiML
3. `GET /analytics/dashboard/:clinicId` → Dashboard data
4. `POST /analytics/spam/check` → Spam result

---

## Known Limitations (MVP)

1. **Voice Synthesis**: Using Twilio's built-in voices (Polly.Joanna) for MVP, ElevenLabs integration ready but commented for cost
2. **Real-time STT**: Deepgram integration ready, currently using Twilio's built-in STT
3. **Multi-language**: English only for MVP
4. **SMS**: Not implemented in MVP (can be added)
5. **Payment Integration**: Not in scope for MVP
