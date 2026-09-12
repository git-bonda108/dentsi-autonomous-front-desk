# Dentsi Backend (NestJS)

Voice-agent backend: Twilio webhooks, the OpenAI function-calling agent loop,
ElevenLabs agent tool endpoints, scheduling, triage, outbound reminder calls,
analytics, ML feedback/export, and the dashboard/transcript APIs. PostgreSQL
via Prisma.

Full documentation lives at the repository root:

- [`../README.md`](../README.md) — quickstart and configuration
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — component map and data flow
- [`../docs/EVALUATION.md`](../docs/EVALUATION.md) — test inventory and evaluation design
- [`../docs/HARDENING.md`](../docs/HARDENING.md) — production readiness ladder

## Commands

```bash
npm install
cp .env.example .env        # then fill in values (see root README)
npx prisma generate
npx prisma migrate dev      # needs DATABASE_URL pointing at PostgreSQL
npx prisma db seed          # demo clinics/doctors/patients/services

npm run start:dev           # watch mode on :3000
npm run build && npm run start:prod

npm run test:e2e            # jest e2e suites (need a database; see docs/EVALUATION.md)
npm run lint
```

Once running:

- Swagger: http://localhost:3000/api-docs
- Health: http://localhost:3000/health
- Dashboard (served from `public/dashboard/`): http://localhost:3000/dashboard/

## Layout

```
src/
  agents/          # DentsiAgentService (main tool loop), sentiment agent,
                   # tools/, plus earlier specialist agents kept for reference
  ai-services/     # OpenAI, Deepgram, ElevenLabs client wrappers
  conversation/    # Patient context builder, script/prompt templates
  scheduling/      # Slot search, conflict detection, booking
  triage/          # Symptom urgency scoring, medical alerts
  webhook/         # Twilio voice/gather/status webhooks + demo endpoints
  elevenlabs/      # Tool endpoints called by the ElevenLabs agent
  outbound/        # Outbound calls, reminder cron jobs
  analytics/       # Call/appointment analytics, spam detection
  ml/              # Conversation logging, feedback, fine-tune export
  dashboard/       # Dashboard API
  transcript/      # Live transcript buffer + webhook
  admin/           # Demo administration (active clinic, seeding)
  calls/ clinics/ patients/ health/ prisma/ config/
prisma/            # schema.prisma, migrations, seed.ts
test/              # jest e2e specs
docs/              # MVP_TEST_CASES.md test-case spec
```
