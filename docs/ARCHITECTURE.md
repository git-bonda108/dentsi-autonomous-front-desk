# Architecture

This document describes the system as it exists in the code. Anything not yet
implemented is labeled as such.

## System overview

Dentsi is a monorepo with four deployable surfaces around one PostgreSQL
database:

| Surface | Directory | Runtime | Role |
|---------|-----------|---------|------|
| Voice/API backend | `nodejs_space/` | NestJS 11, Node 18+ | Twilio webhooks, agent loop, ElevenLabs tool endpoints, dashboard/analytics/ML APIs, cron jobs |
| Web dashboard | `dashboard/` | Next.js 14 (static export) | Staff UI; compiled export is committed at `nodejs_space/public/dashboard/` and served by the backend |
| Ops/demo dashboards | `streamlit_demo/` | Streamlit | Operational views, live transcript pane, browser-based conversation demo |
| Agent provisioning | `elevenlabs-agent/` | tsx script | One-shot creation of the ElevenLabs Conversational AI agent |

`knowledge_base/*.txt` holds plain-text clinic knowledge (doctor profiles,
service catalog, insurance, FAQ/policies) for the ElevenLabs-hosted agent.

## Component map (backend)

```
nodejs_space/src/
  main.ts                    Express bootstrap: CORS (all origins), global
                             ValidationPipe (whitelist+transform), Swagger at
                             /api-docs, static dashboard at /dashboard
  app.module.ts              Module graph (ConfigModule global, .env)

  webhook/                   Twilio surface (Path A)
    webhook.controller.ts    POST /webhook/voice|gather|end|status|hold-music,
                             /webhook/outbound*, /webhook/demo[/start]
    webhook.service.ts       Call lifecycle: spam gate -> clinic lookup by
                             called number -> session init -> TwiML generation

  agents/
    dentsi-agent.service.ts  THE core: session store, 17 OpenAI tool
                             definitions, agent loop (max 5 iterations),
                             greeting generation, outcome classification,
                             date validation/parsing, lexicon sentiment
    sentiment-agent.service.ts  Pre-turn sentiment/tone recommendation
    tools/agent-tools.service.ts Tool implementations over Prisma +
                             SchedulingService + TriageService
    voice|scheduler|policy|ops-agent.service.ts  Earlier specialist agents;
                             registered providers, exercised by tests, NOT in
                             the live webhook path

  ai-services/
    openai.service.ts        Standalone prompt/intent-extraction client (used
                             by the legacy VoiceAgent path)
    deepgram.service.ts      nova-2 prerecorded + live transcription wrappers
    elevenlabs.service.ts    TTS (eleven_turbo_v2_5) buffer + stream

  conversation/
    patient-context.service.ts  Builds PatientContext from phone number
                             (history, preferences, insurance, medical alerts,
                             upcoming appts) + natural-language summary
    conversation-script.service.ts  DB-backed script templates per clinic
                             (5-min cache) + buildAgentSystemPrompt()

  scheduling/scheduling.service.ts  Slot generation from doctors' JSON weekly
                             hours, service-duration table, preference-aware
                             slot prioritization, conflict detection with
                             alternative suggestions, reschedule/cancel
  triage/triage.service.ts   Keyword/pattern urgency scoring (routine/soon/
                             urgent/emergency), medication+condition alerts,
                             escalation triggers
  analytics/                 Call/appointment/patient analytics, spam
                             detection (prefix/keyword/behavior weights,
                             in-memory block/allow lists)
  outbound/                  Twilio REST outbound calls, DTMF response
                             handling, retry (3 attempts / 2h), reminder
                             cron (every 5 min) + daily recall (09:00)
  ml/                        Conversation logging to conversation_log,
                             feedback (ratings/corrections/surveys),
                             fine-tune JSONL export + cost estimate
  elevenlabs/elevenlabs-tools.controller.ts  POST /elevenlabs/tools/
                             lookup-patient|check-availability|
                             book-appointment|get-services|log-conversation
  transcript/                In-memory ring buffer (800 lines) + REST
                             webhook (optional shared-secret header)
  dashboard/                 /api/dashboard/* aggregations for the UIs
  admin/                     Demo administration: active clinic, seeding
  calls/ clinics/ patients/ health/  Thin CRUD/read controllers
  prisma/                    PrismaService (connection lifecycle)
  config/demo-config.ts      In-memory "active clinic" singleton for demos
```

### Data model (Prisma)

`clinic` 1—n `doctor`, `patient`, `service`, `appointment`, `call`,
`conversation_script`, `outbound_call`. `patient` carries insurance fields,
JSON-string medical/dental history, preferences (doctor/time/days/language),
and recall tracking. `call` stores transcript, intent, outcome, duration, and
quality/sentiment fields. `conversation_log` stores per-turn records with
tool-call metadata for ML. `escalation` and `feedback` support the human
side; `ml_model` tracks fine-tune artifacts (schema only — no training code
runs in this repo).

