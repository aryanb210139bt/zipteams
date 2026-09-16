import type Anthropic from "@anthropic-ai/sdk";

import type { TranscriptLine } from "@/lib/db/schema";
import { BANT_KEYS } from "@/lib/db/constants";

/**
 * Real AI Evaluation spec §11 — "Keep the whole prompt-construction function
 * in one place ... so rubric edits in the UI automatically flow into future
 * evaluations without a code change." This module is that one place: the
 * rubric, the concern-category taxonomy, and the data-capture field
 * definitions are all passed in from the DB (fetched fresh per call in
 * lib/pipeline/execute.ts) — nothing here is hardcoded to any one org.
 */

export type RubricParameterInput = {
  id: string;
  categoryName: string;
  text: string;
  weight: "minor" | "important" | "critical";
  supportsPartialCredit: boolean;
};

export type ScoreCallInput = {
  leadName: string;
  associateName: string;
  transcript: TranscriptLine[];
  rubricParameters: RubricParameterInput[];
  /** Closed taxonomy — passed as a JSON-schema enum so Claude can't invent new slices for the Dashboard's "Key Lead Concerns" pie chart. */
  concernCategoryNames: string[];
  /** Org-configurable extraction fields (spec §6) — excludes BANT, which is its own fixed top-level section (spec §4). */
  dataCaptureFieldKeys: string[];
  /** For the intent trend (spec §3) — null when this is the lead's first call. */
  previousIntentScore: number | null;
  previousCallDate: Date | null;
};

export function buildScoringTool(input: ScoreCallInput): Anthropic.Tool {
  const parameterIds = input.rubricParameters.map((p) => p.id);
  const dataCaptureKeys = input.dataCaptureFieldKeys.filter((k) => !BANT_KEYS.includes(k));

  return {
    name: "submit_scoring",
    description: "Submit the structured evaluation result for this call transcript.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["parameterScores", "authenticity", "intent", "bant", "objections", "dataCapture", "summary", "nextSteps"],
      properties: {
        parameterScores: {
          type: "array",
          description: "Exactly one entry per rubric parameter id listed below — do not omit any, do not invent new ones.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["parameterId", "verdict", "supportingQuote", "confidence", "rationale", "evidenceTimestampSeconds"],
            properties: {
              parameterId: { type: "string", enum: parameterIds.length ? parameterIds : undefined },
              verdict: {
                type: "string",
                enum: ["pass", "partial", "fail", "na"],
                description:
                  "pass=done, partial=partially done, fail=needs improvement, na=not applicable. Only use na when this parameter's behavior genuinely could not occur in this call — never to avoid scoring something you're unsure about (use low confidence for that instead).",
              },
              supportingQuote: { type: ["string", "null"], description: "A real quote from the transcript. Never invent one." },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              rationale: { type: "string", description: "1-3 sentences, specific to this call." },
              evidenceTimestampSeconds: { type: ["integer", "null"], minimum: 0, description: "Seconds into the call where the evidence occurs, or null if not identifiable." },
            },
          },
        },
        authenticity: {
          type: "object",
          additionalProperties: false,
          required: ["riskLevel", "fabricationRiskScore", "rationale"],
          description:
            "Independent of call-quality scoring: is this a genuine two-way conversation, or does it look fabricated/scripted/non-sequitur/implausibly paced? A poor sales call is not the same thing as a fabricated one.",
          properties: {
            riskLevel: { type: "string", enum: ["likely_genuine", "needs_review", "high_fabrication_risk"] },
            fabricationRiskScore: { type: "integer", minimum: 0, maximum: 100 },
            rationale: { type: "string", description: "Specific reasoning — which signals were inconsistent, if any." },
          },
        },
        intent: {
          type: "object",
          additionalProperties: false,
          required: ["intentScore", "highIntentFactors", "lowIntentFactors", "intentTrendRationale"],
          description: "The lead's buying intent — a distinct signal from call-quality/rubric compliance.",
          properties: {
            intentScore: { type: "integer", minimum: 0, maximum: 100 },
            highIntentFactors: { type: "array", items: { type: "string" }, description: "Sentences describing positive signals." },
            lowIntentFactors: { type: "array", items: { type: "string" }, description: "Sentences describing negative signals." },
            intentTrendRationale: {
              type: ["string", "null"],
              description:
                input.previousIntentScore == null
                  ? "This is the lead's first call — always null."
                  : `1-2 sentences comparing this call's intent to the lead's previous call (intent score ${input.previousIntentScore}/100 on ${input.previousCallDate?.toDateString() ?? "an earlier date"}).`,
            },
          },
        },
        bant: {
          type: "object",
          additionalProperties: false,
          required: ["budget", "authority", "needs", "timeline"],
          description: "Attempt extraction for all 4 always. Use null (not a placeholder sentence) when the call never touched on a field.",
          properties: {
            budget: { type: ["string", "null"] },
            authority: { type: ["string", "null"] },
            needs: { type: ["string", "null"] },
            timeline: { type: ["string", "null"] },
          },
        },
        objections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["concernCategory", "objectionText", "howHandled", "customerSatisfied"],
            properties: {
              concernCategory: {
                type: "string",
                enum: input.concernCategoryNames.length ? input.concernCategoryNames : undefined,
                description: "Must be one of the org's configured concern categories — never invent a new one.",
              },
              objectionText: { type: "string", description: "What the lead said/implied." },
              howHandled: { type: "string", description: "What the associate did." },
              customerSatisfied: { type: ["boolean", "null"], description: "Null when the transcript doesn't make the outcome clear — don't guess." },
            },
          },
        },
        dataCapture: {
          type: "array",
          description: "One entry per known field key below (excluding BANT, which has its own section) whenever the call touched on it.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["fieldKey", "value", "evidenceQuote"],
            properties: {
              fieldKey: { type: "string", enum: dataCaptureKeys.length ? dataCaptureKeys : undefined },
              value: { type: ["string", "null"] },
              evidenceQuote: { type: ["string", "null"], description: "Short supporting quote from the transcript." },
            },
          },
        },
        summary: {
          type: "object",
          additionalProperties: false,
          required: ["callSummary", "keyPoints", "mainTakeaways"],
          description: "Three distinct sections, increasing in abstraction. Roughly 3-5 bullets each — don't balloon or collapse to one line.",
          properties: {
            callSummary: { type: "array", items: { type: "string" }, description: "Narrative recap." },
            keyPoints: { type: "array", items: { type: "string" }, description: "Granular facts." },
            mainTakeaways: { type: "array", items: { type: "string" }, description: "Strategic-level conclusions." },
          },
        },
        nextSteps: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["actionLabel", "explanation", "dueInDays", "suggestedScript", "scriptRationale"],
            properties: {
              actionLabel: { type: "string", description: 'Short imperative, e.g. "Schedule Counseling Meeting".' },
              explanation: { type: "string", description: "1-2 sentences: why/what." },
              dueInDays: { type: "integer", minimum: 0, maximum: 60, description: "Days from now this is due — reason concretely from the transcript (e.g. \"next week\" -> 7), don't default to a fixed number." },
              suggestedScript: { type: ["string", "null"], description: 'Optional literal "Say: ..." text for the associate.' },
              scriptRationale: { type: ["string", "null"], description: "Why this script — shown with a checkmark in Path to Conversion." },
            },
          },
        },
      },
    },
  };
}

