import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { RubricParameterSchema } from "@/lib/validations/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const row = await db.query.rubricParameters.findFirst({ where: eq(t.rubricParameters.id, id) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const category = await db.query.rubricCategories.findFirst({ where: eq(t.rubricCategories.id, row.categoryId) });
  if (!category || category.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = RubricParameterSchema.partial().safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [updated] = await db.update(t.rubricParameters).set(body.data).where(eq(t.rubricParameters.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const row = await db.query.rubricParameters.findFirst({ where: eq(t.rubricParameters.id, id) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const category = await db.query.rubricCategories.findFirst({ where: eq(t.rubricCategories.id, row.categoryId) });
  if (!category || category.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(t.rubricParameters).where(eq(t.rubricParameters.id, id));
  return NextResponse.json({ ok: true });
}
