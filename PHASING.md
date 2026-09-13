# Build order — status

Against the build prompt's 10-step order (its own phrasing, so progress is easy to track
against the original ask):

1. ✅ Scaffold Next.js + Tailwind + shadcn/ui + Clerk auth + Postgres/Drizzle connection —
   Clerk is opt-in (dev-mode fallback), Postgres defaults to embedded PGlite.
2. ✅ Data model + seed script — 17 tables, 11 rubric categories seeded with real
   parameters, plus 26 leads / ~57 conversations / scores / verdicts / objections /
   data-capture values / tasks / notes for a populated demo.
3. ✅ Upload flow + Inngest pipeline skeleton — real, not stubbed: every step
   (transcribe/translate/score/notify) has a working implementation with a mock fallback,
   plus a resilient inline-run fallback when Inngest itself isn't reachable.
4. ✅ Deepgram transcription step + glossary-based custom vocabulary — real Deepgram call
   behind `DEEPGRAM_API_KEY`, glossary word-boost + post-transcription auto-correct either
   way.
5. ✅ Translation step — real Google Translate call behind `GOOGLE_TRANSLATE_API_KEY`.
6. ✅ Claude scoring step, structured JSON output — real Claude tool-call behind
   `ANTHROPIC_API_KEY`, Zod-validated either way.
7. ✅ Dashboard + call detail view — Dashboard, All Conversations, Leaderboard, and Lead
   Detail's Conversations tab (3-panel: list / player+transcript / summary-insights-
   quality) are all built and query real data.
8. ✅ Flagged-review queue + reviewer workflow — sign-off action, role-gated to
   admin/qa_reviewer.
9. ✅ Leadsquared webhook integration — outbound push on score completion, per-org config
   UI in Setup, mock-logs when not connected.
10. 🟡 Polish — core empty/error/loading states exist (see each page's `rows.length === 0`
    branches and the honest TBD panels), but this hasn't had a dedicated pass for loading
    skeletons on slow connections, form-level validation error display, or toast coverage
    on every mutation. `components/ui/skeleton.tsx` exists but isn't wired into every
    server-data boundary yet.

Also delivered beyond the 10 steps, since the PRD's IA required them: the full Conversations
Insights Dashboard/Insights/Leaderboard tab structure, Lead Detail's Insights tab (Buying
Intent, Objections, BANT, Data Capture, Path to Conversion), Profile/Tasks/Notes/WhatsApp
sub-tabs, and the Setup section (Team, Rubric editor, Glossary, Qualification rules,
Leadsquared config, generic integration-connector template pages, custom fields).

## Explicitly not done

- Real audio file upload/storage (accepts an already-hosted URL only — see SETUP.md).
- Sign-in/sign-up pages for Clerk (routes aren't reachable without Clerk configured, so
  they'd be unreviewable dead code in this environment — see SETUP.md for adding them).
- Sentry/PostHog SDK wiring (no accounts to verify against here).
- pgvector-backed semantic transcript search (schema/extension note is in SETUP.md; no
  search feature built on top of it yet).
- The remaining ~24 filter-registry fields beyond the four wired up (see DECISIONS.md).
