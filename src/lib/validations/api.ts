import { z } from "zod";

export const UpdateLeadSchema = z.object({
  leadStage: z.enum(["converted", "in_progress_calls", "not_converted"]).optional(),
  leadStageCategory: z.enum(["converted", "in_pipeline", "lost"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const VerdictActionSchema = z.object({
  action: z.literal("sign-off"),
  overallComment: z.string().optional(),
});

export const OverrideScoreSchema = z.object({
  parameterId: z.string().uuid(),
  verdict: z.enum(["pass", "partial", "fail", "na"]),
});

export const GlossaryTermSchema = z.object({
  term: z.string().min(1),
  commonMistranscriptions: z.array(z.string()).default([]),
});

export const QualificationRuleSchema = z.object({
  ruleText: z.string().min(1),
  supportingQuote: z.string().optional(),
  sourceCallId: z.string().uuid().nullable().optional(),
});

export const RubricCategorySchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0),
});

export const RubricParameterSchema = z.object({
  categoryId: z.string().uuid(),
  text: z.string().min(1),
  weight: z.enum(["minor", "important", "critical"]),
  supportsPartialCredit: z.boolean().default(true),
});

export const CsvUploadRowSchema = z.object({
  associateEmail: z.string().email(),
  leadName: z.string().min(1),
  leadEmail: z.string().email().optional().or(z.literal("")),
  audioUrl: z.string().url().optional().or(z.literal("")),
  transcript: z.string().optional(),
  durationSeconds: z.coerce.number().int().min(0).default(0),
  source: z.string().optional(),
  callDate: z.string().optional(),
});

export const SingleUploadSchema = z.object({
  associateId: z.string().uuid(),
  leadName: z.string().min(1),
  leadEmail: z.string().email().optional(),
  audioUrl: z.string().url().optional(),
  durationSeconds: z.coerce.number().int().min(0).default(0),
  source: z.string().default("manually_uploaded"),
});
