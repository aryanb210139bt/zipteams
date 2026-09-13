import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { UpdateLeadSchema } from "@/lib/validations/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, id) });
  if (!lead || lead.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, id) });
  if (!lead || lead.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = UpdateLeadSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [updated] = await db.update(t.leads).set({ ...body.data, updatedAt: new Date() }).where(eq(t.leads.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, id) });
  if (!lead || lead.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "associate") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(t.leads).where(eq(t.leads.id, id));
  return NextResponse.json({ ok: true });
}
