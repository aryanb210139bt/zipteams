import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";

const DataCaptureFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum(["text", "select"]).default("text"),
  selectOptions: z.array(z.string()).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  const rows = await db.select().from(t.dataCaptureFields).where(eq(t.dataCaptureFields.orgId, user.orgId)).orderBy(t.dataCaptureFields.sortOrder);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const body = DataCaptureFieldSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [row] = await db.insert(t.dataCaptureFields).values({ orgId: user.orgId, ...body.data }).returning();
  return NextResponse.json(row, { status: 201 });
}
