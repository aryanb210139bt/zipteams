import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { executeCallPipeline, type StepRunner } from "./execute";

/**
 * No-op "step" — runs each phase directly, in order, with no retry/memoization.
 *
 * `sleep` here is a real synchronous `await` wait, unlike Inngest's durable
 * `step.sleep` (which survives a redeploy without blocking a worker). That's a
 * dev-only convenience for this fallback runner, same caveat as every other
 * step here: it blocks the whole request for however long the Sarvam poll
 * loop takes. Fine for local dev / when Inngest is unreachable; not something
 * to rely on for a real multi-hour batch job in production.
 */
const inlineStep: StepRunner = {
  run: (_name, fn) => fn(),
  sleep: (_name, duration) => new Promise((resolve) => setTimeout(resolve, typeof duration === "number" ? duration : parseDurationMs(duration))),
};

function parseDurationMs(duration: string): number {
  const match = /^(\d+)s$/.exec(duration);
  return match ? Number(match[1]) * 1000 : 1000;
}

/** Runs the full pipeline synchronously in the current process. Used as a fallback when Inngest isn't reachable (see trigger.ts) and by `npm run pipeline:run <callId>`. */
export async function runCallPipelineInline(callId: string) {
  try {
    return await executeCallPipeline(callId, inlineStep);
  } catch (err) {
    // No Inngest retries/onFailure hook on this path — mark the call failed
    // directly so a broken recording doesn't sit stuck in "transcribing"
    // forever and so other calls in the same batch aren't blocked by it.
    await db
      .update(t.conversations)
      .set({ status: "failed", errorMessage: err instanceof Error ? err.message : String(err) })
      .where(eq(t.conversations.id, callId));
    throw err;
  }
}