export function buildSystemPrompt(input: ScoreCallInput): string {
  const rubricList = input.rubricParameters
    .map((p) => `- [${p.id}] (${p.categoryName} / ${p.weight}) ${p.text}`)
    .join("\n");

  return [
    "You are a call-quality auditor for an admissions/sales counselling team.",
    "You will be given a call transcript between an Associate and a Lead, and this org's current audit rubric, concern-category taxonomy, and data-capture field list — all fetched live, so score against exactly what is given here, not any rubric you recall from elsewhere.",
    "Score every rubric parameter listed below using ONLY evidence in the transcript. Never invent quotes.",
    "",
    "Rubric parameters (id / category / weight / text):",
    rubricList || "(no rubric parameters configured for this org)",
    "",
    `Known objection/concern categories (closed set — pick from these only): ${input.concernCategoryNames.join(", ") || "(none configured)"}`,
    `Known data-capture fields (excluding BANT, which is its own section below): ${input.dataCaptureFieldKeys.filter((k) => !BANT_KEYS.includes(k)).join(", ") || "(none configured)"}`,
    "",
    "--- Authenticity check (independent section — evaluate separately from call quality) ---",
    "Assess whether this is a genuine two-way conversation or looks fabricated/one-sided (scripted, non-sequitur replies, implausible pacing, duration/content inconsistency). A poor sales call must not be miscoded as fabricated, and a fabricated call must not be miscoded as merely a poor sales call.",
    "",
    "--- Intent ---",
    "Assess the lead's buying intent as its own signal, separate from rubric/quality compliance.",
    input.previousIntentScore != null
      ? `This lead's previous call scored ${input.previousIntentScore}/100 intent on ${input.previousCallDate?.toDateString() ?? "an earlier date"} — compare against it for the trend rationale.`
      : "This is the lead's first call — there is no previous score to compare against.",
    "",
    "Call the submit_scoring tool exactly once with your full structured result. Score every rubric parameter id given — do not omit any.",
  ].join("\n");
}
