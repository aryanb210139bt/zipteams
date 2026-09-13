import { inngest } from "@/lib/inngest/client";
import { runCallPipelineInline } from "./run-inline";

/**
 * Enqueues the call pipeline via Inngest. If Inngest isn't configured/
 * reachable (no INNGEST_EVENT_KEY and no local Inngest Dev Server running —
 * the common case for a fresh clone with zero external accounts), falls
 * back to running the pipeline inline, synchronously, so uploads still
 * complete end to end instead of silently queueing forever.
 */
export async function triggerCallPipeline(callId: string) {
  try {
    await inngest.send({ name: "call/uploaded", data: { callId } });
    return { mode: "inngest" as const };
  } catch (err) {
    console.warn(
      `[pipeline] Inngest send failed (${err instanceof Error ? err.message : err}) — running the pipeline inline instead. ` +
        "Set INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY, or run `npx inngest-cli dev`, for real async orchestration with retries."
    );
    await runCallPipelineInline(callId);
    return { mode: "inline" as const };
  }
}
