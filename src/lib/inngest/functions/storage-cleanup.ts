import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";

import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { deleteRehostedRecording } from "@/lib/integrations/storage";
import { env } from "@/lib/env";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 1 day past terminal status, so a reviewer can still listen right after scoring

/**
 * R2 cleanup sweep — deletes re-hosted recordings once their conversation is
 * terminal (`scored`/`failed`) and past a grace period. Never touches a row
 * still `transcribing`/mid-retry (excluded by the status filter).
 *
 * Disabled by default (`CLEANUP_REHOSTED_RECORDINGS` unset) — PRD § 9.1 flags
 * long-term audio retention for compliance/QA review as an open product
 * decision, not something to default into silently. Flip the env var on only
 * once that's answered; until then this cron is a no-op every run.
 */
export const storageCleanup = inngest.createFunction({ id: "storage-cleanup", retries: 3 }, { cron: "0 * * * *" }, async ({ step }) => {
  if (!env.cleanupRehostedRecordings) {
    return { checked: 0, deleted: 0, skipped: "CLEANUP_REHOSTED_RECORDINGS is not set — see PRD § 9.1" };
  }

  const eligible = await step.run("find-eligible", async () => {
    const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);
    return db
      .select()
      .from(t.conversations)
      .where(and(inArray(t.conversations.status, ["scored", "failed"]), lte(t.conversations.updatedAt, cutoff), isNotNull(t.conversations.audioUrl)));
  });

  const toDelete = eligible.filter((c) => c.audioUrl?.startsWith(`${env.supabaseUrl}/storage/v1/`));

  let deleted = 0;
  for (const convo of toDelete) {
    await step.run(`delete-${convo.id}`, async () => {
      await deleteRehostedRecording(convo.orgId, convo.id);
      // Clear the pointer so this row drops out of `eligible` on future runs
      // instead of re-attempting an already-completed (idempotent) delete forever.
      await db.update(t.conversations).set({ audioUrl: null }).where(eq(t.conversations.id, convo.id));
    });
    deleted++;
  }

  return { checked: eligible.length, deleted };
});
