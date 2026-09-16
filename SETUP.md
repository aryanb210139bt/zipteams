# Setup — wiring up real credentials

Nothing below is required to run or review the app — see the Quick Start in README.md.
This is for turning individual mocks into the real integration.

## Database (Neon or Supabase Postgres)

1. Create a Postgres database (Neon: neon.tech; Supabase: supabase.com — enable the
   `pgvector` extension there for future semantic transcript search).
2. Set `DATABASE_URL` in `.env.local`.
3. `npm run db:generate` (only if you've changed `src/lib/db/schema.ts`) then
   `npm run db:migrate && npm run db:seed`.

The same `src/lib/db/schema.ts` and every query in `src/lib/db/queries.ts` work unchanged
against either driver — only `src/lib/db/index.ts` branches on `DATABASE_URL`.

### Using a real Postgres database (Neon)

Setting `DATABASE_URL` in `.env.local` switches the app from the local embedded PGlite file
(`./.data/local-db`) to whatever real Postgres database that URL points at — nothing else to
configure. The first time you switch, run `npm run db:migrate && npm run db:seed` once
against the new database (its schema starts out empty; PGlite's local data doesn't carry
over).

**Pooled vs. direct connection string.** Neon gives you two connection strings per branch:
a pooled one (hostname contains `-pooler`, routed through PgBouncer in transaction mode) and
a direct/unpooled one. Neon's own docs recommend the pooled string for normal app traffic but
warn that running migrations through it can fail, since transaction-mode pooling doesn't
reliably support the session-level behavior migration tools rely on. So:

- `DATABASE_URL` → the **pooled** connection string (what the app uses at runtime).
- `DIRECT_DATABASE_URL` → optional, the **direct/unpooled** connection string. Set this too
  if `DATABASE_URL` is pooled — `npm run db:migrate` and `drizzle-kit` (`npm run db:generate`)
  both prefer it when present, so migrations run against the direct connection while the app
  keeps using the pooled one. If you only ever set `DATABASE_URL` to Neon's direct string,
  you don't need `DIRECT_DATABASE_URL` at all — but then the app runtime loses pooling.

See `.env.example` for both variables.

## Auth (Clerk)

1. Create an app at dashboard.clerk.com.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. `middleware.ts` will start requiring sign-in; `lib/auth.ts` will look up the signed-in
   Clerk user by `clerkUserId` in the `users` table — an admin needs to invite/create that
   row first (Setup → Manage Team doesn't yet write `clerkUserId` on invite; wire that up
   alongside a real Clerk organization-per-institution mapping when you turn this on).
4. Add sign-in/sign-up routes (`src/app/sign-in/[[...sign-in]]/page.tsx` etc. using
   `<SignIn />` from `@clerk/nextjs`) — not included since they're unreachable without Clerk
   configured.

## Transcription (Deepgram)

Set `DEEPGRAM_API_KEY`. `lib/integrations/deepgram.ts` calls nova-2 with diarization and
feeds the org's `glossary_terms` in as boosted keywords. Requires a real, publicly
reachable `audio_url` on the conversation row (wire up real audio storage first — see
below).

## Translation (Google Cloud Translation)

Set `GOOGLE_TRANSLATE_API_KEY`. Runs after transcription, translating every transcript line
to English.

## LLM scoring (Anthropic Claude)

Set `ANTHROPIC_API_KEY`. Uses `claude-sonnet-5` by default (override with `CLAUDE_MODEL`).
The prompt + tool schema live in `lib/integrations/claude.ts` — bump `PROMPT_VERSION` there
whenever you change either, since every score/verdict row records it.

## Audio storage

Set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`STORAGE_BUCKET` and `lib/integrations/storage.ts`
re-hosts CRM-sourced recordings (see below) into that bucket before transcription, normalizing
to mono/16kHz mp3 via `ffmpeg` first (falls back to uploading unnormalized audio with a warning
if `ffmpeg` isn't on PATH — **deployment decision needed**: this repo has no Dockerfile, so
whoever deploys to Render needs to add `ffmpeg` as a build-time apt package). Manual/CSV upload
still accepts an already-hosted `audioUrl` directly and is never re-hosted. Only the resulting
signed URL is ever persisted on `conversations.audioUrl` — never the raw file in Postgres.

Cleanup of re-hosted recordings (`lib/inngest/functions/storage-cleanup.ts`) is **off by
default** — set `CLEANUP_REHOSTED_RECORDINGS=true` once it's decided whether Kalvium needs
long-term audio retention for compliance/QA review (open question, PRD § 9.1).

## Speech-to-text (Sarvam Batch STT)

Set `SARVAM_API_KEY`. `lib/integrations/sarvam.ts` submits the recording to Sarvam's async
Batch STT job (submit → upload → start → poll → download), orchestrated as durable Inngest
steps in `lib/pipeline/sarvam-transcribe.ts` so an in-flight job survives a restart instead of
being resubmitted. Calls sourced from the LeadSquared sync (`source = 'crm_recordings'`) route
here; everything else keeps using Deepgram — see `lib/pipeline/provider-selection.ts`. The
exact Sarvam request/response shapes were reconstructed from public docs (this environment's
egress proxy blocks `docs.sarvam.ai` directly) — verify against a live account before relying
on this in production.

## Background jobs (Inngest)

For local dev with real retries/observability: `npx inngest-cli dev` (listens on
`:8288`, auto-discovered) — or set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` for the hosted
service. Without either, `lib/pipeline/trigger.ts` runs the pipeline inline instead (see
README).

## CRM (Leadsquared)

Configure per-org from Setup → Leadsquared (writes to `organizations.leadsquaredConfig`),
or set `LEADSQUARED_ACCESS_KEY`/`LEADSQUARED_SECRET_KEY`/`LEADSQUARED_HOST` as an
environment-level fallback. `leads.crmRecordUrl` holds the Leadsquared ProspectId in both
directions — outbound (`pushCallScoreToLeadsquared`) and now inbound too.

**Inbound sync** (`lib/inngest/functions/leadsquared-sync.ts`, cron every 15 min): discovers
new Phone Call activities per org with `leadsquaredConfig.enabled`, creates a lead (matched
on `crmRecordUrl`) and a `conversations` row per call, then immediately triggers the
download+transcribe pipeline. This additionally needs `LEADSQUARED_PHONE_CALL_ACTIVITY_EVENT`
(and optionally `LEADSQUARED_RECORDING_URL_FIELD`/`LEADSQUARED_LEAD_NAME_FIELD`), which are
outputs of `.github/workflows/leadsquared-discovery.yml` — **run that workflow once against
the real account first**; until the ActivityEvent env var is set, the sync cron no-ops with
a warning for every org, same "unset key → safe no-op" convention as every other integration.

## Email (Resend)

Set `RESEND_API_KEY`. Sends flagged-call alerts to every `admin`/`qa_reviewer` in the org
when a call's risk level isn't `likely_genuine`.

## Deployment

Deploy the Next.js app to Vercel as usual. Add `SENTRY_*`/`NEXT_PUBLIC_SENTRY_DSN` and
`NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` and wire up their SDKs (not included —
no accounts to test against in this environment) for error tracking and product analytics.
