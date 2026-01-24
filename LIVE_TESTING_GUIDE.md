# 🧪 LIVE TESTING GUIDE - Call Dentra AI & See Results in Dashboard

## 🎯 WHAT YOU'LL TEST

This guide walks you through **ACTUALLY CALLING** the Dentra AI system and watching the appointment appear in the dashboard in real-time.

**Complete Flow:**
1. You call a phone number
2. Dentra AI answers and talks to you
3. You request an appointment
4. AI books it automatically
5. You check the dashboard and SEE the appointment

**Duration:** 10-15 minutes for complete setup + testing

---

## ✅ PREREQUISITES CHECK

### **1. Backend is Running** ✅
- URL: `https://dentra-backend-zlxaiu.abacusai.app`
- Test: Open https://dentra-backend-zlxaiu.abacusai.app/health
- Should return: `{"status":"ok"}`

### **2. Dashboard is Accessible** ✅
- URL: `https://dentra-backend-zlxaiu.abacusai.app/dashboard/`
- Open it in your browser
- Should show the dashboard with stats

### **3. AI Services Configured** ✅
- OpenAI API Key: Configured ✅
- Deepgram API Key: Configured ✅
- ElevenLabs API Key: Configured ✅
- Twilio Credentials: Configured ✅

### **4. Database Seeded** ✅
- 5 Clinics created ✅
- 20+ Services available ✅
- Available appointment slots ✅

---

# 📞 STEP-BY-STEP TESTING PROCESS

## STEP 1: Configure Twilio Phone Number (5 minutes)

### **A. Get a Twilio Phone Number**

**Option 1: You Already Have a Twilio Number**
- If you already purchased a Twilio phone number, skip to Step B

**Option 2: Purchase a New Number**

1. **Go to Twilio Console:**
   - URL: https://console.twilio.com/
   - Log in with your Twilio account

2. **Buy a Phone Number:**
   - Click **Phone Numbers** in left sidebar
   - Click **Buy a number**
   - Select:
     - **Country:** United States
     - **Capabilities:** Voice ✅
     - **Type:** Local or Toll-Free
   - Click **Search**
   - Choose a number you like
   - Click **Buy** (costs ~$1/month)

3. **Note Your Number:**
   - Example: `+1 555-123-4567`
   - Write it down - you'll call this number!

---

### **B. Configure the Webhook URL**

This tells Twilio to send incoming calls to your Dentra backend.

1. **In Twilio Console, go to your phone number:**
   - Click **Phone Numbers** → **Manage** → **Active Numbers**
   - Click on your phone number

2. **Scroll to "Voice Configuration" section**

3. **Configure "A Call Comes In":**
   - **When a call comes in:** Webhook
   - **URL:** `https://dentra-backend-zlxaiu.abacusai.app/webhook/voice`
   - **HTTP Method:** POST
   - **Make sure it's exactly this URL!**

4. **Click "Save Configuration"**

5. **Verify it saved:**
   - The webhook URL should now show in the configuration
   - If not, try again

---

## STEP 2: Prepare for Testing (2 minutes)

### **A. Open the Dashboard**

1. **Open in a new browser tab:**
   - URL: `https://dentra-backend-zlxaiu.abacusai.app/dashboard/`

2. **Position your screen:**
   - Have dashboard visible while you make the call
   - You'll watch appointments appear in real-time

3. **Note current stats:**
   - Look at "Total Calls" card - note the number
   - Look at "Appointments" card - note the number
   - You'll see these increase after your call!

### **B. Have Your Phone Ready**

1. Get your mobile phone or any phone
2. Make sure you can make calls
3. Have the Twilio number ready to dial

---

## STEP 3: Make the Test Call! (3-5 minutes)

### **The Call Flow You'll Experience:**

**When you call, here's what will happen:**

