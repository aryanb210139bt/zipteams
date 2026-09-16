import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { executeCallPipeline, PipelineNonRetriableError, type StepRunner } from "@/lib/pipeline/execute";

export const callPipeline = inngest.createFunction(
  {
    id: "call-pipeline",
    retries: 3,
    // Runs once, after every retry is exhausted (or a NonRetriableError is
    // thrown) — the one place a terminal failure is durably recorded, so a
    // broken recording lands on `status: "failed"` instead of sitting stuck
    // on whatever transient status ("transcribing", etc.) it was on mid-retry,
    // and other calls in the same batch are never blocked by it (R1 acceptance
    // criterion: one broken call doesn't stop the rest).
    onFailure: async ({ event, error }) => {
      const callId = event.data.event.data.callId;
      await db
        .update(t.conversations)
        .set({ status: "failed", errorMessage: error.message })
        .where(eq(t.conversations.id, callId));
    },
  },
  { event: "call/uploaded" },
  async ({ event, step }) => {
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
  }
);
