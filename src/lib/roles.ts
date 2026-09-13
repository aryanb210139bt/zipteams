/**
 * Pure role-check helpers + the CurrentUser type, split out from lib/auth.ts
 * so client components (e.g. quality-scorecard.tsx) can import them without
 * pulling in `next/server`'s Clerk bindings — a client component that
 * imports anything from lib/auth.ts transitively drags in 'server-only'
 * code and fails to build.
 */
export type CurrentUser = {
  id: string;
  orgId: string;
  role: "admin" | "qa_reviewer" | "associate";
  name: string;
  email: string;
};

export function canViewAllCalls(user: CurrentUser): boolean {
  return user.role === "admin" || user.role === "qa_reviewer";
}

export function canReviewCalls(user: CurrentUser): boolean {
  return user.role === "admin" || user.role === "qa_reviewer";
}

export function canManageSettings(user: CurrentUser): boolean {
  return user.role === "admin";
}
