import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";

const LeadsquaredConfigSchema = z.object({
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  hostUrl: z.string().url().optional(),
  enabled: z.boolean(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });

  const body = LeadsquaredConfigSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const [updated] = await db.update(t.organizations).set({ leadsquaredConfig: body.data }).where(eq(t.organizations.id, user.orgId)).returning();
  return NextResponse.json(updated.leadsquaredConfig);
}
