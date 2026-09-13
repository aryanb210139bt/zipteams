import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { GlossaryTermSchema } from "@/lib/validations/api";

export async function GET() {
  const user = await getCurrentUser();
  const rows = await db.select().from(t.glossaryTerms).where(eq(t.glossaryTerms.orgId, user.orgId));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const body = GlossaryTermSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [row] = await db.insert(t.glossaryTerms).values({ orgId: user.orgId, ...body.data }).returning();
  return NextResponse.json(row, { status: 201 });
}
