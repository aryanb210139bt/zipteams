import { z } from "zod";

/**
 * Structured output contract for the Claude scoring pass. Every rubric
 * parameter in the org's active rubric must get exactly one entry — Zod
 * validates whatever Claude returns before it ever touches `call_scores`.
 */
export const ParameterScoreSchema = z.object({
  parameterId: z.string(),
  verdict: z.enum(["pass", "partial", "fail", "na"]),
  supportingQuote: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export const AuthenticitySchema = z.object({
  riskLevel: z.enum(["likely_genuine", "needs_review", "high_fabrication_risk"]),
  rationale: z.string(),
});

export const ActionItemSchema = z.object({
  title: z.string(),
  dueInDays: z.number().int().min(0).max(30),
  sayScript: z.string(),
  rationale: z.string(),
});

export const ObjectionExtractionSchema = z.object({
  concernCategory: z.string(),
  statement: z.string(),
  handling: z.string(),
  customerSatisfied: z.boolean(),
});

export const DataCaptureExtractionSchema = z.object({
  fieldKey: z.string(),
  value: z.string(),
  sourceTimestampSeconds: z.number().int().min(0).nullable(),
});

export const ScoringResultSchema = z.object({
  parameterScores: z.array(ParameterScoreSchema),
  authenticity: AuthenticitySchema,
  summary: z.string(),
  callSummaryBullets: z.array(z.string()),
  actionItems: z.array(ActionItemSchema),
  objections: z.array(ObjectionExtractionSchema),
  dataCapture: z.array(DataCaptureExtractionSchema),
});

export type ScoringResult = z.infer<typeof ScoringResultSchema>;
export type ParameterScore = z.infer<typeof ParameterScoreSchema>;
