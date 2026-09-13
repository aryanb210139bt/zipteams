# Setup — wiring up real credentials

Nothing below is required to run or review the app — see the Quick Start in README.md.
This is for turning individual mocks into the real integration.

## Database (Neon or Supabase Postgres)

1. Create a Postgres database (Neon: neon.tech; Supabase: supabase.com — enable the
   `pgvector` extension there for future semantic transcript search).
2. Set `DATABASE_URL` in `.env`.
3. `npm run db:generate` (only if you've changed `src/lib/db/schema.ts`) then
   `npm run db:migrate && npm run db:seed`.

The same `src/lib/db/schema.ts` and every query in `src/lib/db/queries.ts` work unchanged
against either driver — only `src/lib/db/index.ts` branches on `DATABASE_URL`.

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

Not wired up yet (`lib/integrations/storage.ts` is a stub). The upload flow currently
accepts an already-hosted `audioUrl` directly. To add real upload: point
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (or any S3-compatible bucket) at
`lib/integrations/storage.ts`, generate a signed upload URL from
`src/app/api/upload/single/route.ts`, and store only the resulting signed URL on
`conversations.audioUrl` — never the raw file in Postgres.

## Background jobs (Inngest)

For local dev with real retries/observability: `npx inngest-cli dev` (listens on
`:8288`, auto-discovered) — or set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` for the hosted
service. Without either, `lib/pipeline/trigger.ts` runs the pipeline inline instead (see
README).

## CRM (Leadsquared)

Configure per-org from Setup → Leadsquared (writes to `organizations.leadsquaredConfig`),
or set `LEADSQUARED_ACCESS_KEY`/`LEADSQUARED_SECRET_KEY`/`LEADSQUARED_HOST` as an
environment-level fallback. Requires `leads.crmRecordUrl` to be populated with the
Leadsquared prospect id (not currently written anywhere — add that when you build the
Leadsquared → CallIQ lead sync direction).

## Email (Resend)

Set `RESEND_API_KEY`. Sends flagged-call alerts to every `admin`/`qa_reviewer` in the org
when a call's risk level isn't `likely_genuine`.

## Deployment

Deploy the Next.js app to Vercel as usual. Add `SENTRY_*`/`NEXT_PUBLIC_SENTRY_DSN` and
`NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` and wire up their SDKs (not included —
no accounts to test against in this environment) for error tracking and product analytics.
