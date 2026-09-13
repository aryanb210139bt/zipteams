import { eq } from "drizzle-orm";

import { hasClerk } from "@/lib/env";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/roles";

export type { CurrentUser } from "@/lib/roles";
export { canViewAllCalls, canReviewCalls, canManageSettings } from "@/lib/roles";

/**
 * Resolves the signed-in user + their org.
 *
 * With Clerk configured (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
 * set), this reads the Clerk session and looks up the matching `users` row
 * by `clerkUserId`.
 *
 * Without Clerk configured, every page still needs *someone* to render as,
 * so this returns the seeded org's admin user — run `npm run db:reset`
 * first. Swap this branch out once real auth is wired for the deployed app;
 * it exists purely so the whole product is reviewable with zero accounts.
 *
 * Server-only: this file must never be imported from a "use client"
 * component (it transitively pulls in @clerk/nextjs/server) — import
 * `@/lib/roles` directly there instead for the CurrentUser type/role checks.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  if (hasClerk) {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Not signed in");
    }
    const dbUser = await db.query.users.findFirst({ where: eq(t.users.clerkUserId, userId) });
    if (!dbUser) {
      throw new Error("This Clerk account has no matching CallIQ user — ask an admin to invite you from Setup > Manage Team.");
    }
    return dbUser;
  }

  const dbUser = await db.query.users.findFirst({ where: eq(t.users.role, "admin") });
  if (!dbUser) {
    throw new Error("No seed data found. Run `npm run db:reset` to create the demo organization.");
  }
  return dbUser;
}
