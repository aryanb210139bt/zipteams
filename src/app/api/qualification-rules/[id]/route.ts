import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { QualificationRuleSchema } from "@/lib/validations/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const row = await db.query.qualificationRules.findFirst({ where: eq(t.qualificationRules.id, id) });
  if (!row || row.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = QualificationRuleSchema.partial().safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [updated] = await db.update(t.qualificationRules).set(body.data).where(eq(t.qualificationRules.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const row = await db.query.qualificationRules.findFirst({ where: eq(t.qualificationRules.id, id) });
  if (!row || row.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(t.qualificationRules).where(eq(t.qualificationRules.id, id));
  return NextResponse.json({ ok: true });
}
