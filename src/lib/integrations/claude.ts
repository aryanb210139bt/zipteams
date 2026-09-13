import Anthropic from "@anthropic-ai/sdk";

import { hasAnthropic, env } from "@/lib/env";
import type { TranscriptLine } from "@/lib/db/schema";
import { ScoringResultSchema, type ScoringResult } from "@/lib/validations/scoring";

/** Default to the latest, most capable Claude model for scoring. */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
/** Bump whenever the prompt or rubric shape changes — stored on every score/verdict row for auditability. */
export const PROMPT_VERSION = "claude-scoring-v1";

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
  concernCategoryNames: string[];
  dataCaptureFieldKeys: string[];
};

function transcriptToText(lines: TranscriptLine[]): string {
  return lines
    .map((l) => `[${l.startSeconds}s-${l.endSeconds}s] ${l.speaker === "associate" ? "Associate" : "Lead"}: ${l.text}`)
    .join("\n");
}

const SCORING_TOOL_SCHEMA: Anthropic.Tool = {
  name: "submit_scoring",
  description: "Submit the structured audit result for this call transcript.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["parameterScores", "authenticity", "summary", "callSummaryBullets", "actionItems", "objections", "dataCapture"],
    properties: {
      parameterScores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["parameterId", "verdict", "supportingQuote", "confidence", "rationale"],
          properties: {
            parameterId: { type: "string" },
            verdict: { type: "string", enum: ["pass", "partial", "fail", "na"] },
            supportingQuote: { type: ["string", "null"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            rationale: { type: "string" },
          },
        },
      },
      authenticity: {
        type: "object",
        additionalProperties: false,
        required: ["riskLevel", "rationale"],
        properties: {
          riskLevel: { type: "string", enum: ["likely_genuine", "needs_review", "high_fabrication_risk"] },
          rationale: { type: "string" },
        },
      },
      summary: { type: "string" },
      callSummaryBullets: { type: "array", items: { type: "string" } },
      actionItems: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "dueInDays", "sayScript", "rationale"],
          properties: {
            title: { type: "string" },
            dueInDays: { type: "integer", minimum: 0, maximum: 30 },
            sayScript: { type: "string" },
            rationale: { type: "string" },
          },
        },
      },
      objections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["concernCategory", "statement", "handling", "customerSatisfied"],
          properties: {
            concernCategory: { type: "string" },
            statement: { type: "string" },
            handling: { type: "string" },
            customerSatisfied: { type: "boolean" },
          },
        },
      },
      dataCapture: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fieldKey", "value", "sourceTimestampSeconds"],
          properties: {
            fieldKey: { type: "string" },
            value: { type: "string" },
            sourceTimestampSeconds: { type: ["integer", "null"] },
          },
        },
      },
    },
  },
};

function buildSystemPrompt(input: ScoreCallInput): string {
  const rubricList = input.rubricParameters
    .map((p) => `- [${p.id}] (${p.categoryName} / ${p.weight}) ${p.text}`)
    .join("\n");
  return [
    "You are a call-quality auditor for an admissions/sales counselling team.",
    "You will be given a call transcript between an Associate and a Lead, and a fixed audit rubric.",
    "Score every rubric parameter listed below using ONLY evidence in the transcript. Never invent quotes.",
    "Also assess whether the call is a genuine two-way conversation or looks fabricated/one-sided (scripted, non-sequitur replies, implausible pacing).",
    "",
    "Rubric parameters (id / category / weight / text):",
    rubricList,
    "",
    `Known objection/concern categories: ${input.concernCategoryNames.join(", ") || "(none configured)"}`,
    `Known data-capture fields: ${input.dataCaptureFieldKeys.join(", ") || "(none configured)"}`,
    "",
    "Call the submit_scoring tool exactly once with your full structured result. Score every rubric parameter id given — do not omit any.",
  ].join("\n");
}

export async function scoreCall(input: ScoreCallInput): Promise<ScoringResult> {
  if (!hasAnthropic) {
    return mockScoreCall(input);
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: buildSystemPrompt(input),
    tools: [SCORING_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "submit_scoring" },
    messages: [
      {
        role: "user",
        content: `Transcript (${input.associateName} calling ${input.leadName}):\n\n${transcriptToText(input.transcript)}`,
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a submit_scoring tool call");
  }
  return ScoringResultSchema.parse(toolUse.input);
}

/**
 * Deterministic mock scorer used whenever ANTHROPIC_API_KEY is unset, so the
 * whole upload → transcribe → translate → score → notify pipeline runs
 * end-to-end without any external LLM account.
 */
function mockScoreCall(input: ScoreCallInput): ScoringResult {
  const text = transcriptToText(input.transcript).toLowerCase();
  const hash = [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 7);
  const rand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const parameterScores = input.rubricParameters.map((p, i) => {
    const r = rand(hash + i);
    const verdict = r < 0.62 ? "pass" : r < 0.85 ? "partial" : r < 0.96 ? "fail" : "na";
    return {
      parameterId: p.id,
      verdict: verdict as "pass" | "partial" | "fail" | "na",
      supportingQuote: verdict === "na" ? null : (input.transcript[i % input.transcript.length]?.text ?? null),
      confidence: Math.round((0.55 + rand(hash + i + 100) * 0.4) * 100) / 100,
      rationale: `[mock] Heuristic verdict — set ANTHROPIC_API_KEY for real Claude scoring against "${p.text}".`,
    };
  });

  const failRate = parameterScores.filter((p) => p.verdict === "fail").length / parameterScores.length;
  const riskLevel = failRate > 0.4 ? "high_fabrication_risk" : failRate > 0.2 ? "needs_review" : "likely_genuine";

  return {
    parameterScores,
    authenticity: {
      riskLevel,
      rationale: "[mock] Authenticity heuristic based on overall fail-rate; not a real fabrication analysis.",
    },
    summary: `[mock] ${input.associateName} spoke with ${input.leadName} for ${input.transcript.length} transcript lines.`,
    callSummaryBullets: ["[mock] Standard call flow followed.", "[mock] No real LLM call was made — set ANTHROPIC_API_KEY."],
    actionItems: [
      {
        title: "Follow up with the lead",
        dueInDays: 3,
        sayScript: "Hi, just checking in on our last conversation — do you have any questions?",
        rationale: "[mock] Default follow-up cadence.",
      },
    ],
    objections: [],
    dataCapture: [],
  };
}
