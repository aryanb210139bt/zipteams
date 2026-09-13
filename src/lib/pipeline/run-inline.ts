import { executeCallPipeline, type StepRunner } from "./execute";

/** No-op "step" — runs each phase directly, in order, with no retry/memoization. */
const inlineStep: StepRunner = {
  run: (_name, fn) => fn(),
};

/** Runs the full pipeline synchronously in the current process. Used as a fallback when Inngest isn't reachable (see trigger.ts) and by `npm run pipeline:run <callId>`. */
export function runCallPipelineInline(callId: string) {
  return executeCallPipeline(callId, inlineStep);
}
