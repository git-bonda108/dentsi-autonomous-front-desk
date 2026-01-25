# DENTRA - Test Cases (Simple & Clear)

## How to Test Right Now

---

## TEST 1: Dashboard is Working

**Open:** http://localhost:8501

**Check:**
- [ ] Dashboard loads
- [ ] See 6 metric cards at top (Calls, Appointments, etc.)
- [ ] Can switch between tabs
- [ ] Charts display properly
- [ ] Clinic selector works in sidebar

**Status:** ✅ Ready to test

---

## TEST 2: Backend API is Working

**Open:** https://dentcognit.abacusai.app/health

**Expected Response:**
```json
{"status":"ok","timestamp":"...","service":"DENTRA Backend"}
```

**More Tests:**

| Test | URL | Expected |
|------|-----|----------|
| Health | /health | {"status":"ok"} |
| Clinics | /clinics | Array of 5 clinics |
| Stats | /api/dashboard/stats | Appointment counts |
| Docs | /api-docs | Swagger UI |

**Status:** ✅ Ready to test

---

## TEST 3: Voice Call Flow (NEEDS TWILIO SETUP)

### What's Needed First:
1. Twilio phone number ($1/month)
2. Configure webhook URL
3. Add API keys to backend

### Once Configured - Test Script:

**Step 1: Call the Twilio number**

**Step 2: AI answers:**
> "Thank you for calling SmileCare Dental..."

**Step 3: Say:**
> "I need to schedule a cleaning"

**Step 4: AI asks questions:**
> "Are you a current patient?"
> "May I have your name?"
> "Do you have dental insurance?"

**Step 5: Verify in dashboard:**
- New patient created
- Appointment booked
- Insurance captured

**Status:** ⏳ Needs Twilio setup

---

## TEST 4: API Endpoints

### Run these in terminal:

```bash
# Test 1: Health Check
curl https://dentcognit.abacusai.app/health

# Test 2: List Clinics
curl https://dentcognit.abacusai.app/clinics

# Test 3: Dashboard Stats
curl https://dentcognit.abacusai.app/api/dashboard/stats

# Test 4: Get Appointments
curl "https://dentcognit.abacusai.app/api/dashboard/appointments?limit=5"

# Test 5: Get Calls
curl "https://dentcognit.abacusai.app/api/dashboard/calls?limit=5"
```

**Status:** ✅ Ready to test

---

## TEST 5: Dashboard Features

### Tab 1: AI Agents
- [ ] See 4 agent cards
- [ ] See 10 tool icons
- [ ] Architecture diagram displays

### Tab 2: Analytics
- [ ] Call volume chart
- [ ] Revenue chart
- [ ] Hourly distribution
- [ ] Intent pie chart
- [ ] Insurance pie chart

### Tab 3: Live Demo
- [ ] Click "Play Conversation Demo"
- [ ] See animated conversation
- [ ] Full booking flow displays

### Tab 4: Appointments
- [ ] Table shows appointments
- [ ] Real data from API
- [ ] Stats at bottom

### Tab 5: ML Predictions
- [ ] No-show predictions
- [ ] Revenue gauge
- [ ] Sentiment gauge

### Tab 6: Features
- [ ] 12 feature cards
- [ ] Comparison table
- [ ] Business impact metrics

**Status:** ✅ Ready to test

---

## TEST 6: Clinic Data

**Go to:** https://dentcognit.abacusai.app/clinics

**Verify 5 clinics exist:**
1. SmileCare Dental (New York)
2. Bright Teeth Family (Los Angeles)
3. Downtown Dental (Chicago)
4. Riverside Dental (Houston)
5. Gentle Touch Dentistry (Phoenix)

Each should have:
- [ ] Name
- [ ] Phone number
- [ ] Address
- [ ] Hours (JSON)
- [ ] Services (5 each)

**Status:** ✅ Ready to test

---

## WHAT'S WORKING vs WHAT NEEDS SETUP

| Feature | Status | What's Needed |
|---------|--------|---------------|
| Dashboard (Streamlit) | ✅ Working | Nothing |
| Backend API | ✅ Working | Nothing |
| Database | ✅ Working | Nothing |
| API Docs (Swagger) | ✅ Working | Nothing |
| Voice Agent Code | ✅ Ready | Twilio config |
| Actual Phone Calls | ⏳ Pending | Twilio number + API keys |
| SMS Confirmations | ⏳ Pending | Twilio config |
| Outbound Reminders | ⏳ Pending | Twilio config |

---

## TO ENABLE LIVE VOICE CALLS

### Step 1: Get Twilio Account
- Go to twilio.com
- Create account
- Get Account SID and Auth Token

### Step 2: Buy Phone Number
- Twilio Console → Phone Numbers → Buy
- Cost: ~$1/month
- Choose a local number

### Step 3: Configure Webhook
```
Phone Number → Configure → Voice & Fax

"A CALL COMES IN" webhook:
https://dentcognit.abacusai.app/webhook/voice

Method: HTTP POST
```

### Step 4: Add API Keys to Backend
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
```

### Step 5: Test
- Call the Twilio number
- AI should answer!

---

## QUICK DEMO CHECKLIST

For a customer demo, show these:

1. **Dashboard** (http://localhost:8501)
   - [ ] Metrics overview
   - [ ] Charts and analytics
   - [ ] Conversation demo (animated)

2. **API** (https://dentcognit.abacusai.app/api-docs)
   - [ ] Swagger documentation
   - [ ] Try some endpoints live

3. **Architecture** (show TECHNICAL_ARCHITECTURE.md)
   - [ ] Call flow diagram
   - [ ] Tech stack explanation
   - [ ] Agent breakdown

4. **Features** (Features tab in dashboard)
   - [ ] 12 feature cards
   - [ ] Competitive comparison

5. **Business Case**
   - [ ] Revenue recovery: $100-150K/year
   - [ ] Cost: $500-800/month
   - [ ] ROI: 2-3 months

---

**Test Last Updated:** January 24, 2026
