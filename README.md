# CallIQ — Conversation Intelligence Platform

A full-stack conversation-intelligence app for an admissions/sales team: it ingests call
transcripts/recordings, scores them against a fixed multi-parameter audit rubric, flags
likely-fabricated calls, and surfaces everything in a dashboard modelled on Kalvium's
"Conversations Insights" product (Leads, multi-channel Conversations, Leaderboard, Setup/
Integrations) with the audit/scoring pipeline from the original build brief underneath it.

**Runs with zero external accounts.** Every third-party integration (Deepgram, Google
Translate, Anthropic Claude, Leadsquared, Resend, Clerk) has a deterministic mock fallback,
and the database defaults to an embedded, zero-config Postgres (PGlite) — see
[What's real vs. mocked](#whats-real-vs-mocked) below.

## Quick start

```bash
npm install
npm run db:reset   # runs migrations + seeds a demo org ("Kalvium") end to end
npm run dev
```

Open http://localhost:3000 — you're signed in automatically as the seeded admin user
(`aparna.pillai@kalvium.com`) with 26 leads, ~57 scored conversations, a populated
dashboard, leaderboard, and a few calls already sitting in the review queue.

See [SETUP.md](./SETUP.md) for wiring up real credentials for any of the integrations
below, and [DECISIONS.md](./DECISIONS.md) for how this build reconciles the two source
documents it was built from.

## Tech stack

- **Frontend**: Next.js 15 (App Router) + TypeScript, Tailwind CSS v4, hand-rolled
  shadcn/ui-style components (the shadcn CLI's registry wasn't reachable from this sandbox,
  so `src/components/ui/*` is written directly against the same Radix primitives/API shape),
  TanStack Query, Zustand-ready client state, Recharts.
- **Backend**: Next.js Route Handlers (`src/app/api/**`), Zod validation on every request
  body and on every LLM structured output.
- **Database**: Drizzle ORM against Postgres. Set `DATABASE_URL` for a real Neon/Supabase
  instance; leave it unset for local dev and it falls back to an embedded PGlite database
  at `./.data/local-db` — same schema, same SQL dialect, same Drizzle query API either way.
- **Auth**: Clerk, opt-in via env vars (see SETUP.md). Without it, `lib/auth.ts` returns the
  seeded org's admin user so the whole app is reviewable with no account.
- **Pipeline**: Inngest (`upload → transcribe → translate → score → notify`), with every
  step idempotent (re-checks DB state before calling a billable API) and a resilient inline
  fallback (`lib/pipeline/trigger.ts`) that runs the pipeline synchronously in-process when
  Inngest isn't reachable, so uploads still complete end to end.
- **LLM**: Anthropic Claude (`claude-sonnet-5` by default), Messages API with a forced tool
  call for structured JSON output, validated against `lib/validations/scoring.ts`.

## What's real vs. mocked

| Integration | Real when configured | Mock fallback |
|---|---|---|
| Database | `DATABASE_URL` → Postgres via `postgres` + drizzle-orm/postgres-js | Embedded PGlite at `./.data/local-db` |
| Auth | Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`) | Seeded admin user, no sign-in |
| Transcription | Deepgram (`DEEPGRAM_API_KEY`), nova-2 + diarization + glossary word-boost | Deterministic canned transcript |
| Translation | Google Cloud Translation (`GOOGLE_TRANSLATE_API_KEY`) | Passthrough (assumes English) |
| Scoring | Anthropic Claude (`ANTHROPIC_API_KEY`) | Deterministic heuristic scorer (`[mock]`-prefixed rationale) |
| CRM push | Leadsquared (org-level config in Setup, or `LEADSQUARED_*` env) | Console log of what would be pushed |
| Alerts | Resend (`RESEND_API_KEY`) | Console log of the email that would be sent |
| Async jobs | Inngest (`INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`, or `npx inngest-cli dev`) | Pipeline runs inline, synchronously, in the request that triggered it |

Every score/verdict row stores `llmPromptVersion` for auditability, whichever path produced it.

## Project structure

```
src/
  app/
    (shell)/                    authenticated app: sidebar + all pages
      conversations-insights/   Dashboard / Insights / Leaderboard tabs
      all-conversations/        flat leads table + inline filter bar
      leads/[id]/                Lead Detail: Insights, Conversations, Profile, Tasks, Notes, WhatsApp
      review-queue/              Flagged for Review + reviewer sign-off
      upload/                    single-call + bulk CSV ingest
      setup/                     admin: profile, team, rubric, glossary, qualification rules,
                                  Leadsquared config, integration connector template pages
    api/                        Route Handlers (CRUD + upload + Inngest webhook)
  components/                   ui/ (hand-rolled shadcn), shell/, shared/, filters/, dashboard/, …
  lib/
    db/                         schema.ts, seed.ts, queries.ts (read layer), mutations.ts
    integrations/               claude.ts, deepgram.ts, translate.ts, leadsquared.ts, resend.ts
    inngest/                    client + the call-pipeline function
    pipeline/                   execute.ts (shared step logic), run-inline.ts, trigger.ts
    rubric-seed-data.ts         the 11 audit categories + parameters
    auth.ts / roles.ts          current-user resolution + role checks (roles.ts is client-safe)
```

## The audit rubric

Seeded from `lib/rubric-seed-data.ts`: **Authenticity/Fabrication Risk, Compliance,
Introduction, Discovery, Program Pitch, Differentiation, Objection Handling, Webinar CTA,
Closure, Soft Skills, Ethical Red Flags** — 11 categories, each with 2-4 parameters weighted
minor/important/critical. Authenticity/Fabrication Risk carries weight `0` in the overall
score (it's diagnostic input to `call_verdicts.riskLevel` instead, alongside Claude's
dedicated authenticity pass). Edit categories/parameters live from Setup → Rubric editor.

## Known gaps

Anything the source PRD itself flagged as "not captured in screenshots" ships as an honest
empty state rather than an invented design: Companies (basic list only), My Conversations,
Shared With Me, Custom Reports, Lead Detail's Profile/WhatsApp sub-tabs, the Insights tab's
populated state, and the Dashboard's "Call Quality Gap" toggle. See `DECISIONS.md` for the
full reasoning and `PHASING.md` for what's built vs. remaining against the original 8-phase
build order.