1. **Phone rings** (just like calling any business)
2. **AI answers immediately:** "Thank you for calling [Clinic Name]. I'm the virtual assistant. How can I help you today?"
3. **You speak naturally:** "Hi, I need to book a cleaning appointment for next week"
4. **AI responds:** "I'd be happy to help you schedule a cleaning! Let me check available times. What day works best for you?"
5. **You reply:** "Tuesday afternoon if possible"
6. **AI checks schedule:** "I have Tuesday at 2 PM available. Does that work for you?"
7. **You confirm:** "Yes, that's perfect"
8. **AI asks for details:** "Great! Can I have your name please?"
9. **You provide:** "John Smith"
10. **AI asks for contact:** "And what's the best phone number to reach you?"
11. **You provide:** "555-0123"
12. **AI confirms:** "Perfect! You're all set for Tuesday at 2 PM for a dental cleaning. You'll receive a confirmation text shortly. Is there anything else I can help you with?"
13. **You say:** "No, that's all, thank you!"
14. **AI closes:** "You're welcome! We look forward to seeing you. Have a great day!"
15. **Call ends**

---

### **ACTUAL STEPS TO CALL:**

**Step 3.1: Dial the Twilio Number**

```
📞 Call: +1 [YOUR-TWILIO-NUMBER]
```

- Use your mobile phone
- Dial the number you configured in Step 1
- Wait for AI to answer (should be instant)

---

**Step 3.2: Have the Conversation**

**Example Script (feel free to adapt):**

**AI:** "Thank you for calling SmileCare Dental. I'm the virtual assistant. How can I help you today?"

**You:** "Hi, I'd like to book a dental cleaning appointment"

**AI:** "I'd be happy to help you schedule a cleaning! What day works best for you?"

**You:** "Next Tuesday afternoon"

**AI:** "I have Tuesday, January 21st at 2:00 PM available. Does that work?"

**You:** "Yes, perfect"

**AI:** "Great! Can I have your name please?"

**You:** "John Smith"

**AI:** "Thank you, John. What's the best phone number to reach you?"

**You:** "555-0123"

**AI:** "Perfect! You're all set for Tuesday, January 21st at 2 PM for a dental cleaning. You'll receive a confirmation text. Anything else?"

**You:** "No, that's all. Thank you!"

**AI:** "You're welcome! Have a great day!"

*Call ends*

---

**Step 3.3: During the Call - Watch for:**

✅ **AI voice is clear and natural** (ElevenLabs TTS)  
✅ **AI understands you correctly** (Deepgram STT)  
✅ **AI responds intelligently** (OpenAI LLM)  
✅ **Conversation flows naturally**  
✅ **AI confirms appointment details**  
✅ **No awkward pauses or glitches**  

---

## STEP 4: Check the Dashboard! (1 minute)

**NOW THE EXCITING PART!**

### **A. Refresh the Dashboard**

1. **Go back to your browser** with the dashboard open
2. **Refresh the page** (F5 or Ctrl+R)
3. **Watch the magic happen!**

---

### **B. Verify the Call Was Logged**

**"Total Calls" Card:**
- Should now show **1** (or increased by 1)
- Description shows "1 completed, 0 failed"
- Success rate: 100%

**Click on the "Calls" page:**
- Navigate to: Dashboard → Calls (top navigation)
- **You should see your call in the log!**
- Details shown:
  - Date & Time (when you called)
  - Patient: John Smith (the name you gave)
  - Clinic: SmileCare Dental (or whichever clinic)
  - Duration: ~2-3 minutes
  - Status: Completed ✅
  - Outcome: Appointment Booked

---

### **C. Verify the Appointment Was Created**

**"Appointments" Card:**
- Should now show **51** (increased by 1 from original 50)
- Description updated

**Click on "Appointments" page:**
- Navigate to: Dashboard → Appointments
- **Scroll through the list**
- **Find YOUR appointment:**
  - Patient: John Smith
  - Service: Dental Cleaning
  - Date: Tuesday, January 21, 2026 2:00 PM
  - Clinic: SmileCare Dental
  - Status: Scheduled (green badge)

**IT'S THERE! 🎉**

---

### **D. Check System Health**

**Back on Dashboard Home:**
- Scroll to "System Health" section
- **Metrics updated:**
  - CALLS (24H): 1
  - ERROR RATE: 0.0%
  - ESCALATION RATE: 0.0% (if booking was successful)
  - AVG DURATION: ~3 minutes
