# Hardening & Production Readiness

Current security/operations posture as found in the code, followed by a
staged ladder to production. This system handles health information; read the
health-data note before deploying it anywhere real.

## Current posture

**Authentication & authorization**
- No authentication on any HTTP endpoint. Dashboard APIs, analytics, ML
  feedback/export, admin endpoints (`/admin/set-active-clinic`,
  `/admin/seed-*`), outbound-call triggers, and the ElevenLabs tool webhooks
  are all publicly callable on a deployed instance.
- The one existing control: `POST /transcript/line|lines|reset` checks an
  `x-webhook-secret` header **if** `TRANSCRIPT_WEBHOOK_SECRET` is set;
  unset, writes are open.
- Twilio webhooks do not validate the `X-Twilio-Signature` header — any
  HTTP client can impersonate Twilio. `TWILIO_SETUP.md` documents this as a
  known development shortcut and shows the `validateRequest` fix.
- CORS is `origin: '*'` with `credentials: true` in `main.ts`; the
  `CORS_ORIGINS` env var is documented but not consulted.

**Secrets handling**
- All credentials come from `.env` via `@nestjs/config`; `.gitignore`
  excludes `.env` at every level and `nodejs_space/.env.example` contains
  placeholders only. No secrets manager, no rotation story.
- Twilio credentials are used server-side only; the ElevenLabs voice IDs in
  the repo are public identifiers, not secrets.

**Error handling**
- Consistent try/catch with caller-friendly fallback TwiML/messages across
  webhook, agent, and tool layers; tool failures return structured
  `{ success: false, message }` so the model can recover conversationally.
- A few intentional silent catches exist (e.g. spam-call logging ignores an
  invalid clinic id). No global exception filter; no OpenAI call timeout or
  retry in the main loop beyond SDK defaults.

**State & data**
- Live-call sessions, the transcript buffer, spam block/allow lists, and the
  demo active-clinic flag are in-process memory: a restart drops live calls
  and a second instance would not share state (the transcript store's own
  comment says "replace with Redis or DB-backed store" for multi-instance).
- Generated ElevenLabs audio is written under `public/audio/` and served
  without authentication; call transcripts are readable through
  unauthenticated dashboard/transcript endpoints.
- The devcontainer launches Streamlit with CORS and XSRF protection
  disabled — demo convenience flags, not production settings.
- The committed dashboard static export embeds a legacy hosting URL as a
  compiled fallback API base; rebuilding the export (see
  `dashboard/README.md`) is required to change it.

**Observability**
- Nest `Logger` to stdout throughout (emoji-tagged, readable). No structured
  logging, metrics, tracing, or alerting. `GET /health` is a static liveness
  response; `GET /api/dashboard/health` derives error/success rates from
  stored calls. Per-turn model latency is persisted to
  `conversation_log.response_time_ms`.

**Health-data posture (read this)**
This system stores protected health information: patient names, dates of
birth, phone numbers, insurance member IDs, medical/dental history, staff
notes, and full call transcripts. In its current state it is a
**demonstration system and is not HIPAA-ready**: endpoints exposing PHI are
unauthenticated; there is no access control, no audit trail of PHI access
(the policy agent's consent capture and PHI audit logging write to
application logs and a JSON blob, not dedicated audit tables); encryption at
rest is whatever the database host provides; and PHI flows to third-party
processors (OpenAI, Twilio, and optionally Deepgram/ElevenLabs — plus the
LLM provider selected in the ElevenLabs console) that would each require a
Business Associate Agreement and a data-processing review before real
patient use. The call-recording consent line exists in the agent prompts,
but consent is not durably recorded per call. Do not point this at real
patients until Stage 4 below is complete.

## Ladder to production

### Stage 1 — Identity, keys, and the front door
1. Validate `X-Twilio-Signature` on every `/webhook/*` route (code sample in
   `TWILIO_SETUP.md`); reject unsigned requests.
