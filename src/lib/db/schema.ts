import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------
 * Enums
 * ---------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", ["admin", "qa_reviewer", "associate"]);

export const callStatusEnum = pgEnum("call_status", [
  "uploaded",
  "transcribing",
  "translating",
  "scoring",
  "scored",
  "failed",
]);

export const conversationSourceEnum = pgEnum("conversation_source", [
  "ozonetel",
  "dialpad",
  "zipteams_dashboard",
  "google_calendar",
  "zipme_calendar",
  "instant_meetings",
  "outlook_calendar",
  "crm_recordings",
  "call_hippo",
  "whatsapp_chat",
  "external_recordings",
  "exotel",
  "runo",
  "ai_agent",
  "emails",
  "webhook",
  "partner_api",
  "manually_uploaded",
  "telecmi",
  "auto_dialer",
  "click_to_call",
  "frejun_click_to_call",
]);

export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);

export const leadStageEnum = pgEnum("lead_stage", [
  "converted",
  "in_progress_calls",
  "not_converted",
]);

export const leadStageCategoryEnum = pgEnum("lead_stage_category", [
  "converted",
  "in_pipeline",
  "lost",
]);

export const intentEnum = pgEnum("intent", [
  "high",
  "moderate",
  "neutral",
  "low",
  "not_qualified",
  "not_available",
]);

export const parameterWeightEnum = pgEnum("parameter_weight", ["minor", "important", "critical"]);

export const verdictEnum = pgEnum("verdict", ["pass", "partial", "fail", "na"]);

export const riskLevelEnum = pgEnum("risk_level", [
  "likely_genuine",
  "needs_review",
  "high_fabrication_risk",
]);

export const taskStatusEnum = pgEnum("task_status", ["open", "done"]);

export const intentTrendEnum = pgEnum("intent_trend", ["up", "down", "flat"]);

