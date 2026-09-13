import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getCurrentUser, canReviewCalls } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { OverrideScoreSchema } from "@/lib/validations/api";

/** Human override for a single parameter's AI verdict (Quality sub-tab "Mark"/"Change Score" — PRD 9.6). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canReviewCalls(user)) return NextResponse.json({ error: "Forbidden — QA reviewer or admin role required" }, { status: 403 });

  const body = OverrideScoreSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [updated] = await db
    .update(t.callScores)
    .set({ verdict: body.data.verdict, overriddenByUserId: user.id, overriddenAt: new Date() })
    .where(and(eq(t.callScores.callId, id), eq(t.callScores.parameterId, body.data.parameterId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Score not found for this call/parameter" }, { status: 404 });
  return NextResponse.json(updated);
}
