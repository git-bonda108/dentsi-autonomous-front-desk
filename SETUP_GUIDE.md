# DENTSI Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL database
- Twilio account
- ElevenLabs account
- OpenAI API key

---

## Step 1: Clone Repository

```bash
git clone https://github.com/bonda108/DENTSI.git
cd DENTSI
```

---

## Step 2: Backend Setup

```bash
cd nodejs_space

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# DATABASE_URL, TWILIO_*, ELEVENLABS_*, OPENAI_*

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start development server
npm run start:dev
```

Backend runs at: http://localhost:3000

---

## Step 3: Dashboard Setup

```bash
cd streamlit_demo

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install streamlit requests pandas plotly

# Run dashboard
streamlit run dentsi_app.py
```

Dashboard runs at: http://localhost:8501

---

## Step 4: Twilio Configuration

1. Go to Twilio Console
2. Buy a phone number (or use existing)
3. Set Voice webhook URL:
   - **Incoming call:** `https://your-domain/webhook/voice`
   - **Status callback:** `https://your-domain/webhook/status`

---

## Step 5: ElevenLabs Setup

1. Go to ElevenLabs Conversational AI
2. Create new agent
3. Set system prompt (see `elevenlabs-agent/deploy-dentsi-agent.ts`)
4. Add Tools:
   - `lookup_patient`: POST `/elevenlabs/tools/lookup-patient`
   - `book_appointment`: POST `/elevenlabs/tools/book-appointment`
   - `check_availability`: POST `/elevenlabs/tools/check-availability`
5. Connect Twilio phone number

---

## Step 6: Test End-to-End

1. Call the Twilio number
2. Say "I'd like to schedule a cleaning"
3. Follow the AI prompts
4. Check the dashboard for the new appointment

---

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` in `.env`
- Run `npx prisma generate`

### Dashboard shows "Demo Mode"
- Ensure backend is running
- Check `API_BASE` in `dentsi_app.py`

### Calls not working
- Verify Twilio webhook URLs
- Check ElevenLabs agent is published
- Confirm phone number is assigned to agent

---

## Production Deployment

### Abacus AI (Backend)
1. Push to GitHub
2. Create deployment on Abacus AI
3. Set all environment variables
4. Deploy

### Streamlit Cloud (Dashboard)
1. Push to GitHub
2. Connect repo to streamlit.io
3. Set secrets (if any)
4. Deploy

---

## Support

Contact: satya@dentsi.com
