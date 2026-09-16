import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { fetchNewCallActivities } from "@/lib/integrations/leadsquared-inbound";
import { findOrCreateLeadByCrmRecordUrl, createUploadedConversation } from "@/lib/db/mutations";
import { triggerCallPipeline } from "@/lib/pipeline/trigger";

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/**
 * R1 — discovers new LeadSquared call activities for one org and creates a
 * `conversations` row per call, idempotently (checked against
 * `externalCallId` before inserting) and immediately kicks off the pipeline
 * so the download step (R2) re-hosts the recording before its LeadSquared URL
 * can expire. Called per-org from the `leadsquared-sync` cron (R1) — kept
 * synchronous/plain here (not itself step-wrapped) since each org's sync is
 * already wrapped in its own `step.run` by the caller.
 */
type OrgForSync = Omit<typeof t.organizations.$inferSelect, "leadsquaredLastSyncedAt" | "createdAt"> & {
  // Inngest's step.run round-trips return values through JSON, so a Date field
  // on the org loaded inside "load-enabled-orgs" comes back as a string here —
  // same caveat as call-pipeline.ts's cast, just typed instead of cast away.
  leadsquaredLastSyncedAt: Date | string | null;
};

export async function syncLeadsquaredOrg(org: OrgForSync): Promise<{ synced: number; skippedNoRecording: number }> {
  const since = org.leadsquaredLastSyncedAt ? new Date(org.leadsquaredLastSyncedAt) : new Date(Date.now() - DEFAULT_LOOKBACK_MS);
  const now = new Date();

  const activities = await fetchNewCallActivities(org.leadsquaredConfig, since);

  let synced = 0;
  let skippedNoRecording = 0;
  for (const activity of activities) {
    if (!activity.recordingUrl) {
      skippedNoRecording++;
      continue;
    }

    const existing = await db.query.conversations.findFirst({
      where: and(eq(t.conversations.orgId, org.id), eq(t.conversations.externalCallId, activity.activityId)),
    });
    if (existing) continue; // already ingested this LeadSquared activity

    const lead = await findOrCreateLeadByCrmRecordUrl(org.id, activity.prospectId, activity.leadName);
    const convo = await createUploadedConversation({
      orgId: org.id,
      leadId: lead.id,
      associateId: null,
      source: "crm_recordings",
      audioUrl: activity.recordingUrl,
      durationSeconds: activity.durationSeconds,
      callDate: new Date(activity.activityDate),
      externalCallId: activity.activityId,
    });

    await triggerCallPipeline(convo.id);
    synced++;
  }

  await db.update(t.organizations).set({ leadsquaredLastSyncedAt: now }).where(eq(t.organizations.id, org.id));
  return { synced, skippedNoRecording };
}
