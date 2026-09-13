import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canReviewCalls } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { VerdictActionSchema } from "@/lib/validations/api";

/** QA reviewer/admin sign-off workflow for the Flagged for Review queue. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canReviewCalls(user)) return NextResponse.json({ error: "Forbidden — QA reviewer or admin role required" }, { status: 403 });

  const verdict = await db.query.callVerdicts.findFirst({ where: eq(t.callVerdicts.callId, id) });
  if (!verdict) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = VerdictActionSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [updated] = await db
    .update(t.callVerdicts)
    .set({ reviewedByUserId: user.id, reviewedAt: new Date(), overallComment: body.data.overallComment ?? verdict.overallComment })
    .where(eq(t.callVerdicts.callId, id))
    .returning();
  return NextResponse.json(updated);
}
