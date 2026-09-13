import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { findOrCreateLead, createUploadedConversation } from "@/lib/db/mutations";
import { parseCsv } from "@/lib/csv";
import { plainTextToTranscript } from "@/lib/transcript";
import { CsvUploadRowSchema } from "@/lib/validations/api";
import { triggerCallPipeline } from "@/lib/pipeline/trigger";

const VALID_SOURCES = new Set(t.conversationSourceEnum.enumValues);

/**
 * Bulk CSV ingest — expects columns: associateEmail, leadName, leadEmail,
 * audioUrl, transcript, durationSeconds, source, callDate. Each valid row
 * kicks off its own pipeline run.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { csv } = (await req.json()) as { csv: string };
  if (typeof csv !== "string" || !csv.trim()) return NextResponse.json({ error: "Missing csv text" }, { status: 400 });

  const rawRows = parseCsv(csv);
  const results: { row: number; status: "queued" | "error"; message?: string; callId?: string }[] = [];

  for (const [i, raw] of rawRows.entries()) {
    const parsed = CsvUploadRowSchema.safeParse(raw);
    if (!parsed.success) {
      results.push({ row: i + 2, status: "error", message: parsed.error.issues.map((e) => e.message).join("; ") });
      continue;
    }
    const data = parsed.data;
    const associate = await db.query.users.findFirst({ where: eq(t.users.email, data.associateEmail) });
    if (!associate || associate.orgId !== user.orgId) {
      results.push({ row: i + 2, status: "error", message: `No associate found with email ${data.associateEmail}` });
      continue;
    }

    const lead = await findOrCreateLead(user.orgId, { name: data.leadName, email: data.leadEmail, ownerId: associate.id });
    const source = data.source && VALID_SOURCES.has(data.source as (typeof t.conversationSourceEnum.enumValues)[number]) ? data.source : "manually_uploaded";

    const convo = await createUploadedConversation({
      orgId: user.orgId,
      leadId: lead.id,
      associateId: associate.id,
      source: source as (typeof t.conversations.$inferInsert)["source"],
      audioUrl: data.audioUrl,
      durationSeconds: data.durationSeconds,
      callDate: data.callDate ? new Date(data.callDate) : undefined,
      transcriptRaw: data.transcript ? plainTextToTranscript(data.transcript) : undefined,
    });

    await triggerCallPipeline(convo.id);
    results.push({ row: i + 2, status: "queued", callId: convo.id });
  }

  return NextResponse.json({ total: rawRows.length, queued: results.filter((r) => r.status === "queued").length, results });
}