- Status: Healthy ✅

---

## ✅ WHAT YOU JUST PROVED:

1. ✅ **Twilio Integration Works** - Call was received
2. ✅ **AI Voice Agent Works** - AI answered and conversed
3. ✅ **Speech Recognition Works** - Deepgram understood you
4. ✅ **LLM Processing Works** - OpenAI generated responses
5. ✅ **Text-to-Speech Works** - ElevenLabs spoke clearly
6. ✅ **Appointment Logic Works** - AI checked availability
7. ✅ **Database Integration Works** - Appointment saved
8. ✅ **Dashboard Integration Works** - Data appears in UI

**THE ENTIRE SYSTEM IS WORKING END-TO-END!** 🎉

---

# 🧪 ADDITIONAL TEST SCENARIOS

Now that basic booking works, try these scenarios:

---

## Test Scenario 2: Request Unavailable Time

**Call again and say:**
- "I need an appointment at 3 AM"
- **Expected:** AI politely explains office hours and offers alternatives

---

## Test Scenario 3: Ask About Pricing

**Call and ask:**
- "How much does a root canal cost?"
- **Expected:** AI provides pricing information or says it will have staff call back

---

## Test Scenario 4: Emergency Call

**Call and say:**
- "I have a dental emergency, my tooth is in severe pain"
- **Expected:** AI prioritizes urgency, offers immediate options or emergency contact
- **Check Dashboard:** Should appear in "Escalations" (requires human follow-up)

---

## Test Scenario 5: Cancel/Reschedule

**Call and say:**
- "I need to reschedule my appointment"
- **Expected:** AI asks for appointment details and helps reschedule

---

## Test Scenario 6: Insurance Question

**Call and ask:**
- "Do you accept Blue Cross insurance?"
- **Expected:** AI provides answer or escalates to staff
- **Check Dashboard:** May appear in "Escalations" if complex

---

# 🐛 TROUBLESHOOTING

## Problem: AI Doesn't Answer

**Possible Causes:**
1. **Twilio webhook URL is incorrect**
   - Verify: `https://dentra-backend-zlxaiu.abacusai.app/webhook/voice`
   - Must be exact, no typos
   - Must be POST method

2. **Backend is down**
   - Check: https://dentra-backend-zlxaiu.abacusai.app/health
   - Should return `{"status":"ok"}`
   - If not, backend needs restart

3. **Twilio phone number not configured**
   - Go back to Step 1 and verify webhook is saved

**How to Debug:**
- Check Twilio logs: https://console.twilio.com/monitor/logs/calls
- Check backend logs: Ask assistant to run `fetch_server_logs`
- Try calling again

---

## Problem: AI Answers but Can't Hear Me

**Possible Causes:**
1. **Deepgram API issue**
   - Speech-to-text service may be down
   - Check Deepgram status

2. **Microphone/phone issue**
   - Try from a different phone
   - Ensure you're speaking clearly

**How to Debug:**
- Call again and speak louder/clearer
- Check backend logs for Deepgram errors

---

## Problem: I Can't Hear the AI

**Possible Causes:**
1. **ElevenLabs API issue**
   - Text-to-speech service may be down
   - Check ElevenLabs status

2. **Audio streaming issue**
   - Network problem between Twilio and backend

**How to Debug:**
- Try calling again
- Check backend logs for ElevenLabs errors
- Verify audio codecs in Twilio console

---

## Problem: AI Books Wrong Time

**Possible Causes:**
1. **AI misunderstood the request**
   - LLM may have parsed incorrectly
   - Time zone confusion

2. **Database availability issue**
   - The time slot may actually not be available

**How to Debug:**
- Check the appointment in dashboard
- Look at call transcript (if logged)
- Verify available slots in database

---

## Problem: Appointment Doesn't Appear in Dashboard

**Possible Causes:**
1. **Dashboard not refreshed**
   - Press F5 to refresh
   - Clear browser cache