## End-to-end data flow (Path A — self-hosted loop)

1. **Call arrives**: Twilio POSTs `To`, `From`, `CallSid` to `/webhook/voice`.
2. **Spam gate**: `SpamDetectionService.checkSpam` scores the caller against
   blocklist, prefix/keyword patterns and call history; a block returns a
   polite rejection TwiML and logs `outcome: 'spam'`.
3. **Clinic resolution**: `clinic.findFirst({ phone: To })` — the called
   number is the tenant key. Unknown number → error TwiML.
4. **Session init**: `DentsiAgentService.initializeSession` builds
   `PatientContext` from the caller's number, loads active doctors/services,
   renders the system prompt (`buildAgentSystemPrompt`: personality, today's
   date for date validation, patient context summary, doctors, services,
   flows, guardrails), stores the session in the in-process `Map`, starts ML
   conversation logging, and generates a context-aware greeting (upcoming
   appointment > overdue cleaning > preferred doctor > default).
5. **Turn loop**: The TwiML response speaks the reply
   (`Polly.Joanna-Generative`) and issues `<Gather input="speech dtmf">`
   (speech model `phone_call`, enhanced). Twilio posts the transcription to
   `/webhook/gather`; DTMF digits are mapped to speech equivalents ("1" →
   "Yes, confirm"); silence becomes a `[silence]` token.
