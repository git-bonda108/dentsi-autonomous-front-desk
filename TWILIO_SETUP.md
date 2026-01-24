# Twilio Setup Guide for DENTRA

This guide walks you through configuring Twilio to work with your DENTRA voice AI receptionist.

## 📝 Prerequisites

- Twilio account (sign up at https://www.twilio.com/try-twilio)
- DENTRA backend deployed to a public URL
- Twilio credentials already configured in `.env`:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`

## 📞 Step 1: Purchase a Twilio Phone Number

### Using Twilio Console (Web UI)

1. **Log in to Twilio Console**
   - Go to: https://console.twilio.com/
   - Sign in with your credentials

2. **Navigate to Phone Numbers**
   - Click on **Phone Numbers** in the left sidebar
   - Click **Manage** → **Buy a number**

3. **Search for a Number**
   - **Country**: United States
   - **Capabilities**: Check **Voice**
   - **Optional filters**:
     - Local/Toll-free
     - Area code (e.g., 212 for New York)
     - Contains specific digits

4. **Buy the Number**
   - Click **Search**
   - Browse available numbers
   - Click **Buy** on your preferred number
   - Confirm the purchase

5. **Note Your Phone Number**
   - Save the number (e.g., `+1 555-123-4567`)
   - You'll need this for testing

### Using Twilio CLI (Alternative)

```bash
# Install Twilio CLI
npm install -g twilio-cli

# Login
twilio login

# Search for available numbers
twilio phone-numbers:available:local:list --country-code US --voice-enabled

# Buy a number
twilio phone-numbers:buy +15551234567
```

## ⚙️ Step 2: Configure Webhooks

### Important: Webhook URLs

Replace `https://your-deployed-url.com` with your actual deployed DENTRA backend URL.

**Required Webhooks:**
1. **Voice Webhook**: `https://your-deployed-url.com/webhook/voice`
2. **Status Callback**: `https://your-deployed-url.com/webhook/status`

### Configure via Twilio Console

1. **Go to Your Phone Number**
   - Navigate to: **Phone Numbers** → **Manage** → **Active numbers**
   - Click on your purchased phone number

2. **Configure Voice Settings**
   - Scroll down to **Voice & Fax** section
   - Under **A CALL COMES IN**:
     - Select: **Webhook**
     - Enter URL: `https://your-deployed-url.com/webhook/voice`
     - HTTP Method: **POST**

3. **Configure Status Callback** (Optional but recommended)
   - In the same **Voice & Fax** section
   - Find **STATUS CALLBACK URL**:
     - Enter URL: `https://your-deployed-url.com/webhook/status`
     - HTTP Method: **POST**

4. **Save Configuration**
   - Scroll to the bottom
   - Click **Save**

### Configure via Twilio CLI (Alternative)

```bash
# Update phone number configuration
twilio phone-numbers:update +15551234567 \
  --voice-url="https://your-deployed-url.com/webhook/voice" \
  --voice-method="POST" \
  --status-callback="https://your-deployed-url.com/webhook/status" \
  --status-callback-method="POST"
```

## 🔐 Step 3: Webhook Security (Recommended)

### Enable Request Validation

Twilio signs all webhook requests. You should validate these signatures to prevent unauthorized access.

**What DENTRA currently does:**
- Accepts all webhook requests (for development)

**What you should add for production:**
```typescript
import { validateRequest } from 'twilio';

// In your webhook controller
const isValid = validateRequest(
  twilioAuthToken,
  twilioSignature,
  url,
  params
);

if (!isValid) {
  throw new UnauthorizedException('Invalid Twilio signature');
}
```

## 🧪 Step 4: Test the Integration

### Quick Test

1. **Call Your Twilio Number**
   ```
   Dial: +1 555-123-4567 (your purchased number)
   ```

2. **Expected Experience**
   - Call connects within 2-3 seconds
   - You hear: "Thank you for calling [Clinic Name]. This is Dentra, your AI assistant. How can I help you today?"
   - Speak your request
   - AI responds naturally
   - Conversation continues

3. **Verify Call was Recorded**
   ```bash
   curl https://your-deployed-url.com/calls | jq
   ```

   Look for:
   - New call record with your phone number
   - `status: "in_progress"` or `"completed"`
   - Transcript of conversation
   - Identified intent

### Test Different Scenarios

#### Test 1: New Appointment
**Say:** "I'd like to schedule a dental cleaning"
**Expected:** AI asks for name, phone, DOB, preferred date

#### Test 2: Emergency
**Say:** "I have severe tooth pain"
**Expected:** AI recognizes urgency, prioritizes

#### Test 3: General Inquiry
**Say:** "What are your office hours?"
**Expected:** AI provides hours information

## 💁 Step 5: Assign Number to Specific Clinic

### Update Database

Your Twilio number should match a clinic phone number in the database:

```sql
UPDATE clinic
SET phone = '+15551234567'  -- Your Twilio number
WHERE id = 'your-clinic-id';
```

Or via Prisma:
```typescript
await prisma.clinic.update({
  where: { id: 'your-clinic-id' },
  data: { phone: '+15551234567' }
});
```

**Important:** The webhook matches incoming calls to clinics by phone number.

## 📊 Step 6: Monitor and Debug

### View Twilio Call Logs

1. Go to: https://console.twilio.com/monitor/logs/calls
2. Find your recent call
3. Check:
   - Call status (completed, busy, failed)
   - Duration
   - Webhook requests/responses
   - Any errors

### View DENTRA Logs

**Development:**
```bash
tail -f /tmp/dentra-dev.log
```

**Production:**
Check your deployment platform's logs (Render, Heroku, AWS, etc.)

### Common Issues

#### Issue: "We're sorry, but we're experiencing technical difficulties"

**Possible causes:**
1. Webhook URL is incorrect
2. Backend is not accessible from Twilio
3. Backend crashed or is not running

**Fix:**
- Verify webhook URL is correct
- Test URL accessibility: `curl https://your-url/health`
- Check backend logs for errors

#### Issue: No response or silent call

**Possible causes:**
1. TwiML response is malformed
2. Elevenlabs/Deepgram API issues

**Fix:**
- Check backend logs
- Test webhook locally: `curl -X POST http://localhost:3000/webhook/voice -d "To=%2B15551234567&From=%2B15559999999&CallSid=TEST"`
- Verify API keys are valid

#### Issue: AI doesn't understand speech

**Possible causes:**
1. Deepgram API key invalid
2. Poor audio quality

**Fix:**
- Verify Deepgram API key
- Test from a different phone/location
- Check Deepgram dashboard for usage/errors

## 👥 Step 7: Multi-Clinic Setup

For multiple clinics:

1. **Purchase Multiple Numbers**
   - One Twilio number per clinic

2. **Update Database**
   ```typescript
   // Clinic 1
   await prisma.clinic.update({
     where: { id: 'clinic-1-id' },
     data: { phone: '+15551111111' }
   });

   // Clinic 2
   await prisma.clinic.update({
     where: { id: 'clinic-2-id' },
     data: { phone: '+15552222222' }
   });
   ```

3. **Configure Each Number**
   - All numbers use the same webhooks
   - DENTRA automatically routes to the correct clinic

## 💰 Cost Estimation

### Twilio Pricing (approximate)

- **Phone Number**: $1.15/month per number
- **Inbound Calls**: $0.0085/minute
- **Outbound Calls**: Not used by DENTRA

### Example Monthly Cost

**Single Clinic:**
- 1 phone number: $1.15
- 100 calls/month, avg 3 min each: 300 min × $0.0085 = $2.55
- **Total**: ~$3.70/month

**5 Clinics:**
- 5 phone numbers: $5.75
- 500 calls/month, avg 3 min each: 1500 min × $0.0085 = $12.75
- **Total**: ~$18.50/month

## ✅ Verification Checklist

- [ ] Twilio phone number purchased
- [ ] Voice webhook configured: `/webhook/voice`
- [ ] Status callback configured: `/webhook/status`
- [ ] Backend is deployed and accessible
- [ ] Phone number matches clinic in database
- [ ] Test call successful
- [ ] AI responds naturally
- [ ] Call record appears in database
- [ ] Transcript is captured
- [ ] Intent is identified
- [ ] Twilio logs show successful webhooks

## 🚀 Production Checklist

- [ ] Use production Twilio account (not trial)
- [ ] Enable webhook signature validation
- [ ] Set up monitoring/alerting
- [ ] Configure error handling
- [ ] Test failover scenarios
- [ ] Document support procedures
- [ ] Train staff on system

## 📞 Support Contacts

**Twilio Support:**
- Help Center: https://support.twilio.com/
- Developer Docs: https://www.twilio.com/docs
- Status Page: https://status.twilio.com/

**DENTRA Issues:**
- Check backend logs
- Review API documentation: `https://your-url/api-docs`
- Test endpoints with curl/Postman

---

**You're now ready to receive calls! 🎉**
