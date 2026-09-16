/**
 * Central "do we have real credentials for X" checks. Every integration
 * client in lib/integrations/* uses these to decide between calling the real
 * API and returning a deterministic mock so the pipeline is runnable end to
 * end with zero external accounts.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL,
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  inngestEventKey: process.env.INNGEST_EVENT_KEY,
  inngestSigningKey: process.env.INNGEST_SIGNING_KEY,
  leadsquaredAccessKey: process.env.LEADSQUARED_ACCESS_KEY,
  leadsquaredSecretKey: process.env.LEADSQUARED_SECRET_KEY,
  leadsquaredHost: process.env.LEADSQUARED_HOST ?? "https://api.leadsquared.com",
  // Output of .github/workflows/leadsquared-discovery.yml (PRD Phase 0), run once
  // against the real account — not re-discovered at runtime. Unset until someone
  // with real LEADSQUARED_* secrets runs that workflow and pastes the results here.
  leadsquaredPhoneCallActivityEvent: process.env.LEADSQUARED_PHONE_CALL_ACTIVITY_EVENT,
  // SchemaNames for the recording URL / lead name fields on a Phone Call activity —
  // also Phase 0 output. The mx_Custom_* defaults are placeholders, not verified.
  leadsquaredRecordingUrlField: process.env.LEADSQUARED_RECORDING_URL_FIELD ?? "mx_Custom_4",
  leadsquaredLeadNameField: process.env.LEADSQUARED_LEAD_NAME_FIELD ?? "mx_Custom_5",
  leadsquaredCallDurationField: process.env.LEADSQUARED_CALL_DURATION_FIELD ?? "mx_Custom_6",
  resendApiKey: process.env.RESEND_API_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  // File / audio storage (Supabase Storage) — R2.
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  storageBucket: process.env.STORAGE_BUCKET ?? "call-audio",

  // Sarvam Batch STT (R3) — see lib/integrations/sarvam.ts.
  sarvamApiKey: process.env.SARVAM_API_KEY,
  sarvamBatchPollInitialSec: Number(process.env.SARVAM_BATCH_POLL_INITIAL_SEC ?? 10),
  sarvamBatchPollMaxSec: Number(process.env.SARVAM_BATCH_POLL_MAX_SEC ?? 60),
  sarvamBatchPollTimeoutSec: Number(process.env.SARVAM_BATCH_POLL_TIMEOUT_SEC ?? 1800),

  // Off by default — see PRD § 9.1 open question (does Kalvium need re-hosted
  // audio retained for compliance/QA review?). Flip on only once that's
  // answered; see lib/inngest/functions/storage-cleanup.ts.
  cleanupRehostedRecordings: process.env.CLEANUP_REHOSTED_RECORDINGS === "true",
} as const;

export const hasClerk = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasDeepgram = Boolean(env.deepgramApiKey);
export const hasGoogleTranslate = Boolean(env.googleTranslateApiKey);
export const hasAnthropic = Boolean(env.anthropicApiKey);
export const hasResend = Boolean(env.resendApiKey);
export const hasRealDatabase = Boolean(env.databaseUrl);
export const hasSarvam = Boolean(env.sarvamApiKey);
export const hasSupabaseStorage = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
