import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { RubricParameterSchema } from "@/lib/validations/api";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const body = RubricParameterSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const category = await db.query.rubricCategories.findFirst({ where: eq(t.rubricCategories.id, body.data.categoryId) });
  if (!category || category.orgId !== user.orgId) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const [row] = await db.insert(t.rubricParameters).values(body.data).returning();
  return NextResponse.json(row, { status: 201 });
}
