/**
 * Real AI Evaluation spec §2.3 — the ONE place this formula is implemented.
 * Both the real-time Quality tab persistence (pipeline/execute.ts) and any
 * historical Dashboard aggregate must call this, so they can't drift apart.
 *
 *   overall_score = Σ(category_score × category_weight) / Σ(max_possible × category_weight)
 *   category_score = Σ(parameter.score_earned) / Σ(parameter.score_possible)
 *     -- for that category's non-"na" parameters only
 *   Categories with weight = 0 (e.g. Authenticity / Fabrication Risk) are excluded
 *   entirely — they never contribute to or subtract from the overall score.
 *
 * Every rubric parameter here carries a uniform score_possible of 1 (verdict
 * maps to score_earned of 1/0.5/0 for pass/partial/fail); "na" parameters
 * count toward neither earned nor possible.
 */

export type Verdict = "pass" | "partial" | "fail" | "na";

const VERDICT_VALUE: Record<Exclude<Verdict, "na">, number> = {
  pass: 1,
  partial: 0.5,
  fail: 0,
};

export type OverallScoreCategory = { id: string; weight: number };
export type OverallScoreParameter = { id: string; categoryId: string };
export type OverallScoreEntry = { parameterId: string; verdict: Verdict };

export type OverallScoreResult = {
  /** 0-100, the single number stored as call_verdicts.overallScore / conversations.qualityScore. */
  percent: number;
  /** Raw Σ score_earned across all non-na parameters, unweighted — for display alongside percent. */
  earned: number;
  /** Raw Σ score_possible across all non-na parameters, unweighted — for display alongside percent. */
  possible: number;
};

export function computeOverallScore(
  categories: OverallScoreCategory[],
  parameters: OverallScoreParameter[],
  scores: OverallScoreEntry[]
): OverallScoreResult {
  const categoryIdByParameterId = new Map(parameters.map((p) => [p.id, p.categoryId]));
  const weightByCategoryId = new Map(categories.map((c) => [c.id, c.weight]));

  const byCategory = new Map<string, { sum: number; n: number }>();
  let earned = 0;
  let possible = 0;

  for (const s of scores) {
    const categoryId = categoryIdByParameterId.get(s.parameterId);
    if (!categoryId || s.verdict === "na") continue;
    const value = VERDICT_VALUE[s.verdict];
    const agg = byCategory.get(categoryId) ?? { sum: 0, n: 0 };
    agg.sum += value;
    agg.n += 1;
    byCategory.set(categoryId, agg);
    earned += value;
    possible += 1;
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const [categoryId, agg] of byCategory) {
    const weight = weightByCategoryId.get(categoryId) ?? 0;
    if (weight === 0 || !agg.n) continue; // diagnostic-only categories (weight 0) never contribute
    weightedSum += (agg.sum / agg.n) * weight;
    weightTotal += weight;
  }

  const percent = weightTotal ? Math.round((weightedSum / weightTotal) * 100) : 0;
  return { percent, earned: Math.round(earned * 10) / 10, possible };
}