2. Put authentication on everything else: an API-key or JWT guard for
   dashboard/analytics/ML/outbound routes, a separate shared-secret guard
   for `/elevenlabs/tools/*` (ElevenLabs supports custom headers per tool),
   and admin routes restricted or removed in production builds.
3. Make `TRANSCRIPT_WEBHOOK_SECRET` mandatory in production config; fail
   closed when unset.
4. Replace `origin: '*'` with the already-documented `CORS_ORIGINS`
   allowlist.
5. Move secrets to a managed store (cloud secret manager) and inject at
   deploy; add `BACKEND_URL`/`TRANSCRIPT_WEBHOOK_SECRET` to `.env.example`
   so the contract is complete.
6. Serve generated audio via signed, expiring URLs (or stream TTS inline)
   instead of the open `public/audio/` directory.

### Stage 2 — Observability
1. Structured JSON logging with call SID as a correlation id (the loggers
   already thread it through as text).
2. Metrics: request latency, OpenAI latency per turn (source exists in
   `conversation_log`), tool-failure rate, gather-timeout rate, outbound
   retry counts, cron-drain lag.
3. Alerting on webhook 5xx rate, agent-loop max-iteration bailouts, and the
   dashboard-health "degraded/critical" states that
   `dashboard.service.getSystemHealth` already computes.
4. Error tracking (e.g. an exception-aggregation service) behind a global
   Nest exception filter; eliminate the remaining silent catches.

### Stage 3 — Deployment shape
1. Externalize live state: `CallSession` map and the live-transcript buffer
   to Redis (the code comments already call this out), spam lists to the
   database. This unlocks multiple instances and zero-downtime deploys.
2. Add timeouts and bounded retries around OpenAI/Deepgram/ElevenLabs calls;
   the agent already degrades conversationally on failure, so a timeout can
   reuse that path.
3. CI: run lint + the e2e suites against ephemeral Postgres (see
   `docs/EVALUATION.md` for the gating design); run `prisma migrate deploy`
   as a release step rather than by hand.
4. Automate the dashboard export (build `dashboard/` → copy into
   `nodejs_space/public/dashboard/`) so the committed artifact cannot drift
   from source, and rebuild it to drop the legacy compiled fallback URL.
5. Database backups with tested restore; connection pooling sized for the
   cron + webhook concurrency.
6. Rate-limit the public webhooks and demo endpoints (they invoke paid LLM
   calls).

### Stage 4 — Compliance (before real patient data)
1. BAAs with every PHI processor in the path: telephony, LLM, STT, TTS
   vendors; verify the ElevenLabs agent's selected LLM is covered or switch
   Path B off.
2. Encrypt PHI at rest (managed Postgres encryption + application-level
   encryption for insurance IDs and medical history), TLS everywhere.
3. Durable consent records per call and dedicated audit tables for PHI
   access (promote the policy agent's illustrative logging into schema-backed
   writes; the `escalation`/`feedback` tables show the pattern).
4. Data retention and deletion policy for transcripts, audio files, and
   `conversation_log`; honor deletion requests across the ML export files in
   `ML_TRAINING_DATA_PATH` too.
5. Role-based access in the dashboard (front desk vs. admin), and
   de-identification of training exports before any fine-tuning run.
6. External review: penetration test of the webhook surface and a HIPAA
   security-rule risk assessment.

## Secrets audit at HEAD

A sweep of the tree at HEAD (key-shaped strings, tokens, connection strings,
committed `.env`/key files) found **no live credentials**: `.env` files are
gitignored and absent, `nodejs_space/.env.example` is placeholder-only, and
the only key-like strings are public ElevenLabs voice IDs. Accordingly there
are no credentials to rotate. Housekeeping removals in this documentation
pass: an opaque encrypted workspace-state file from a previous hosting
setup, a `.DS_Store`, and an empty `dashboard/package.json.tmp` stub were
deleted; `.DS_Store` is now gitignored. Note that git *history* predates this audit —
if this repository is ever made public, run a history-wide scanner (e.g.
gitleaks) before publishing.
