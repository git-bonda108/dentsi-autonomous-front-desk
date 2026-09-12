# Evaluation

An honest inventory of what is tested today, what the code visibly handles,
and the evaluation harness this system should have.

## What automated tests exist

There are **no unit tests** (`src/` contains zero `*.spec.ts` files; `npm
test` finds nothing). All automated coverage is end-to-end, run with:

```bash
cd nodejs_space
npm run test:e2e   # jest --config ./test/jest-e2e.json (testRegex .e2e-spec.ts$)
```

| Spec file | Cases | What it covers |
|-----------|------:|----------------|
| `test/app.e2e-spec.ts` | 1 | Boot smoke test (`GET /`) |
| `test/e2e/call-flow.e2e-spec.ts` | 10 | TC-001…TC-008: health check, incoming-call TwiML for a known patient, speech-input processing, call-end handling, spam keyword detection + known-patient exemption, analytics dashboard payload, ML quality-rating submission, recall-patient listing. Creates and cleans its own clinic/patient fixtures. |
| `test/batch2-agents.e2e-spec.ts` | 22 | Ten scenarios against the specialist agent services: intent determinism, new-patient booking, reschedule, emergency escalation, no-availability handling, consent capture + PHI audit-log calls, revenue-aware slot prioritization, retry on simulated timeout, inquiry handling, conflict detection, agent wiring. |
| `test/batch3-dashboard.e2e-spec.ts` | 35 | The `/dashboard/*` API: stats with clinic/date filters, paginated calls/appointments with filters, escalation queue + resolve (including 404 and non-escalation cases), system health payload shape, revenue calculation, pagination edge cases (page beyond range, `limit=1`), open-ended date ranges. |

Total: 68 `it(...)` cases across 4 spec files.

**Preconditions the suites do not mock.** All four boot the full `AppModule`:
they need a reachable `DATABASE_URL` (batch2 additionally assumes a seeded
clinic exists), and the batch2 scenarios call the **live OpenAI API** through
`VoiceAgentService` → `OpenAIService`. Without those keys the LLM-dependent
cases exercise only the error-fallback paths. There is no CI configuration in
the repository; nothing runs these automatically.

**A structural caveat**: the batch2 suite tests the *specialist* agent
services (voice/scheduler/policy/ops), which are not in the live webhook
path; the production `DentsiAgentService` tool loop is exercised only
indirectly via the call-flow spec's webhook tests and has no direct automated
coverage of its 18 tools.

**Manual test specification.** `nodejs_space/docs/MVP_TEST_CASES.md` defines
63 structured manual cases (TC-001…TC-072) across inbound flow, scheduling,
triage, outbound, ML/analytics, dashboard, API validation, and integration,
including a critical path and a 4-step smoke test. It is a spec, not a
recorded run.

**Metrics.** No benchmark or accuracy numbers exist in the repository, and
none are claimed here. The code *records* per-turn latency
(`conversation_log.response_time_ms`), sentiment scores, and outcomes, and
`GET /api/dashboard/health` derives error/success rates from stored calls —
these are runtime observables, not evaluation results.

## Edge cases the code visibly handles

Enumerated from the source, with locations:

**Inbound call path**
- Spam gating before the agent answers: weighted prefix/keyword/behavior
  scoring, blocklist/allowlist, polite rejection TwiML, `outcome: 'spam'`
  logging (`analytics/spam-detection.service.ts`, `webhook.service.ts`).
- Unknown called number → "couldn't connect you to the clinic" error TwiML;
  any bootstrap exception → system-error TwiML (`webhook.service.ts`).
- Lost/unknown session on a gather callback → apologize and ask to call back
  (`dentsi-agent.service.ts#processUserInput`).
- Silence: `<Gather>` timeout re-prompts once ("Are you still there?") then
  ends the call politely; empty gather posts are fed to the agent as
  `[silence]` (`webhook.service.ts`, `webhook.controller.ts`).
- DTMF fallback: keypad digits map to speech equivalents (1=confirm,
  2=reschedule, 3=cancel, 0=staff) so the flow works without speech.
- Agent-loop runaway: hard cap of 5 tool iterations per turn, then a
  transfer-to-staff response.
- Any exception inside a turn → graceful recovery message, and a
  transfer-to-staff message if processing fails outright.

