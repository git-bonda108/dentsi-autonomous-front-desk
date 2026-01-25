# 🦷 DENTSI - Autonomous AI Dental Assistant

> Your invisible front desk that never sleeps

DENTSI is an AI-powered voice agent that handles patient calls 24/7, books appointments, collects insurance, and optimizes clinic revenue.

---

## Quick Start

### 1. Experience DENTSI Live
Call **+1 (920) 891-4513** to talk to the AI assistant.

### 2. View the Dashboard
```bash
cd streamlit_demo
streamlit run dentsi_app.py
```
Open http://localhost:8501

### 3. Backend API
```bash
cd nodejs_space
npm install
npm run start:dev
```
API runs at http://localhost:3000

---

## Project Structure

```
DENTSI/
├── streamlit_demo/          # Dashboard UI
│   ├── dentsi_app.py        # Main Streamlit app
│   └── .streamlit/          # Theme configuration
├── nodejs_space/            # Backend API
│   ├── src/
│   │   ├── agents/          # AI agent logic
│   │   ├── webhook/         # Twilio webhooks
│   │   ├── elevenlabs/      # ElevenLabs tools
│   │   └── prisma/          # Database
│   └── .env                 # Environment variables
├── elevenlabs-agent/        # ElevenLabs deployment
└── DEMO_PRESENTATION.md     # Customer demo guide
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| 24/7 Availability | Never miss a call |
| Natural Voice | ElevenLabs Bella voice |
| Intelligent Booking | Claude Sonnet 4.5 |
| Insurance Collection | Automated before booking |
| Real-time Dashboard | All metrics at a glance |
| Escalation Handling | Complex cases flagged |

---

## Environment Variables

Create `.env` in `nodejs_space/`:

```env
# Database
DATABASE_URL="postgresql://..."

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+19208914513"

# ElevenLabs
ELEVENLABS_API_KEY="sk_..."
ELEVENLABS_VOICE_ID="hpp4J3VqNfWAUOO0d1Us"

# OpenAI
OPENAI_API_KEY="sk-..."
```

---

## Architecture

```
Patient Call → Twilio → ElevenLabs AI → Claude Sonnet → Database
                                ↓
                         Dashboard (Streamlit)
```

---

## Deployment

### Streamlit Cloud
1. Push to GitHub
2. Connect to streamlit.io
3. Deploy `streamlit_demo/dentsi_app.py`

### Backend (Abacus AI)
1. Push code to repo
2. Create new deployment
3. Set environment variables
4. Deploy

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/clinics` | GET | List clinics |
| `/patients` | GET | List patients |
| `/appointments` | GET | List appointments |
| `/calls` | GET | Call history |
| `/elevenlabs/tools/*` | POST | ElevenLabs agent tools |

---

## License

Proprietary - All rights reserved.

---

## Contact

- **Email:** satya@dentsi.com
- **Phone:** +1 (920) 891-4513
