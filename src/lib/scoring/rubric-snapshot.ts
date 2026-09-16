import { createHash } from "crypto";

/**
 * Real AI Evaluation spec §10 meta block — `rubric_version_id`. There's no
 * dedicated rubric-versioning table (the Rubric Editor edits categories/
 * parameters in place), so this hashes the exact set fetched for this
 * evaluation instead: stable as long as the rubric is unchanged, and changes
 * the moment a category/parameter/weight is edited — enough to tell apart "a
 * real quality trend" from "someone edited the rubric" months later.
 */
export function hashRubricSnapshot(
  categories: { id: string; weight: number }[],
  parameters: { id: string; categoryId: string; text: string; weight: string }[]
): string {
  const sortedCategories = [...categories].sort((a, b) => a.id.localeCompare(b.id));
  const sortedParameters = [...parameters].sort((a, b) => a.id.localeCompare(b.id));
  const payload = JSON.stringify({ categories: sortedCategories, parameters: sortedParameters });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