/* -------------------------------------------------------------------------
 * Organizations & Users
 * ---------------------------------------------------------------------- */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  workspaceName: text("workspace_name").default("Default").notNull(),
  leadsquaredConfig: jsonb("leadsquared_config").$type<{
    accessKey?: string;
    secretKey?: string;
    hostUrl?: string;
    enabled: boolean;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id"),
  role: userRoleEnum("role").notNull().default("associate"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").default("active").notNull(), // active | invited
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------
 * Companies & Leads (PRD 1.1)
 * ---------------------------------------------------------------------- */

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  leadStage: leadStageEnum("lead_stage").default("in_progress_calls").notNull(),
  leadStageCategory: leadStageCategoryEnum("lead_stage_category").default("in_pipeline").notNull(),
  dispositionStatus: text("disposition_status"),
  intentScore: integer("intent_score"), // /100
  leadQualityScore: real("lead_quality_score"),
  emailStatus: text("email_status"),
  whatsappStatus: text("whatsapp_status"),
  nextTaskDueDate: timestamp("next_task_due_date", { withTimezone: true }),
  crmRecordUrl: text("crm_record_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------
 * Conversations (== "calls" in the build-prompt spec)
 * ---------------------------------------------------------------------- */

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  associateId: uuid("associate_id").references(() => users.id, { onDelete: "set null" }),
  source: conversationSourceEnum("source").default("manually_uploaded").notNull(),
  direction: directionEnum("direction").default("outbound").notNull(),
  audioUrl: text("audio_url"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  callDate: timestamp("call_date", { withTimezone: true }).defaultNow().notNull(),
  status: callStatusEnum("status").default("uploaded").notNull(),
  transcriptRaw: jsonb("transcript_raw").$type<TranscriptLine[]>(),
  transcriptTranslated: jsonb("transcript_translated").$type<TranscriptLine[]>(),
  talkToListenRatio: real("talk_to_listen_ratio"), // associate speaking share, 0-1
  intent: intentEnum("intent"),
  qualityScore: real("quality_score"), // 0-100, derived from call_verdicts.overallScore
  // Real AI Evaluation spec §3 — a distinct signal from qualityScore: buying intent,
  // not audit-rubric compliance. Populated by the intent section of the scoring call.
  intentScore: integer("intent_score"), // 0-100
  highIntentFactors: jsonb("high_intent_factors").$type<string[]>(),
  lowIntentFactors: jsonb("low_intent_factors").$type<string[]>(),
  intentTrend: intentTrendEnum("intent_trend"), // computed in code vs. the lead's previous call, null if first call
  intentTrendRationale: text("intent_trend_rationale"),
  errorMessage: text("error_message"),
  llmPromptVersion: text("llm_prompt_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TranscriptLine = {
  speaker: "associate" | "lead" | string;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

/* -------------------------------------------------------------------------
 * Rubric (audit framework) — 11 categories seeded per build-prompt spec
 * ---------------------------------------------------------------------- */

export const rubricCategories = pgTable("rubric_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weight: real("weight").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const rubricParameters = pgTable("rubric_parameters", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => rubricCategories.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  weight: parameterWeightEnum("weight").notNull().default("important"),
  supportsPartialCredit: boolean("supports_partial_credit").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* -------------------------------------------------------------------------
 * Scoring output
 * ---------------------------------------------------------------------- */

export const callScores = pgTable("call_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  parameterId: uuid("parameter_id").notNull().references(() => rubricParameters.id, { onDelete: "cascade" }),
  verdict: verdictEnum("verdict").notNull(),
  supportingQuote: text("supporting_quote"),
  confidence: real("confidence"), // 0-1
  aiRationale: text("ai_rationale"),
  // Real AI Evaluation spec §2.2 — lets the per-parameter play button seek the audio.
  evidenceTimestampSeconds: integer("evidence_timestamp_seconds"),
  overriddenByUserId: uuid("overridden_by_user_id").references(() => users.id, { onDelete: "set null" }),
  overriddenAt: timestamp("overridden_at", { withTimezone: true }),
  llmPromptVersion: text("llm_prompt_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const callVerdicts = pgTable("call_verdicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").notNull().references(() => conversations.id, { onDelete: "cascade" }).unique(),
  overallScore: real("overall_score").notNull(), // 0-100
  riskLevel: riskLevelEnum("risk_level").notNull(),
  // Real AI Evaluation spec §9 — numeric companion to riskLevel, and the derived
  // Flagged for Review gate (true when riskLevel is needs_review or high_fabrication_risk).
  fabricationRiskScore: integer("fabrication_risk_score"), // 0-100
  flaggedForReview: boolean("flagged_for_review").default(false).notNull(),
  fabricationRationale: text("fabrication_rationale"),
  summary: text("summary"),
  // Real AI Evaluation spec §7 — three distinct bulleted sections, increasing in
  // abstraction (narrative recap → granular facts → strategic conclusions).
  callSummary: jsonb("call_summary").$type<string[]>(),
  keyPoints: jsonb("key_points").$type<string[]>(),
  mainTakeaways: jsonb("main_takeaways").$type<string[]>(),
  overallComment: text("overall_comment"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  llmPromptVersion: text("llm_prompt_version"),
  // Real AI Evaluation spec §10 meta block — which model produced this, and a hash of
  // the rubric_categories/parameters snapshot fetched at eval time, so a quality-score
  // trend months later can be told apart from a rubric/prompt edit.
  model: text("model"),
  rubricSnapshotHash: text("rubric_snapshot_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------
 * Glossary / custom vocabulary (STT word-boost + auto-correct)
 * ---------------------------------------------------------------------- */

export const glossaryTerms = pgTable("glossary_terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  commonMistranscriptions: jsonb("common_mistranscriptions").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------
 * Qualification rules (extracted eligibility logic)
 * ---------------------------------------------------------------------- */

export const qualificationRules = pgTable("qualification_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  ruleText: text("rule_text").notNull(),
  supportingQuote: text("supporting_quote"),
  sourceCallId: uuid("source_call_id").references(() => conversations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------
 * Concerns / objections taxonomy (PRD "Key Lead Concerns")
 * ---------------------------------------------------------------------- */

export const concernCategories = pgTable("concern_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
});

export const objections = pgTable("objections", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  concernCategoryId: uuid("concern_category_id").references(() => concernCategories.id, { onDelete: "set null" }),
  statement: text("statement").notNull(),
  handling: text("handling"),
  customerSatisfied: boolean("customer_satisfied"),
});

/* -------------------------------------------------------------------------
 * Data capture (BANT + custom extraction fields) — PRD 9.5
 * ---------------------------------------------------------------------- */

export const dataCaptureFields = pgTable("data_capture_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  key: text("key").notNull(), // e.g. "jee_coaching"
  label: text("label").notNull(), // e.g. "JEE Coaching"
  fieldType: text("field_type").default("text").notNull(), // text | select
  selectOptions: jsonb("select_options").$type<string[]>(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const dataCaptureValues = pgTable("data_capture_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  fieldId: uuid("field_id").notNull().references(() => dataCaptureFields.id, { onDelete: "cascade" }),
  value: text("value"),
  sourceTimestampSeconds: integer("source_timestamp_seconds"),
  // Real AI Evaluation spec §6 — short supporting quote, distinct from the timestamp.
  evidenceQuote: text("evidence_quote"),
  editedByUserId: uuid("edited_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

/* -------------------------------------------------------------------------
 * Tasks / next steps, and free-text notes
 * ---------------------------------------------------------------------- */

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  callId: uuid("call_id").references(() => conversations.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  sayScript: text("say_script"),
  rationale: text("rationale"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: taskStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------------------------------------------------------
 * Convenience unions for the app layer
 * ---------------------------------------------------------------------- */

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type RubricCategory = typeof rubricCategories.$inferSelect;
export type RubricParameter = typeof rubricParameters.$inferSelect;
export type CallScore = typeof callScores.$inferSelect;
export type CallVerdict = typeof callVerdicts.$inferSelect;
export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type QualificationRule = typeof qualificationRules.$inferSelect;
export type ConcernCategory = typeof concernCategories.$inferSelect;
export type Objection = typeof objections.$inferSelect;
export type DataCaptureField = typeof dataCaptureFields.$inferSelect;
export type DataCaptureValue = typeof dataCaptureValues.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Note = typeof notes.$inferSelect;
