import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { transcribeAudio, applyGlossaryCorrections } from "@/lib/integrations/deepgram";
import { translateTranscript } from "@/lib/integrations/translate";
import { scoreCall, PROMPT_VERSION } from "@/lib/integrations/claude";
import { pushCallScoreToLeadsquared } from "@/lib/integrations/leadsquared";
import { sendFlaggedCallAlert } from "@/lib/integrations/resend";
import { env } from "@/lib/env";

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

    const [concernCategories, dataCaptureFields] = await Promise.all([
      db.select().from(t.concernCategories).where(eq(t.concernCategories.orgId, loaded.org.id)),
      db.select().from(t.dataCaptureFields).where(eq(t.dataCaptureFields.orgId, loaded.org.id)),
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
    });

    return { alreadyScored: false as const, result, categories, orgParameters, concernCategories, dataCaptureFields };
  });

  // Step 4: persist scores/verdict/objections/data-capture (only the first time scoring actually happened).
  if (!scoring.alreadyScored) {
    await step.run("persist-results", async () => {
      const { result, categories, orgParameters, concernCategories, dataCaptureFields } = scoring;
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
              llmPromptVersion: PROMPT_VERSION,
            }))
        );
      }

      const weightByCategoryId: Record<string, number> = {};
      for (const cat of categories) weightByCategoryId[cat.id] = cat.weight;
      let weightedSum = 0;
      let weightTotal = 0;
      const byCategory = new Map<string, { sum: number; n: number }>();
      for (const s of result.parameterScores) {
        const param = paramById.get(s.parameterId);
        if (!param || s.verdict === "na") continue;
        const val = s.verdict === "pass" ? 1 : s.verdict === "partial" ? 0.5 : 0;
        const agg = byCategory.get(param.categoryId) ?? { sum: 0, n: 0 };
        agg.sum += val;
        agg.n += 1;
        byCategory.set(param.categoryId, agg);
      }
      for (const [categoryId, agg] of byCategory) {
        const weight = weightByCategoryId[categoryId] ?? 0;
        if (weight === 0 || !agg.n) continue;
        weightedSum += (agg.sum / agg.n) * weight;
        weightTotal += weight;
      }
      const overallScore = weightTotal ? Math.round((weightedSum / weightTotal) * 100) : 0;

      await db.insert(t.callVerdicts).values({
        callId,
        overallScore,
        riskLevel: result.authenticity.riskLevel,
        fabricationRationale: result.authenticity.rationale,
        summary: result.summary,
        llmPromptVersion: PROMPT_VERSION,
      });

      const intent = overallScore >= 75 ? "high" : overallScore >= 55 ? "moderate" : overallScore >= 35 ? "neutral" : overallScore >= 15 ? "low" : "not_qualified";
      await db.update(t.conversations).set({ status: "scored", qualityScore: overallScore, intent, llmPromptVersion: PROMPT_VERSION }).where(eq(t.conversations.id, callId));

      if (result.objections.length) {
        const byName = new Map(concernCategories.map((c) => [c.name, c]));
        await db.insert(t.objections).values(
          result.objections
            .filter((o) => byName.has(o.concernCategory))
            .map((o) => ({
              callId,
              concernCategoryId: byName.get(o.concernCategory)!.id,
              statement: o.statement,
              handling: o.handling,
              customerSatisfied: o.customerSatisfied,
            }))
        );
      }

      if (result.dataCapture.length) {
        const byKey = new Map(dataCaptureFields.map((f) => [f.key, f]));
        await db.insert(t.dataCaptureValues).values(
          result.dataCapture
            .filter((d) => byKey.has(d.fieldKey))
            .map((d) => ({
              callId,
              fieldId: byKey.get(d.fieldKey)!.id,
              value: d.value,
              sourceTimestampSeconds: d.sourceTimestampSeconds,
            }))
        );
      }

      if (result.actionItems.length) {
        await db.insert(t.tasks).values(
          result.actionItems.map((a) => ({
            orgId: loaded.org.id,
            leadId: loaded.lead.id,
            callId,
            title: a.title,
            sayScript: a.sayScript,
            rationale: a.rationale,
            dueDate: new Date(Date.now() + a.dueInDays * 24 * 60 * 60 * 1000),
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
