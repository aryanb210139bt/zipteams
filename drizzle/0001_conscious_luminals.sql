CREATE TYPE "public"."intent_trend" AS ENUM('up', 'down', 'flat');--> statement-breakpoint
ALTER TABLE "call_scores" ADD COLUMN "evidence_timestamp_seconds" integer;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "fabrication_risk_score" integer;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "flagged_for_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "call_summary" jsonb;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "key_points" jsonb;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "main_takeaways" jsonb;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "call_verdicts" ADD COLUMN "rubric_snapshot_hash" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "intent_score" integer;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "high_intent_factors" jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "low_intent_factors" jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "intent_trend" "intent_trend";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "intent_trend_rationale" text;--> statement-breakpoint
ALTER TABLE "data_capture_values" ADD COLUMN "evidence_quote" text;