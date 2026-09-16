import { and, eq } from "drizzle-orm";

import { db } from "./index";
import * as t from "./schema";

/** Finds a lead by email (or name, if no email given) within the org, or creates a new one. Used by both upload paths. */
export async function findOrCreateLead(orgId: string, input: { name: string; email?: string | null; ownerId?: string | null }) {
  if (input.email) {
    const existing = await db.query.leads.findFirst({ where: and(eq(t.leads.orgId, orgId), eq(t.leads.email, input.email)) });
    if (existing) return existing;
  }
  const [lead] = await db
    .insert(t.leads)
    .values({
      orgId,
      name: input.name,
      email: input.email || null,
      ownerId: input.ownerId ?? null,
      assigneeId: input.ownerId ?? null,
      leadStage: "in_progress_calls",
      leadStageCategory: "in_pipeline",
    })
    .returning();
  return lead;
}

/**
 * LeadSquared-specific variant of `findOrCreateLead` (R1): matches on
 * `crmRecordUrl` (the LeadSquared ProspectId) instead of email, since a call
 * activity synced from LeadSquared may not carry a lead email at all. Reuses
 * the same field `pushCallScoreToLeadsquared` already sends outbound as
 * `leadsquaredLeadId` — one field for both directions, per the PRD.
 */
export async function findOrCreateLeadByCrmRecordUrl(orgId: string, crmRecordUrl: string, name?: string | null) {
  const existing = await db.query.leads.findFirst({ where: and(eq(t.leads.orgId, orgId), eq(t.leads.crmRecordUrl, crmRecordUrl)) });
  if (existing) return existing;
  const [lead] = await db
    .insert(t.leads)
    .values({
      orgId,
      name: name || `LeadSquared prospect ${crmRecordUrl}`,
      crmRecordUrl,
      leadStage: "in_progress_calls",
      leadStageCategory: "in_pipeline",
    })
    .returning();
  return lead;
}

export type NewConversationInput = {
  orgId: string;
  leadId: string;
  associateId: string | null;
  source: (typeof t.conversations.$inferInsert)["source"];
  audioUrl?: string | null;
  durationSeconds: number;
  callDate?: Date;
  transcriptRaw?: (typeof t.conversations.$inferInsert)["transcriptRaw"];
  /** CRM-sync idempotency key (R1) — e.g. the LeadSquared ActivityId. Omit for manual/CSV uploads. */
  externalCallId?: string | null;
};

export async function createUploadedConversation(input: NewConversationInput) {
  const [convo] = await db
    .insert(t.conversations)
    .values({
      orgId: input.orgId,
      leadId: input.leadId,
      associateId: input.associateId,
      source: input.source,
      audioUrl: input.audioUrl || null,
      durationSeconds: input.durationSeconds,
      callDate: input.callDate ?? new Date(),
      status: "uploaded",
      transcriptRaw: input.transcriptRaw,
      transcriptTranslated: input.transcriptRaw, // pipeline's translate step will overwrite if a real translator is configured
      externalCallId: input.externalCallId ?? null,
    })
    .returning();
  return convo;
}
