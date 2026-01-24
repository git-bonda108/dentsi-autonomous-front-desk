# 🦷 DENTRA - AI Voice Agent for Dental Clinics

**Automated 24/7 appointment booking and call handling for dental practices**

[![Production](https://img.shields.io/badge/Production-Live-green)](https://dentcognit.abacusai.app/dashboard/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)

---

## 🎯 Overview

DENTRA is an enterprise-grade AI voice agent that automates dental appointment booking through natural phone conversations. The system handles missed calls, recognizes returning patients, verifies insurance, respects doctor preferences, and books appointments directly into your calendar—all without human intervention.

**Production URL:** https://dentcognit.abacusai.app/dashboard/

---

## ✨ Key Features

### MVP Features (Current Release)

- ✅ **24/7 Inbound Call Handling** - Answers every call via Twilio, eliminating missed opportunities
- ✅ **Caller ID & Patient Recognition** - Automatically identifies returning patients by phone number
- ✅ **Patient History Retrieval** - Loads complete medical history, preferences, and past visits into conversation
- ✅ **Insurance Verification** - Collects insurance information without blocking appointment booking
- ✅ **Doctor Preference Handling** - Honors patient's preferred doctor while offering alternatives
- ✅ **Intelligent Appointment Scheduling** - Books appointments in real-time with calendar integration
- ✅ **Multi-Agent AI Architecture** - Voice, Scheduler, Policy, and Ops agents working in coordination
- ✅ **Human Escalation Workflow** - Seamlessly transfers complex cases to staff with full context
- ✅ **Real-Time Dashboard** - Web-based monitoring for appointments, calls, and escalations
- ✅ **Multi-Clinic Support** - Manages multiple locations from single platform

### Coming Soon

- 🔄 Screen Pop Notifications - Real-time caller information display
- 🔄 Outbound Calling - Automated appointment reminders and confirmations
- 🔄 SMS & Email Integration - Multi-channel communication
- 🔄 PMS Integration - Direct sync with Dentrix, Open Dental, Curve
- 🔄 Machine Learning - Continuous improvement from conversations
- 🔄 HIPAA Certification - SOC 2 Type II compliance
- 🔄 Payment Processing - Collect copays and payments over phone
- 🔄 Multi-Language Support - Spanish and additional languages

---

## 🏗️ Architecture

### Tech Stack

**Backend (NestJS)**
- Node.js 18+ runtime
- TypeScript (strict mode)
- PostgreSQL database
- Prisma ORM
- RESTful API architecture

**Voice & AI Services**
- Twilio Programmable Voice - Telephony
- Deepgram - Speech-to-text (STT)
- OpenAI GPT-4 - Natural language understanding
- ElevenLabs - Text-to-speech (TTS)

**Frontend Dashboard (Next.js)**
- React 18
- Next.js 15 (static export)
- Tailwind CSS
- Recharts for data visualization

**Infrastructure**
- Hosted on Abacus AI Platform
- Automatic scaling and deployment
- Built-in monitoring and logs

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────┐
│                     INCOMING CALL                       │
│                   (via Twilio)                          │
└────────────────────────┬────────────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │   VOICE AGENT        │
              │  - STT (Deepgram)    │
              │  - NLU (OpenAI)      │
              │  - TTS (ElevenLabs)  │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  SCHEDULER AGENT     │
              │  - Calendar check    │
              │  - Slot availability │
              │  - Booking logic     │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │   POLICY AGENT       │
              │  - Business rules    │
              │  - Validation        │
              │  - Authorization     │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │    OPS AGENT         │
              │  - Escalations       │
              │  - Monitoring        │
              │  - Analytics         │
              └──────────────────────┘
```

---

## 📁 Project Structure

```
dentra_backend/
├── nodejs_space/              # Backend NestJS application
│   ├── src/
│   │   ├── agents/           # Multi-agent AI system
│   │   │   ├── voice-agent.service.ts
│   │   │   ├── scheduler-agent.service.ts
│   │   │   ├── policy-agent.service.ts
│   │   │   └── ops-agent.service.ts
│   │   ├── ai-services/      # AI service integrations
│   │   │   ├── deepgram.service.ts
│   │   │   ├── elevenlabs.service.ts
│   │   │   └── openai.service.ts
│   │   ├── calls/            # Call handling
│   │   ├── clinics/          # Clinic management
│   │   ├── patients/         # Patient data
│   │   ├── dashboard/        # Dashboard APIs
│   │   ├── webhook/          # Twilio webhooks
│   │   ├── prisma/           # Database service
│   │   └── main.ts           # Application entry
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Sample data
│   ├── test/                 # E2E tests
│   ├── public/
│   │   └── dashboard/        # Dashboard static files
│   └── package.json
├── dashboard/                 # Frontend Next.js application
│   ├── app/                  # Next.js app directory
│   │   ├── page.tsx          # Dashboard home
│   │   ├── appointments/     # Appointments page
│   │   ├── calls/            # Calls log page
│   │   ├── escalations/      # Escalations page
│   │   └── clinics/          # Clinics page
│   ├── components/           # React components
│   ├── lib/                  # Utilities and API client
│   └── package.json
├── PROJECT_DOCUMENTS/         # Project documentation
│   ├── MVP_FEATURES.md       # Feature documentation
│   └── COMPLETE_PROJECT_PLAN.md  # 32-week execution plan
└── [20+ documentation files]  # Comprehensive guides
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14+
- Yarn package manager
- Twilio account with phone number
- OpenAI API key
- Deepgram API key
- ElevenLabs API key

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/git-bonda108/dentra-backend.git
cd dentra-backend
```

2. **Backend setup**
```bash
cd nodejs_space
cp .env.example .env
# Edit .env with your API keys and database URL
yarn install
yarn prisma:migrate:dev
yarn prisma:seed
```

3. **Dashboard setup**
```bash
cd ../dashboard
cp .env.example .env
# Edit .env with backend API URL
yarn install
```

### Running Locally

**Backend (Development)**
```bash
cd nodejs_space
yarn start:dev
# Server runs on http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

**Dashboard (Development)**
```bash
cd dashboard
yarn dev
# Dashboard runs on http://localhost:3001
```

**Production Build**
```bash
# Backend
cd nodejs_space
yarn build
yarn start:prod

# Dashboard
cd dashboard
yarn build
# Serves static files from 'build' directory
```

---

## 🧪 Testing

### Run E2E Tests

```bash
cd nodejs_space
yarn test:e2e
```

**Test Coverage:**
- ✅ 21/21 Batch 2 tests (AI agent conversations)
- ✅ 15/15 Batch 3 tests (Dashboard APIs)
- ✅ 100% pass rate

### Test Scenarios

The test suite covers:
- New patient booking
- Returning patient recognition
- Insurance verification flows
- Doctor preference handling
- Emergency escalations
- Rescheduling and cancellations
- Multi-clinic operations
- Dashboard data retrieval

---

## 📚 API Documentation

**Swagger UI:** https://dentcognit.abacusai.app/api-docs

### Key Endpoints

**Webhook Endpoints (Twilio)**
- `POST /webhook/voice` - Incoming call handler
- `POST /webhook/gather` - User input processing
- `POST /webhook/end` - Call completion
- `POST /webhook/status` - Call status updates

**Dashboard APIs**
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/appointments` - Appointments list
- `GET /api/dashboard/calls` - Call logs
- `GET /api/dashboard/escalations` - Active escalations
- `GET /api/dashboard/health` - System health check

**Clinic & Patient APIs**
- `GET /clinics` - List all clinics
- `GET /patients` - List patients
- `GET /calls` - Call history

---

## 🎨 Dashboard

**Live Dashboard:** https://dentcognit.abacusai.app/dashboard/

### Features

- 📊 **Overview** - Real-time stats, success rates, revenue tracking
- 📅 **Appointments** - Complete appointment management with filters
- 📞 **Calls** - Call logs with transcripts and audio playback
- ⚠️ **Escalations** - Active issues requiring staff attention
- 🏥 **Clinics** - Multi-location management
- 💚 **System Health** - Service status and error monitoring

---

## 📖 Documentation

### Available Guides

**For Stakeholders:**
- `PROJECT_DOCUMENTS/MVP_FEATURES.md` - Feature documentation for external use
- `USER_WORKFLOW_AND_BENEFITS.md` - Daily workflows and business value
- `LIVE_TESTING_GUIDE.md` - How to test the system with real calls

**For Developers:**
- `PROJECT_DOCUMENTS/COMPLETE_PROJECT_PLAN.md` - 32-week execution plan with Gantt chart
- `DENTRA_PRODUCTION_ENHANCEMENTS.md` - 10-batch enhancement roadmap
- `E2E_TESTING_GUIDE.md` - Complete testing procedures
- `DEPLOYMENT_SUMMARY.md` - System overview and deployment guide

**For QA:**
- `COMPLETE_TESTING_WORKFLOW.md` - 52-point validation workflow
- `DASHBOARD_TESTING_CHECKLIST.md` - Dashboard testing checklist
- `BATCH3_TEST_CASES.md` - Dashboard test scenarios

**Master Index:**
- `00_DOCUMENTATION_INDEX.md` - Complete documentation catalog

---

## 🔐 Security

- All API keys stored in environment variables (never committed to git)
- `.env.example` provided for setup guidance
- HTTPS enforced in production
- Database credentials encrypted
- Session management with auto-logout
- Audit logging for PHI access (coming in HIPAA certification batch)

---

## 🌐 Deployment

### Production Environment

**Platform:** Abacus AI  
**URL:** https://dentcognit.abacusai.app  
**Dashboard:** https://dentcognit.abacusai.app/dashboard/  
**API Docs:** https://dentcognit.abacusai.app/api-docs  

### Deployment Process

```bash
# Automated via Abacus AI platform
# 1. Push code to repository
# 2. Click Deploy button in UI
# 3. System automatically builds and deploys
# 4. Health check confirms deployment
```

---

## 📊 Current Status

**MVP Status:** ✅ Complete (Week 8 milestone achieved)

**Operational:**
- ✅ Backend API running on port 3000
- ✅ Dashboard deployed and accessible
- ✅ Database seeded with sample data (5 clinics, 20 patients, 50 appointments)
- ✅ All core features functional
- ✅ E2E tests passing (36/36)

**Production Deployment:**
- ✅ Live at dentcognit.abacusai.app
- ✅ Swagger documentation accessible
- ✅ Dashboard fully functional
- ✅ Ready for real clinic onboarding

---

## 🛠️ Development Workflow

### Branch Strategy

```
master (production-ready code)
  ↓
develop (integration branch)
  ↓
feature/* (feature branches)
```

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation update
test: Add or update tests
refactor: Code refactoring
style: Code style changes
chore: Build process or auxiliary tool changes
```

---

## 🤝 Contributing

This is a proprietary project. External contributions are not accepted at this time.

---

## 📝 License

Proprietary - All rights reserved.

---

## 🆘 Support

For issues, questions, or support:

- **Documentation:** See `00_DOCUMENTATION_INDEX.md` for complete guide catalog
- **Testing Issues:** Refer to `E2E_TESTING_GUIDE.md`
- **Deployment Issues:** Check `DEPLOYMENT_SUMMARY.md`
- **Feature Requests:** Review `DENTRA_PRODUCTION_ENHANCEMENTS.md` for planned features

---

## 📈 Roadmap

**Completed:**
- ✅ Phase 1: MVP (Weeks 1-8) - **COMPLETE**

**In Progress:**
- 🔄 Phase 2: Post-MVP Enhancements (Weeks 9-32)
  - Next up: Batch 4 (Screen Pop & Enhanced Context)

**See `PROJECT_DOCUMENTS/COMPLETE_PROJECT_PLAN.md` for detailed 32-week timeline with Gantt chart.**

---

## 🎯 Quick Links

- 🌐 [Production Dashboard](https://dentcognit.abacusai.app/dashboard/)
- 📚 [API Documentation](https://dentcognit.abacusai.app/api-docs)
- 💚 [Health Check](https://dentcognit.abacusai.app/health)
- 📄 [MVP Features](PROJECT_DOCUMENTS/MVP_FEATURES.md)
- 📅 [Complete Project Plan](PROJECT_DOCUMENTS/COMPLETE_PROJECT_PLAN.md)
- 🚀 [Enhancement Roadmap](DENTRA_PRODUCTION_ENHANCEMENTS.md)

---

**Built with ❤️ for dental clinics who never want to miss a call.**

*Version: 1.0.0 (MVP)*  
*Last Updated: January 24, 2026*
