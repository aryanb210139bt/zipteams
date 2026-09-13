import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { findOrCreateLead, createUploadedConversation } from "@/lib/db/mutations";
import { SingleUploadSchema } from "@/lib/validations/api";
import { triggerCallPipeline } from "@/lib/pipeline/trigger";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = SingleUploadSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const associate = await db.query.users.findFirst({ where: eq(t.users.id, body.data.associateId) });
  if (!associate || associate.orgId !== user.orgId) return NextResponse.json({ error: "Associate not found" }, { status: 404 });

  const lead = await findOrCreateLead(user.orgId, { name: body.data.leadName, email: body.data.leadEmail, ownerId: associate.id });
  const convo = await createUploadedConversation({
    orgId: user.orgId,
    leadId: lead.id,
    associateId: associate.id,
    source: body.data.source as (typeof t.conversations.$inferInsert)["source"],
    audioUrl: body.data.audioUrl,
    durationSeconds: body.data.durationSeconds,
  });

  await triggerCallPipeline(convo.id);
  return NextResponse.json(convo, { status: 201 });
}
