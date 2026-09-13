CREATE TYPE "public"."call_status" AS ENUM('uploaded', 'transcribing', 'translating', 'scoring', 'scored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."conversation_source" AS ENUM('ozonetel', 'dialpad', 'zipteams_dashboard', 'google_calendar', 'zipme_calendar', 'instant_meetings', 'outlook_calendar', 'crm_recordings', 'call_hippo', 'whatsapp_chat', 'external_recordings', 'exotel', 'runo', 'ai_agent', 'emails', 'webhook', 'partner_api', 'manually_uploaded', 'telecmi', 'auto_dialer', 'click_to_call', 'frejun_click_to_call');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."intent" AS ENUM('high', 'moderate', 'neutral', 'low', 'not_qualified', 'not_available');--> statement-breakpoint
CREATE TYPE "public"."lead_stage_category" AS ENUM('converted', 'in_pipeline', 'lost');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('converted', 'in_progress_calls', 'not_converted');--> statement-breakpoint
CREATE TYPE "public"."parameter_weight" AS ENUM('minor', 'important', 'critical');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('likely_genuine', 'needs_review', 'high_fabrication_risk');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'qa_reviewer', 'associate');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('pass', 'partial', 'fail', 'na');--> statement-breakpoint
CREATE TABLE "call_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"parameter_id" uuid NOT NULL,
	"verdict" "verdict" NOT NULL,
	"supporting_quote" text,
	"confidence" real,
	"ai_rationale" text,
	"overridden_by_user_id" uuid,
	"overridden_at" timestamp with time zone,
	"llm_prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"overall_score" real NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"fabrication_rationale" text,
	"summary" text,
	"overall_comment" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"llm_prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_verdicts_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concern_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"associate_id" uuid,
	"source" "conversation_source" DEFAULT 'manually_uploaded' NOT NULL,
	"direction" "direction" DEFAULT 'outbound' NOT NULL,
	"audio_url" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"call_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "call_status" DEFAULT 'uploaded' NOT NULL,
	"transcript_raw" jsonb,
	"transcript_translated" jsonb,
	"talk_to_listen_ratio" real,
	"intent" "intent",
	"quality_score" real,
	"error_message" text,
	"llm_prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_capture_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"field_type" text DEFAULT 'text' NOT NULL,
	"select_options" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_capture_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value" text,
	"source_timestamp_seconds" integer,
	"edited_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "glossary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"term" text NOT NULL,
	"common_mistranscriptions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"owner_id" uuid,
	"assignee_id" uuid,
	"lead_stage" "lead_stage" DEFAULT 'in_progress_calls' NOT NULL,
	"lead_stage_category" "lead_stage_category" DEFAULT 'in_pipeline' NOT NULL,
	"disposition_status" text,
	"intent_score" integer,
	"lead_quality_score" real,
	"email_status" text,
	"whatsapp_status" text,
	"next_task_due_date" timestamp with time zone,
	"crm_record_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"concern_category_id" uuid,
	"statement" text NOT NULL,
	"handling" text,
	"customer_satisfied" boolean
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"workspace_name" text DEFAULT 'Default' NOT NULL,
	"leadsquared_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rule_text" text NOT NULL,
	"supporting_quote" text,
	"source_call_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"text" text NOT NULL,
	"weight" "parameter_weight" DEFAULT 'important' NOT NULL,
	"supports_partial_credit" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"call_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"say_script" text,
	"rationale" text,
	"due_date" timestamp with time zone,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"clerk_user_id" text,
	"role" "user_role" DEFAULT 'associate' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_scores" ADD CONSTRAINT "call_scores_call_id_conversations_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_scores" ADD CONSTRAINT "call_scores_parameter_id_rubric_parameters_id_fk" FOREIGN KEY ("parameter_id") REFERENCES "public"."rubric_parameters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_scores" ADD CONSTRAINT "call_scores_overridden_by_user_id_users_id_fk" FOREIGN KEY ("overridden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD CONSTRAINT "call_verdicts_call_id_conversations_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD CONSTRAINT "call_verdicts_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concern_categories" ADD CONSTRAINT "concern_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_associate_id_users_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_capture_fields" ADD CONSTRAINT "data_capture_fields_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_capture_values" ADD CONSTRAINT "data_capture_values_call_id_conversations_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_capture_values" ADD CONSTRAINT "data_capture_values_field_id_data_capture_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."data_capture_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_capture_values" ADD CONSTRAINT "data_capture_values_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_call_id_conversations_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_concern_category_id_concern_categories_id_fk" FOREIGN KEY ("concern_category_id") REFERENCES "public"."concern_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_rules" ADD CONSTRAINT "qualification_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_rules" ADD CONSTRAINT "qualification_rules_source_call_id_conversations_id_fk" FOREIGN KEY ("source_call_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_categories" ADD CONSTRAINT "rubric_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_parameters" ADD CONSTRAINT "rubric_parameters_category_id_rubric_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."rubric_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_call_id_conversations_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;