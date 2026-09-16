import Anthropic from "@anthropic-ai/sdk";

import { useRealScoring, env } from "@/lib/env";
import { buildScoringTool, buildSystemPrompt, type ScoreCallInput } from "@/lib/ai-evaluation/build-prompt";
import { ScoringResultSchema, type ScoringResult } from "@/lib/validations/scoring";

/** Default to the latest, most capable Claude model for scoring. */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
/** Bump whenever the prompt or tool-schema shape changes — stored on every verdict row for auditability. */
export const PROMPT_VERSION = "real-ai-evaluation-v1";

export type { RubricParameterInput, ScoreCallInput } from "@/lib/ai-evaluation/build-prompt";

function transcriptToText(input: ScoreCallInput): string {
  return input.transcript
    .map((l) => `[${l.startSeconds}s-${l.endSeconds}s] ${l.speaker === "associate" ? "Associate" : "Lead"}: ${l.text}`)
    .join("\n");
}

export async function scoreCall(input: ScoreCallInput): Promise<ScoringResult> {
  if (!useRealScoring) {
    return mockScoreCall(input);
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(input),
    tools: [buildScoringTool(input)],
    tool_choice: { type: "tool", name: "submit_scoring" },
    messages: [
      {
        role: "user",
        content: `Transcript (${input.associateName} calling ${input.leadName}):\n\n${transcriptToText(input)}`,
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
 * Deterministic mock scorer used whenever real scoring isn't enabled (no
 * ANTHROPIC_API_KEY, or REAL_SCORING_ENABLED isn't "true"), so the whole
 * upload → transcribe → translate → score → notify pipeline runs end-to-end
 * without any external LLM account. Emits the exact same shape scoreCall's
 * real branch does, so persist-results never has to special-case it.
 */
function mockScoreCall(input: ScoreCallInput): ScoringResult {
  const text = transcriptToText(input).toLowerCase();
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
      rationale: `[mock] Heuristic verdict — set ANTHROPIC_API_KEY and REAL_SCORING_ENABLED=true for real Claude scoring against "${p.text}".`,
      evidenceTimestampSeconds: verdict === "na" ? null : (input.transcript[i % input.transcript.length]?.startSeconds ?? null),
    };
  });

  const failRate = parameterScores.length ? parameterScores.filter((p) => p.verdict === "fail").length / parameterScores.length : 0;
  const riskLevel = failRate > 0.4 ? "high_fabrication_risk" : failRate > 0.2 ? "needs_review" : "likely_genuine";
  const intentScore = Math.round((1 - failRate) * 100);

  return {
    parameterScores,
    authenticity: {
      riskLevel,
      fabricationRiskScore: Math.round(failRate * 100),
      rationale: "[mock] Authenticity heuristic based on overall fail-rate; not a real fabrication analysis.",
    },
    intent: {
      intentScore,
      highIntentFactors: intentScore >= 40 ? ["[mock] Lead engaged with multiple questions during the call."] : [],
      lowIntentFactors: intentScore < 70 ? ["[mock] Lead gave non-committal answers to timeline questions."] : [],
      intentTrendRationale:
        input.previousIntentScore == null
          ? null
          : `[mock] Heuristic comparison against the previous call's ${input.previousIntentScore}/100.`,
    },
    bant: { budget: null, authority: null, needs: null, timeline: null },
    objections: [],
    dataCapture: [],
    summary: {
      callSummary: [`[mock] ${input.associateName} spoke with ${input.leadName} for ${input.transcript.length} transcript lines.`],
      keyPoints: ["[mock] No real LLM call was made — set ANTHROPIC_API_KEY and REAL_SCORING_ENABLED=true."],
      mainTakeaways: ["[mock] Standard call flow followed."],
    },
    nextSteps: [
      {
        actionLabel: "Follow up with the lead",
        explanation: "[mock] Default follow-up cadence.",
        dueInDays: 3,
        suggestedScript: "Hi, just checking in on our last conversation — do you have any questions?",
        scriptRationale: "[mock] Keeps the conversation warm without being pushy.",
      },
    ],
  };
}