**Correctness guards**
- Date/day-of-week mismatch: `validate_date` detects "Tuesday the 26th" when
  the 26th is a Monday and suggests the correct date; the system prompt
  forbids booking on mismatches.
- Natural-language dates ("next Tuesday", "January 26th") parsed in code with
  past-date → next-year rollover; unparseable input returns a clarifying
  question instead of a guess.
- Booking conflicts: `SchedulingService.bookAppointment` detects collisions
  and returns alternative slots, which the tool surfaces as a counter-offer.
- Phone-number matching tolerates formatting variants (last-10-digits
  matching in the ElevenLabs tools; exact match in Path A).
- `create_patient` is idempotent on phone number (returns the existing
  record); `book_appointment` falls back to session patient ids when the
  model omits them.
- JSON stored as strings (medical history, hours, preferences) is parsed in
  try/catch with safe defaults everywhere it is read.

**Degradation and async resilience**
- Missing Deepgram/ElevenLabs keys feature-flag those services off; Twilio
  built-in STT/TTS remain the working default. ElevenLabs TTS or Deepgram
  errors are caught and fall back to the default path.
- Outbound calls: max 3 attempts with a 2-hour backoff, per-clinic calling
  -hour windows, `no-answer`/`busy`/`failed` status handling, and
  answering-machine detection routed via Twilio's `AnsweredBy`.
- Escalations are durable rows (`escalation` table) created by an explicit
  agent tool with type and priority, not just log lines.
- `get-services` returns a hardcoded default catalog if a clinic has none;
  transcript webhook rejects writes when a configured shared secret is
  absent or wrong.

**Known gaps (also visible in the code)** — no Twilio signature validation,
no timeout/retry wrapper around OpenAI calls in the main loop (a hang rides
on SDK defaults), outcome classification is keyword-based over the last five
messages, and in-memory session state means a crash mid-call loses the
conversation. These are hardening items, not silent assumptions — see
`docs/HARDENING.md`.

## Proposed evaluation harness

*This section is a design, not a description of anything that exists.*

The system's quality question is: **does a call end in the correct database
state with an acceptable conversation?** A harness should measure exactly
that, offline, without Twilio.

1. **Golden conversation dataset.** 50–150 scripted calls as JSONL, each:
   `{ persona, clinic_fixture, turns: [caller utterances], expected: {
   outcome, appointment? {service, doctor?, date_constraint}, patient_created?,
   escalation? {type, priority}, insurance_captured? } }`. Seed personas from
   `MVP_TEST_CASES.md` (new/returning/emergency/spam/reschedule/no-show
   history) plus adversarial cases: date-day mismatches, ambiguous dates,
   double-booking attempts, mid-call topic switches, callers refusing
   insurance.
2. **Driver.** Reuse the existing Twilio-free entry point: `POST
   /webhook/demo/start` + `/webhook/demo` already run the full production
   agent loop against the database. The harness replays each scripted turn
   and reads final state via Prisma.
3. **Deterministic gates (hard pass/fail):** correct `call.outcome`;
   appointment row matches expected service/constraints with no conflict;
   patient row created/updated as expected; escalation row present with the
   right priority for emergency scripts; zero occurrences of forbidden
   content (medical advice patterns, other patients' data) in the
   transcript.
4. **Scored metrics (tracked, thresholded):** task success rate per intent
   class, tool-call efficiency (turns and iterations per booking), p50/p95
   model latency per turn (already logged as `response_time_ms`), and an
   LLM-judged conversation-quality rubric (politeness, confirmation read-back
   compliance, insurance-ask compliance) — judged results advisory until
   validated against the human ratings the `feedback` table already
   collects.
5. **Gating.** Run the deterministic subset (temperature 0, pinned model) in
   CI on every PR against ephemeral Postgres; run the full scored suite
   nightly and before any `OPENAI_MODEL` or prompt change, diffing against
   the previous run. Fine-tune candidates from `training-export.service.ts`
   must beat the incumbent on gates before `ml_model.is_active` flips.
6. **Path B coverage.** The ElevenLabs-hosted loop cannot be replayed
   offline; cover its backend contract with request-level tests of the five
   `/elevenlabs/tools/*` endpoints (idempotent booking, phone-variant
   lookup, clinic fallback chain), and treat live-call QA as a manual
   checklist per `MVP_TEST_CASES.md`.
