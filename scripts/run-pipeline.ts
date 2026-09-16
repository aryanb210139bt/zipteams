/**
 * Runs the call pipeline (transcribe → translate → score → notify) inline,
 * synchronously, for one call — the "test against ONE real uploaded call
 * before it replaces the mock for everything" workflow from the Real AI
 * Evaluation spec. Prints the resulting verdict/scores/intent/BANT/
 * objections/next-steps so you can eyeball the JSON before trusting it.
 *
 * Usage: npm run pipeline:run -- <callId>
 */
import "dotenv/config";

async function main() {
  const callId = process.argv[2];
  if (!callId) {
    console.error("Usage: npm run pipeline:run -- <callId>");
    process.exit(1);
  }

  const { runCallPipelineInline } = await import("../src/lib/pipeline/run-inline");
  const { db, schema: t } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const { useRealScoring } = await import("../src/lib/env");

  console.log(`[pipeline:run] scoring mode: ${useRealScoring ? "REAL (Anthropic API — this will spend money)" : "MOCK (deterministic heuristic, no external call)"}`);

  const result = await runCallPipelineInline(callId);
  console.log("[pipeline:run] pipeline result:", result);

  const [verdict, scores, conversation, objections, dataCapture, tasks] = await Promise.all([
    db.query.callVerdicts.findFirst({ where: eq(t.callVerdicts.callId, callId) }),
    db
      .select({ score: t.callScores, parameter: t.rubricParameters, category: t.rubricCategories })
      .from(t.callScores)
      .innerJoin(t.rubricParameters, eq(t.callScores.parameterId, t.rubricParameters.id))
      .innerJoin(t.rubricCategories, eq(t.rubricParameters.categoryId, t.rubricCategories.id))
      .where(eq(t.callScores.callId, callId)),
    db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) }),
    db
      .select({ objection: t.objections, concern: t.concernCategories })
      .from(t.objections)
      .innerJoin(t.concernCategories, eq(t.objections.concernCategoryId, t.concernCategories.id))
      .where(eq(t.objections.callId, callId)),
    db
      .select({ value: t.dataCaptureValues, field: t.dataCaptureFields })
      .from(t.dataCaptureValues)
      .innerJoin(t.dataCaptureFields, eq(t.dataCaptureValues.fieldId, t.dataCaptureFields.id))
      .where(eq(t.dataCaptureValues.callId, callId)),
    db.select().from(t.tasks).where(eq(t.tasks.callId, callId)),
  ]);

  console.log("\n--- Full combined output (spec §10 shape, as persisted) ---");
  console.log(
    JSON.stringify(
      {
        quality_scores: scores.map((s) => ({
          parameter_id: s.parameter.id,
          category: s.category.name,
          score_earned: s.score.verdict === "pass" ? 1 : s.score.verdict === "partial" ? 0.5 : 0,
          score_possible: s.score.verdict === "na" ? 0 : 1,
          status: s.score.verdict,
          rationale: s.score.aiRationale,
          confidence: s.score.confidence,
          evidence_timestamp: s.score.evidenceTimestampSeconds,
        })),
        overall_score: { percent: verdict?.overallScore },
        intent: {
          intent_score: conversation?.intentScore,
          intent_label: conversation?.intent,
          high_intent_factors: conversation?.highIntentFactors,
          low_intent_factors: conversation?.lowIntentFactors,
          intent_trend: conversation?.intentTrend,
          intent_trend_rationale: conversation?.intentTrendRationale,
        },
        objections: objections.map((o) => ({
          concern_category: o.concern.name,
          objection_text: o.objection.statement,
          how_handled: o.objection.handling,
          customer_satisfied: o.objection.customerSatisfied,
        })),
        data_capture: dataCapture.map((d) => ({ field_key: d.field.key, value: d.value.value, evidence_quote: d.value.evidenceQuote })),
        summary: { call_summary: verdict?.callSummary, key_points: verdict?.keyPoints, main_takeaways: verdict?.mainTakeaways },
        next_steps: tasks.map((task) => ({ action_label: task.title, explanation: task.description, due_by: task.dueDate, suggested_script: task.sayScript, script_rationale: task.rationale })),
        authenticity: {
          fabrication_risk_score: verdict?.fabricationRiskScore,
          risk_level: verdict?.riskLevel,
          fabrication_rationale: verdict?.fabricationRationale,
          flagged_for_review: verdict?.flaggedForReview,
        },
        meta: {
          model: verdict?.model,
          prompt_version: verdict?.llmPromptVersion,
          rubric_version_id: verdict?.rubricSnapshotHash,
          evaluated_at: verdict?.createdAt,
        },
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[pipeline:run] failed:", err);
    process.exit(1);
  });
