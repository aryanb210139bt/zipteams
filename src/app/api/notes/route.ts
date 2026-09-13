import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";

const CreateNoteSchema = z.object({ leadId: z.string().uuid(), body: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = CreateNoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lead = await db.query.leads.findFirst({ where: eq(t.leads.id, parsed.data.leadId) });
  if (!lead || lead.orgId !== user.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [note] = await db.insert(t.notes).values({ leadId: parsed.data.leadId, authorId: user.id, body: parsed.data.body }).returning();
  return NextResponse.json(note, { status: 201 });
}
