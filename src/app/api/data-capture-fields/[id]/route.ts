import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const row = await db.query.dataCaptureFields.findFirst({ where: eq(t.dataCaptureFields.id, id) });
  if (!row || row.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(t.dataCaptureFields).where(eq(t.dataCaptureFields.id, id));
  return NextResponse.json({ ok: true });
}
