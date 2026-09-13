import { NextResponse, type NextRequest } from "next/server";

import { hasClerk } from "@/lib/env";

/**
 * Clerk auth is opt-in: without NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY /
 * CLERK_SECRET_KEY set, middleware is a no-op and every route is reachable
 * (see lib/auth.ts's dev fallback). Set both env vars to require sign-in.
 */
async function noopMiddleware() {
  return NextResponse.next();
}

async function withClerk(req: NextRequest) {
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/inngest", "/api/webhooks(.*)"]);
  return clerkMiddleware(async (authFn, request) => {
    if (!isPublicRoute(request)) {
      await authFn.protect();
    }
  })(req, {} as never);
}

export default function middleware(req: NextRequest) {
  return hasClerk ? withClerk(req) : noopMiddleware();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
