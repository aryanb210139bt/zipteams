import { eq, and, ne, desc, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { transcribeAudio, applyGlossaryCorrections } from "@/lib/integrations/deepgram";
import { translateTranscript } from "@/lib/integrations/translate";
import { scoreCall, CLAUDE_MODEL, PROMPT_VERSION } from "@/lib/integrations/claude";
import { pushCallScoreToLeadsquared } from "@/lib/integrations/leadsquared";
import { sendFlaggedCallAlert } from "@/lib/integrations/resend";
import { env } from "@/lib/env";
import { BANT_KEYS } from "@/lib/db/constants";
import { computeOverallScore } from "@/lib/scoring/overall-score";
import { hashRubricSnapshot } from "@/lib/scoring/rubric-snapshot";

function intentLabelFromScore(score: number): "high" | "moderate" | "low" {
  return score >= 70 ? "high" : score >= 40 ? "moderate" : "low";
}

/** Minimal shape both Inngest's real `step` and the inline fallback runner satisfy. */
export type StepRunner = {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
};

export class PipelineNonRetriableError extends Error {}

/**
 * upload → transcribe → translate → score → notify.
 *
 * Every phase is idempotent: each re-checks the row it's about to write
 * before calling an external (billable) API, so re-running this for an
 * already-completed phase is a no-op read instead of a re-charge. This is
 * shared by the real Inngest function (lib/inngest/functions/call-pipeline.ts,
 * step.run also gives per-step retry + memoization there) and the inline
 * fallback runner (lib/pipeline/run-inline.ts) used when Inngest isn't
 * reachable, so both paths behave identically.
 */
export async function executeCallPipeline(callId: string, step: StepRunner) {
  const loaded = await step.run("load-call", async () => {
    const convo = await db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) });
    if (!convo) throw new PipelineNonRetriableError(`Call ${callId} not found`);
    const [lead, org, glossary] = await Promise.all([
      db.query.leads.findFirst({ where: eq(t.leads.id, convo.leadId) }),
      db.query.organizations.findFirst({ where: eq(t.organizations.id, convo.orgId) }),
      db.select().from(t.glossaryTerms).where(eq(t.glossaryTerms.orgId, convo.orgId)),
    ]);
    const associate = convo.associateId ? await db.query.users.findFirst({ where: eq(t.users.id, convo.associateId) }) : null;
    if (!lead || !org) throw new PipelineNonRetriableError(`Call ${callId} is missing its lead/org`);
    return { convo, lead, org, associate, glossary };
  });

  if (loaded.convo.status === "scored") {
    return { callId, status: "already-scored" as const, skipped: true };
  }

  // Step 1: transcribe (skip if a transcript already exists — e.g. arrived pre-filled via CSV bulk upload).
  const transcriptRaw = await step.run("transcribe", async () => {
    const fresh = await db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) });
    if (fresh?.transcriptRaw?.length) return fresh.transcriptRaw;

    await db.update(t.conversations).set({ status: "transcribing" }).where(eq(t.conversations.id, callId));
    const raw = await transcribeAudio({
      audioUrl: loaded.convo.audioUrl,
      leadName: loaded.lead.name,
      associateName: loaded.associate?.name ?? "the associate",
      glossaryTerms: loaded.glossary.map((g) => ({ term: g.term, commonMistranscriptions: g.commonMistranscriptions ?? [] })),
    });
    const corrected = applyGlossaryCorrections(
      raw,
      loaded.glossary.map((g) => ({ term: g.term, commonMistranscriptions: g.commonMistranscriptions ?? [] }))
    );
    await db.update(t.conversations).set({ transcriptRaw: corrected }).where(eq(t.conversations.id, callId));
    return corrected;
  });

  // Step 2: translate → English (skip if already translated).
  const transcriptTranslated = await step.run("translate", async () => {
    const fresh = await db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) });
    if (fresh?.transcriptTranslated?.length) return fresh.transcriptTranslated;

    await db.update(t.conversations).set({ status: "translating" }).where(eq(t.conversations.id, callId));
    const translated = await translateTranscript(transcriptRaw);
    await db.update(t.conversations).set({ transcriptTranslated: translated }).where(eq(t.conversations.id, callId));
    return translated;
  });

  // Step 3: Claude scoring (skip — and never re-charge — if a verdict row already exists).
  const scoring = await step.run("score", async () => {
    const existingVerdict = await db.query.callVerdicts.findFirst({ where: eq(t.callVerdicts.callId, callId) });
    if (existingVerdict) return { alreadyScored: true as const };

    await db.update(t.conversations).set({ status: "scoring" }).where(eq(t.conversations.id, callId));

    const categories = await db.select().from(t.rubricCategories).where(eq(t.rubricCategories.orgId, loaded.org.id));
    const parameters = await db.select().from(t.rubricParameters);
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const orgParameters = parameters.filter((p) => categoryById.has(p.categoryId));

    const [concernCategories, dataCaptureFields, previousConvo] = await Promise.all([
      db.select().from(t.concernCategories).where(eq(t.concernCategories.orgId, loaded.org.id)),
      db.select().from(t.dataCaptureFields).where(eq(t.dataCaptureFields.orgId, loaded.org.id)),
      db.query.conversations.findFirst({
        where: and(eq(t.conversations.leadId, loaded.lead.id), ne(t.conversations.id, callId), isNotNull(t.conversations.intentScore)),
        orderBy: desc(t.conversations.callDate),
      }),
    ]);

    const result = await scoreCall({
      leadName: loaded.lead.name,
      associateName: loaded.associate?.name ?? "the associate",
      transcript: transcriptTranslated,
      rubricParameters: orgParameters.map((p) => ({
        id: p.id,
        categoryName: categoryById.get(p.categoryId)!.name,
        text: p.text,
        weight: p.weight,
        supportsPartialCredit: p.supportsPartialCredit,
      })),
      concernCategoryNames: concernCategories.map((c) => c.name),
      dataCaptureFieldKeys: dataCaptureFields.map((f) => f.key),
      previousIntentScore: previousConvo?.intentScore ?? null,
      previousCallDate: previousConvo?.callDate ?? null,
    });

    const rubricSnapshotHash = hashRubricSnapshot(
      categories.map((c) => ({ id: c.id, weight: c.weight })),
      orgParameters.map((p) => ({ id: p.id, categoryId: p.categoryId, text: p.text, weight: p.weight }))
    );

    return {
      alreadyScored: false as const,
      result,
      categories,
      orgParameters,
      concernCategories,
      dataCaptureFields,
      previousIntentScore: previousConvo?.intentScore ?? null,
      rubricSnapshotHash,
    };
  });

  // Step 4: persist scores/verdict/intent/BANT/objections/data-capture/next-steps
  // (only the first time scoring actually happened).
  if (!scoring.alreadyScored) {
    await step.run("persist-results", async () => {
      const { result, categories, orgParameters, concernCategories, dataCaptureFields, previousIntentScore, rubricSnapshotHash } = scoring;
      const paramById = new Map(orgParameters.map((p) => [p.id, p]));

      if (result.parameterScores.length) {
        await db.insert(t.callScores).values(
          result.parameterScores
            .filter((s) => paramById.has(s.parameterId))
            .map((s) => ({
              callId,
              parameterId: s.parameterId,
              verdict: s.verdict,
              supportingQuote: s.supportingQuote,
              confidence: s.confidence,
              aiRationale: s.rationale,
              evidenceTimestampSeconds: s.evidenceTimestampSeconds,
              llmPromptVersion: PROMPT_VERSION,
            }))
        );
      }

      // Real AI Evaluation spec §2.3 — the ONE shared formula (lib/scoring/overall-score.ts),
      // also used by any historical Dashboard aggregate so the two can't drift apart.
      const { percent: overallScore } = computeOverallScore(
        categories.map((c) => ({ id: c.id, weight: c.weight })),
        orgParameters.map((p) => ({ id: p.id, categoryId: p.categoryId })),
        result.parameterScores.filter((s) => paramById.has(s.parameterId))
      );

      const flaggedForReview = result.authenticity.riskLevel === "high_fabrication_risk" || result.authenticity.riskLevel === "needs_review";

      await db.insert(t.callVerdicts).values({
        callId,
        overallScore,
        riskLevel: result.authenticity.riskLevel,
        fabricationRiskScore: result.authenticity.fabricationRiskScore,
        flaggedForReview,
        fabricationRationale: result.authenticity.rationale,
        summary: result.summary.callSummary.join(" "),
        callSummary: result.summary.callSummary,
        keyPoints: result.summary.keyPoints,
        mainTakeaways: result.summary.mainTakeaways,
        llmPromptVersion: PROMPT_VERSION,
        model: CLAUDE_MODEL,
        rubricSnapshotHash,
      });

      // Intent (spec §3) is a distinct signal from qualityScore/overallScore — never derive
      // one from the other. intentLabel and intentTrend are both derived here in code (not
      // asked of the model) so the boundary stays consistent and adjustable without re-prompting.
      const intentScore = result.intent.intentScore;
      const intentLabel = intentLabelFromScore(intentScore);
      const intentTrend = previousIntentScore == null ? null : intentScore > previousIntentScore ? "up" : intentScore < previousIntentScore ? "down" : "flat";

      await db
        .update(t.conversations)
        .set({
          status: "scored",
          qualityScore: overallScore,
          intent: intentLabel,
          intentScore,
          highIntentFactors: result.intent.highIntentFactors,
          lowIntentFactors: result.intent.lowIntentFactors,
          intentTrend,
          intentTrendRationale: previousIntentScore == null ? null : result.intent.intentTrendRationale,
          llmPromptVersion: PROMPT_VERSION,
        })
        .where(eq(t.conversations.id, callId));

      // Lead-level Intent Score (spec §3) — the most recent call's score, NOT an average,
      // so the "intent reduced from last call" callout reflects the latest call's state.
      await db.update(t.leads).set({ intentScore, updatedAt: new Date() }).where(eq(t.leads.id, loaded.lead.id));

      if (result.objections.length) {
        const byName = new Map(concernCategories.map((c) => [c.name, c]));
        await db.insert(t.objections).values(
          result.objections
            .filter((o) => byName.has(o.concernCategory))
            .map((o) => ({
              callId,
              concernCategoryId: byName.get(o.concernCategory)!.id,
              statement: o.objectionText,
              handling: o.howHandled,
              customerSatisfied: o.customerSatisfied,
            }))
        );
      }

      // BANT (spec §4) is a fixed sales-methodology concept, not org-configurable — but it's
      // stored through the same generic data_capture_values mechanism the UI already reads
      // (filtered by BANT_KEYS). Always insert all 4, null included: that's a legitimate value
      // the frontend already renders as an empty box, not a fabricated placeholder sentence.
      const dataCaptureFieldByKey = new Map(dataCaptureFields.map((f) => [f.key, f]));
      const bantRows = BANT_KEYS.filter((key) => dataCaptureFieldByKey.has(key)).map((key) => ({
        callId,
        fieldId: dataCaptureFieldByKey.get(key)!.id,
        value: result.bant[key as keyof typeof result.bant],
        sourceTimestampSeconds: null,
        evidenceQuote: null,
      }));

      // General data capture (spec §6) — org-configurable fields, only when the call actually
      // touched on them (this list is naturally sparse, unlike BANT's "always attempt" rule).
      const dataCaptureRows = result.dataCapture
        .filter((d) => dataCaptureFieldByKey.has(d.fieldKey) && !BANT_KEYS.includes(d.fieldKey))
        .map((d) => ({
          callId,
          fieldId: dataCaptureFieldByKey.get(d.fieldKey)!.id,
          value: d.value,
          sourceTimestampSeconds: null,
          evidenceQuote: d.evidenceQuote,
        }));

      if (bantRows.length || dataCaptureRows.length) {
        await db.insert(t.dataCaptureValues).values([...bantRows, ...dataCaptureRows]);
      }

      if (result.nextSteps.length) {
        await db.insert(t.tasks).values(
          result.nextSteps.map((ns) => ({
            orgId: loaded.org.id,
            leadId: loaded.lead.id,
            callId,
            title: ns.actionLabel,
            description: ns.explanation,
            sayScript: ns.suggestedScript,
            rationale: ns.scriptRationale,
            dueDate: new Date(Date.now() + ns.dueInDays * 24 * 60 * 60 * 1000),
            status: "open" as const,
          }))
        );
      }
    });
  }

  // Step 5: notify — push to Leadsquared, and alert QA managers on flagged calls.
  await step.run("notify", async () => {
    const verdict = await db.query.callVerdicts.findFirst({ where: eq(t.callVerdicts.callId, callId) });
    if (!verdict) return { notified: false };

    await pushCallScoreToLeadsquared({
      config: loaded.org.leadsquaredConfig,
      leadsquaredLeadId: loaded.lead.crmRecordUrl,
      callId,
      overallScore: verdict.overallScore,
      riskLevel: verdict.riskLevel,
      summary: verdict.summary ?? "",
    });

    if (verdict.riskLevel !== "likely_genuine") {
      const reviewers = await db.select().from(t.users).where(eq(t.users.orgId, loaded.org.id));
      const qaEmails = reviewers.filter((u) => u.role === "admin" || u.role === "qa_reviewer").map((u) => u.email);
      await sendFlaggedCallAlert({
        toEmails: qaEmails,
        leadName: loaded.lead.name,
        associateName: loaded.associate?.name ?? "Unassigned",
        callId,
        riskLevel: verdict.riskLevel,
        rationale: verdict.fabricationRationale ?? "",
        reviewUrl: `${env.appUrl}/review-queue`,
      });
    }
    return { notified: true };
  });

  return { callId, status: "scored" as const };
}
