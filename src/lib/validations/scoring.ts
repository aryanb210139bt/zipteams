import { z } from "zod";

/**
 * Structured output contract for the Claude scoring pass (Real AI Evaluation
 * spec, sections 2-10). Every rubric parameter in the org's active rubric
 * must get exactly one entry — Zod validates whatever Claude returns before
 * it ever touches call_scores/call_verdicts/objections/data_capture_values/tasks.
 *
 * Field names here are internal (camelCase, matching the existing DB columns
 * they get persisted into) rather than the spec doc's illustrative snake_case
 * JSON keys — the Anthropic tool schema in lib/ai-evaluation/build-prompt.ts
 * is what Claude actually sees, and maps 1:1 onto this shape.
 */

export const ParameterScoreSchema = z.object({
  parameterId: z.string(),
  verdict: z.enum(["pass", "partial", "fail", "na"]),
  supportingQuote: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  /** Seconds into the call this verdict's evidence occurs, or null if the transcript has no usable timestamp for it. */
  evidenceTimestampSeconds: z.number().int().min(0).nullable(),
});

export const AuthenticitySchema = z.object({
  riskLevel: z.enum(["likely_genuine", "needs_review", "high_fabrication_risk"]),
  fabricationRiskScore: z.number().int().min(0).max(100),
  rationale: z.string(),
});

/**
 * Only what genuinely requires reading the transcript. intentLabel and
 * intentTrend are derived deterministically in code (see lib/pipeline/execute.ts)
 * from intentScore and the lead's previously-stored score — asking the model
 * for them risks a label that disagrees with its own number, and the spec
 * explicitly calls out deriving the label in code to keep the boundary
 * consistent and adjustable without re-prompting (§3).
 */
export const IntentSchema = z.object({
  intentScore: z.number().int().min(0).max(100),
  highIntentFactors: z.array(z.string()),
  lowIntentFactors: z.array(z.string()),
  /** Compares this call to the previous call's stored intent score (given in the prompt). Null when there's no previous call, or Claude has nothing to say. */
  intentTrendRationale: z.string().nullable(),
});

/** BANT is a fixed sales-methodology concept (not org-configurable, unlike dataCapture) — see lib/db/constants.ts BANT_KEYS. */
export const BantSchema = z.object({
  budget: z.string().nullable(),
  authority: z.string().nullable(),
  needs: z.string().nullable(),
  timeline: z.string().nullable(),
});

export const ObjectionExtractionSchema = z.object({
  concernCategory: z.string(),
  objectionText: z.string(),
  howHandled: z.string(),
  /** Null is valid when the transcript doesn't make the outcome clear — never force a guess. */
  customerSatisfied: z.boolean().nullable(),
});

export const DataCaptureExtractionSchema = z.object({
  fieldKey: z.string(),
  value: z.string().nullable(),
  evidenceQuote: z.string().nullable(),
});

export const SummarySchema = z.object({
  callSummary: z.array(z.string()),
  keyPoints: z.array(z.string()),
  mainTakeaways: z.array(z.string()),
});

export const NextStepSchema = z.object({
  actionLabel: z.string(),
  explanation: z.string(),
  /** Relative to evaluation time — code turns this into a concrete due_date, avoiding LLM date-arithmetic/timezone drift. */
  dueInDays: z.number().int().min(0).max(60),
  suggestedScript: z.string().nullable(),
  scriptRationale: z.string().nullable(),
});

export const ScoringResultSchema = z.object({
  parameterScores: z.array(ParameterScoreSchema),
  authenticity: AuthenticitySchema,
  intent: IntentSchema,
  bant: BantSchema,
  objections: z.array(ObjectionExtractionSchema),
  dataCapture: z.array(DataCaptureExtractionSchema),
  summary: SummarySchema,
  nextSteps: z.array(NextStepSchema),
});

export type ScoringResult = z.infer<typeof ScoringResultSchema>;
export type ParameterScore = z.infer<typeof ParameterScoreSchema>;
