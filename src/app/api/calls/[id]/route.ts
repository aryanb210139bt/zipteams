import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canViewAllCalls } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const convo = await db.query.conversations.findFirst({ where: eq(t.conversations.id, id) });
  if (!convo || convo.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewAllCalls(user) && convo.associateId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [verdict, scores] = await Promise.all([
    db.query.callVerdicts.findFirst({ where: eq(t.callVerdicts.callId, id) }),
    db.select().from(t.callScores).where(eq(t.callScores.callId, id)),
  ]);
  return NextResponse.json({ conversation: convo, verdict, scores });
}
