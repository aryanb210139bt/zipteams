CREATE TYPE "public"."sarvam_job_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "external_call_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "sarvam_job_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "sarvam_job_status" "sarvam_job_status";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "sarvam_retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "leadsquared_last_synced_at" timestamp with time zone;