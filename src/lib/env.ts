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
  resendApiKey: process.env.RESEND_API_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const hasClerk = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasDeepgram = Boolean(env.deepgramApiKey);
export const hasGoogleTranslate = Boolean(env.googleTranslateApiKey);
export const hasAnthropic = Boolean(env.anthropicApiKey);
export const hasResend = Boolean(env.resendApiKey);
export const hasRealDatabase = Boolean(env.databaseUrl);
