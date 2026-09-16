# Design decisions

This build was given two source documents that don't fully agree on scope, plus explicit
direction on how to reconcile them. Recording that here so the "why" survives past this
session.

## Sources

1. **The pasted Build Prompt** — a from-scratch spec for "CallIQ", an audit tool centered on
   `calls` (rubric scoring, fabrication detection, a flagged-review queue), with a specific
   tech stack and an explicit 10-entity data model.
2. **The attached PRD** (`Kalvium_Conversations_Insights_PRD.docx`) — a screenshot-driven
   reverse-engineering of a real, broader product: Leads + multi-channel Conversations,
   Leaderboard, a shared filter registry, Setup/Integrations admin, and its own "Quality"
   sub-tab that is functionally the same audit-rubric idea, independently arrived at.

## Chosen approach: merge — PRD's IA + build prompt's pipeline

- **Data model**: PRD's richer shape (`leads` + `conversations` as separate entities, a
  `companies` table, `concern_categories`/`objections`, `data_capture_fields`/`values`,
  `tasks`, `notes`) *plus* every build-prompt table (`rubric_categories`,
  `rubric_parameters`, `call_scores`, `call_verdicts`, `glossary_terms`,
  `qualification_rules`). See `src/lib/db/schema.ts`.
- **Rubric content**: seeded from the build prompt's explicit 11 categories (it named them
  outright), not the PRD's own screenshot-derived 16 QA parameters — but every PRD
  parameter is folded in as a `rubric_parameters` row under whichever category it maps to
  (e.g. "Greeting & Introduction" → Introduction, "Zero Tolerance Behavior" → Ethical Red
  Flags). See the mapping comments in `lib/rubric-seed-data.ts`.
- **Pages/IA**: PRD's navigation and page layouts (Conversations Insights' three tabs, the
  shared Leads table, Lead Detail's six sub-tabs, Setup's three nav groups) are what's
  built, with the build prompt's two extra concepts — a dedicated **Flagged for Review**
  queue and an **Upload** page — added as new top-level nav items, since the PRD's product
  doesn't have an equivalent (its ingestion is presumably automatic via connected
  channels).
- **Pipeline**: the build prompt's `upload → transcribe → translate → score → notify`
  Inngest pipeline is the actual audit engine underneath the PRD's "Quality" sub-tab and
  Dashboard quality metrics — there's one scoring path, not two.

## Infra: code scaffold only, no live provisioning

No Supabase/Neon project, Clerk app, or any other cloud resource was created for this
build, per instruction — see README's "What's real vs. mocked" for exactly which pieces are
live-capable-but-unconfigured vs. mocked, and SETUP.md for turning each one on.

## Honesty about PRD gaps

The PRD explicitly lists screens it never captured from the live product (§12): Companies,
My Conversations, Shared With Me, Custom Reports, Lead Detail's Profile/Tasks/Notes/
WhatsApp sub-tabs, the Insights tab's populated state, and the Dashboard's "Call Quality
Gap" toggle. Rather than invent plausible-looking designs for these, they ship as either a
minimal real implementation where the data model already supports it (Tasks and Notes are
fully functional — the schema existed anyway; Companies shows the real list), or an honest
"not captured / TBD" empty state that says so, matching the PRD's own admitted gaps instead
of pretending they were resolved.

## Filter registry: a working slice, not all ~28 fields

PRD §4 describes a ~28-field shared filter registry across 4 UI-control types (searchable
checkbox-list, static checkbox-list, single date picker, date-range picker). Built: date
range, Conversation owner, Conversation source, and Status Category, as URL-search-param-
backed components (`components/filters/*`) — server-renderable and shareable by link. The
remaining fields (Email/WhatsApp Status, Quality Parameter Groups/Names, Intent
Progression, Managers, …) follow the exact same `MultiSelectFilter` pattern; they're not
wired up simply because there was no controlled vocabulary/data behind most of them yet
(e.g. "Intent Progression" isn't a field this schema tracks). No calendar-widget date
picker (PRD's dual-month, Sunday-first vs. Monday-first inconsistency) — plain `<input
type="date">` pairs instead, to keep scope real.

## Known inconsistencies from the PRD — not replicated

PRD §11.3 flags "Not Converted" vs. "Not-Converted" and inconsistent calendar week-start as
likely bugs in the source product. This build uses one canonical `lead_stage` enum
(`not_converted`) rather than reproducing the duplicate-value bug.

## LeadSquared ingestion + Sarvam batch transcription (PRD: leadsquared-sarvam-ingestion)

- **Job persistence (R4):** chose option (a) from the PRD — `sarvamJobId`/`sarvamJobStatus`/
  `sarvamRetryCount` columns directly on `conversations`, not a separate `sarvam_jobs` table.
  Matches the PRD's own recommendation at this scale (one job per conversation, no
  multi-segment splitting for one-on-one counselling calls).
- **Provider selection (R5):** least-code rule per the PRD's own suggestion — calls with
  `source = 'crm_recordings'` (the LeadSquared sync) route to Sarvam, everything else keeps
  using Deepgram. No new per-org setting; revisit once real usage data shows which languages
  actually need Sarvam.
- **`conversationSourceEnum` value for LeadSquared calls (open question, PRD § 9.2):** used
  the existing generic `crm_recordings` value rather than a specific telephony vendor
  (`exotel`/`ozonetel`/etc.), since which vendor Kalvium's LeadSquared instance is actually
  wired to is unknown without asking or running Phase 0 discovery against the real account.
  **Not silently decided** — confirm and swap if a vendor-specific tag turns out to be more
  useful downstream (e.g. for per-vendor audio-format quirks).
- **Sync watermark:** a plain `leadsquaredLastSyncedAt` timestamp column on `organizations`,
  not a dedicated CRM-sync-metadata table — simplest option that satisfies R1, per the PRD's
  own "your call, keep it simple."
- **Idempotency key (R1 § 5.4):** added `conversations.externalCallId` (the LeadSquared
  ActivityId) rather than reusing an existing column — nothing else on the row was suitable,
  and R1 explicitly needs a dedup key before inserting.
- **Storage retention (open question, PRD § 9.1):** deliberately **not decided**. The
  storage-cleanup cron exists but is disabled by default (`CLEANUP_REHOSTED_RECORDINGS`
  unset) until it's confirmed whether Kalvium needs re-hosted audio kept long-term for
  compliance/QA review.
- **Sarvam API shape (open question, PRD § 9.3):** implemented assuming the batch endpoint
  requires uploaded file bytes (matching the Python SDK's `upload_files()` pattern the PRD
  points at), since this environment's egress proxy blocks `docs.sarvam.ai` and the exact
  request/response fields could not be verified end-to-end against a live account. Flagged
  in code comments in `lib/integrations/sarvam.ts` — confirm against the real API before
  relying on this in production.
- **ffmpeg (PRD R2 deployment note):** chose a Render build-time apt package over an npm
  dependency like `ffmpeg-static`, to avoid bundling a large binary into the deploy
  artifact; this repo still has no Dockerfile, so this needs to actually be added to the
  Render service config, not just assumed. Falls back to uploading unnormalized audio (with
  a warning) if `ffmpeg` isn't found, rather than failing the whole pipeline.
