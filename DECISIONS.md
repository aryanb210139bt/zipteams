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