6. **Agent loop**: each turn appends the user message, runs sentiment
   analysis, then calls OpenAI with the 17 tool definitions
   (`temperature 0.7`, `max_tokens 300` — sized for voice). Tool calls are
   executed sequentially against Prisma/scheduling/triage, results are
   appended as `tool` messages, and the loop re-invokes the model until a
   plain response or the 5-iteration cap (cap → "let me connect you with
   staff").
7. **Call end**: `/webhook/end` or `/webhook/status` (completed/failed/busy/
   no-answer) triggers `endSession`: outcome classification (booked /
   rescheduled / cancelled / escalated / inquiry_answered, keyword-based over
   the last turns), transcript upsert into `call`, per-turn persistence into
   `conversation_log`, session deletion.
8. **Read side**: dashboards poll `/api/dashboard/*`, `/transcript/live`, and
   analytics endpoints.

## End-to-end data flow (Path B — ElevenLabs-hosted agent)

ElevenLabs Conversational AI owns STT, the LLM turn loop (provisioned with
`gemini-2.0-flash` by `elevenlabs-agent/deploy-dentsi-agent.ts`), TTS, and
barge-in. The backend is the system of record via five webhook tools:
`lookup-patient` (phone-variant matching, returns patient + clinic context),
`check-availability` (9:00–17:00, 30-minute grid minus booked slots — simpler
than Path A's preference-aware `SchedulingService`), `book-appointment`
(find-or-create patient, insurance update, appointment insert),
`get-services` (DB catalog with hardcoded fallback list), and
`log-conversation` (bilingual summary → `call` row + live-transcript line).
Clinic selection falls back through request `clinic_id` → demo active clinic
→ first active clinic. Note the two paths intentionally duplicate booking
logic; see trade-offs.

## Orchestration analysis: what runs parallel, sequential, async — and why

- **Sequential (the agent loop)**: model → tools → model is inherently
  serial; tool results feed the next completion. Tool calls within one model
  response are also executed serially in a `for` loop — simpler bookkeeping
  for conversation-history ordering, at some latency cost when the model
  requests multiple tools.
- **Parallel (context assembly)**: session init fetches doctors and services
  with `Promise.all`; independent reads are parallelized where they exist.
- **Async/background**: outbound calling is fully decoupled from the inbound
  path — `outbound_call` rows are due-scheduled and drained by a 5-minute
  cron (`processScheduledCalls`), with a daily 09:00 recall sweep. Failures
  reschedule (max 3 attempts, +2 hours) and respect per-clinic calling-hour
  windows. This queue-in-Postgres design gives durability without extra
  infrastructure.
- **Blocking trade-off**: the sentiment pass runs *before* the agent call on
  every turn, adding latency to each voice turn; its output is logged and
  used for tone recommendations rather than gating logic.

## State and context engineering

- **Session state** is an in-process `Map<CallSid, CallSession>` holding the
  full message history (system/user/assistant/tool), booking flags, and the
  created-patient id. Bounded only by call length; cleared on call end. A
  restart or a second instance loses/misses live sessions — acceptable for a
  demo, the first thing to externalize for production (see HARDENING).
- **Context assembly** is deliberately front-loaded: rather than giving the
  model a `lookup_patient` round-trip on every call, the caller's entire
  relevant history is summarized into the system prompt at session start
  (returning-patient summary with visit recency, cleaning-due flag,
  preferred doctor, insurance status, allergy/no-show warnings). Tools exist
  for the deeper pulls (`get_patient_history`, `get_medical_alerts`).
- **Context bounding**: responses are capped (`max_tokens 300`) for voice
  pacing; the history itself is not truncated or summarized mid-call — fine
  for minutes-long calls, a real cost/context risk only for unusually long
  ones.
- **Determinism scaffolding**: the prompt embeds today's date and mandates
  day-of-week validation; `validate_date` and `parse_natural_date` are
  deterministic code, not model guesses — a deliberate split of "language in
  the model, arithmetic in code".
- **Other in-memory state**: conversation-script cache (5-minute TTL per
  clinic), live-transcript ring buffer (800 lines), spam block/allow lists,
  demo active-clinic singleton. All single-instance by design.

## Design decisions and trade-offs visible in the code

1. **Single agent + tools over multi-agent handoff.** The repo contains an
   earlier decomposition (voice/scheduler/policy/ops agents); the shipped
   path collapsed it into one function-calling agent with deterministic
   services as tools. Fewer LLM hops per turn (voice latency), simpler state,
   at the cost of a single prompt carrying all behavior.
2. **Two integration depths for voice.** Path A keeps full control (own STT/
   TTS/LLM choices, own loop) on Twilio primitives; Path B buys ElevenLabs'
   turn-taking latency and barge-in and reduces this backend to tools. The
   cost is duplicated booking logic and a simpler availability model on
   Path B — divergence between the two is the main consistency risk.
3. **TwiML request/response over media streaming.** Path A uses Twilio
   `<Gather>`/`<Say>` round-trips rather than bidirectional audio streams:
   much simpler, but each turn pays webhook + completion latency, and
   ElevenLabs TTS in Path A works by writing MP3 files served back over HTTP
   rather than streaming.
4. **Postgres as the only infrastructure.** Queue (outbound calls), analytics
   aggregations, ML training corpus, and audit surface all live in the same
   database. Operationally minimal; the in-memory pieces (sessions,
   transcripts, blocklists) mark exactly where a second instance would break.
5. **Feature-flag by key presence.** Deepgram and ElevenLabs activate when
   their API keys exist, with Twilio built-ins as the fallback — the system
   degrades gracefully to a zero-extra-vendor configuration.
6. **Committed dashboard export.** The Next.js dashboard is statically
   exported into `nodejs_space/public/dashboard/` so one process serves UI
   and API same-origin. Deploys are single-artifact; the price is a manual
   rebuild-and-copy step and a stale-export risk (the committed chunks still
   embed a legacy hosting URL as a fallback API base).
7. **Guardrails in prompt + code.** "Never give medical advice", insurance
   collection, and escalation rules live in the prompt; escalation records,
   spam gating, urgency scoring, and date validation are enforced in code —
   the enforceable subset was pulled out of the model's hands.

## Extending this system

Grounded next steps the current architecture makes straightforward:

1. **Externalize live-call state.** `CallSession`, the transcript buffer, and
   spam lists are the only things blocking horizontal scale. The
   `live-transcript.store.ts` comment already names the move (Redis or
   DB-backed); `CallSession` serializes cleanly since it is plain data plus
   Prisma ids.
2. **Unify the two booking paths.** Port the ElevenLabs tool endpoints onto
   `SchedulingService`/`AgentToolsService` so Path B gains conflict
   detection, preference-aware slots, and alternative suggestions instead of
   its 30-minute grid. The tool contracts already overlap almost 1:1.
3. **Close the fine-tuning loop.** `conversation_log`, `feedback`
   (corrections with per-turn granularity), `training-export.service.ts`
   (JSONL + validation split + cost estimate), and the `ml_model` table are
   all present; what's missing is the job that submits an export to a
   fine-tune API and flips `OPENAI_MODEL`. The schema was built for exactly
   this.
4. **Real confirmations over SMS.** Booking responses already claim "you'll
   get a text reminder", and Twilio is integrated for voice; adding a
   messaging service and a `POST`-booking SMS hook is a contained change in
   `agent-tools.service.ts`/`elevenlabs-tools.controller.ts`.
5. **Per-clinic conversation scripts in anger.** `conversation_script` +
   `ConversationScriptService` (conditions, priorities, per-language
   templates, caching) are fully built but the live prompt is still the
   hardcoded `buildAgentSystemPrompt`. Moving the prompt body into scripts
   makes tone and flow a tenant-level configuration instead of a deploy.
