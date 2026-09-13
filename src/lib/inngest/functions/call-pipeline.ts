import { inngest } from "@/lib/inngest/client";
import { executeCallPipeline, PipelineNonRetriableError, type StepRunner } from "@/lib/pipeline/execute";
import { NonRetriableError } from "inngest";

export const callPipeline = inngest.createFunction({ id: "call-pipeline", retries: 3 }, { event: "call/uploaded" }, async ({ event, step }) => {
  try {
    // Inngest's step.run round-trips return values through JSON (so e.g.
    // Date fields on `loaded.lead`/`loaded.convo` come back as strings) —
    // that's fine here since the pipeline only reads ids/strings off them,
    // but it makes step.run's inferred type structurally stricter than our
    // driver-agnostic StepRunner, hence the cast.
    return await executeCallPipeline(event.data.callId, step as StepRunner);
  } catch (err) {
    if (err instanceof PipelineNonRetriableError) throw new NonRetriableError(err.message);
    throw err;
  }
});