2. **Database save failed**
   - Check backend logs
   - Verify database connection

3. **Appointment was created but in different clinic**
   - Check clinic selector dropdown
   - Try selecting "All Clinics"

**How to Debug:**
- Refresh dashboard multiple times
- Check database directly via API:
  ```
  https://dentra-backend-zlxaiu.abacusai.app/api/dashboard/appointments
  ```
- Look for your name in the response

---

# 📊 EXPECTED RESULTS SUMMARY

## After Successful Test Call:

**Dashboard Home:**
```
Total Calls: 1 (was 0)
Appointments: 51 (was 50)
Escalations: 0 (none needed)
Estimated Revenue: $150 (average cleaning cost)
Success Rate: 100%
```

**Calls Page:**
```
1 call logged:
- Patient: John Smith
- Duration: ~3 minutes
- Status: Completed
- Outcome: Appointment Booked
```

**Appointments Page:**
```
51 appointments (1 new):
- Patient: John Smith
- Service: Dental Cleaning
- Date: Tuesday, Jan 21, 2026 2:00 PM
- Status: Scheduled
```

**System Health:**
```
Status: Healthy ✅
Calls (24h): 1
Error Rate: 0%
Escalation Rate: 0%
Avg Duration: 3 mins
```

---

# 🎉 SUCCESS CRITERIA

You can mark the test as **SUCCESSFUL** if:

- [x] Twilio phone number is configured
- [x] You called the number
- [x] AI answered within 2 seconds
- [x] AI understood your request
- [x] You could hear the AI clearly
- [x] AI booked an appointment
- [x] AI confirmed details correctly
- [x] Call ended smoothly
- [x] Call appears in "Calls" page
- [x] Appointment appears in "Appointments" page
- [x] Dashboard stats updated correctly
- [x] No errors in system health

**If all 12 are checked: SYSTEM IS FULLY OPERATIONAL!** ✅

---

# 📹 RECORDING THE TEST

**For Demo/Documentation Purposes:**

1. **Screen Record the Dashboard**
   - Use OBS, QuickTime, or built-in screen recorder
   - Show dashboard before the call
   - Refresh and show dashboard after the call
   - Highlight the new appointment

2. **Record the Phone Call** (if legal in your jurisdiction)
   - Note: Check local laws about call recording
   - Useful for demos and training

3. **Take Screenshots**
   - Dashboard before (0 calls, 50 appointments)
   - Dashboard after (1 call, 51 appointments)
   - The new appointment details
   - System health metrics

---

# 🚀 NEXT STEPS AFTER SUCCESSFUL TEST

## 1. **Test More Scenarios**
- Try the 5 additional scenarios above
- Test edge cases (wrong info, cancellations, etc.)
- Have different people call to test various voices/accents

## 2. **Customize the AI**
- Adjust AI responses for your specific clinic
- Add custom FAQs
- Configure business hours
- Set pricing information

## 3. **Train Your Staff**
- Show them the dashboard
- Explain how to handle escalations
- Practice the morning routine
- Run through daily workflows

## 4. **Go Live!**
- Update your clinic's main number to the Twilio number
- Or forward calls to Twilio number
- Monitor for first few days
- Collect feedback from patients and staff

## 5. **Monitor & Optimize**
- Check dashboard daily
- Review escalations
- Track appointment show-up rates
- Calculate ROI
- Make improvements based on data

---

# 📞 QUICK REFERENCE

```
TWILIO NUMBER: +1 [YOUR-NUMBER-HERE]
WEBHOOK URL: https://dentra-backend-zlxaiu.abacusai.app/webhook/voice
DASHBOARD: https://dentra-backend-zlxaiu.abacusai.app/dashboard/
BACKEND: https://dentra-backend-zlxaiu.abacusai.app
HEALTH CHECK: https://dentra-backend-zlxaiu.abacusai.app/health
```

---

**You're now ready to ACTUALLY TEST the system end-to-end!** 

**Make that call and watch the magic happen!** ✨📞🎉

---

*Last Updated: January 11, 2026*  
*Dentra AI Voice Agent - Live Testing Guide*
