import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { TranscriptLine } from "@/lib/db/schema";
import { applyGlossaryCorrections } from "@/lib/integrations/deepgram";
import { createAndStartSarvamJob, getSarvamJobStatus, downloadSarvamResult, type SarvamJobStatus } from "@/lib/integrations/sarvam";
import { env } from "@/lib/env";
import type { StepRunner } from "./execute";

export type SarvamTranscribeStepInput = {
  audioUrl: string | null;
  leadName: string;
  associateName: string;
  glossaryTerms: { term: string; commonMistranscriptions: string[] }[];
};

/**
 * Runs the Sarvam Batch STT async job lifecycle as a sequence of durable
 * Inngest steps (R3): submit once, poll with `step.sleep` between checks
 * (capped exponential backoff), download+parse on a terminal status. Each
 * `step.run`/`step.sleep` is independently memoized, so a redeploy mid-poll
 * resumes at the next sleep instead of resubmitting the job and re-paying for
 * it (R4) — the submit step itself also re-checks the row first, so even a
 * cold restart with no in-memory state just picks the persisted `sarvamJobId`
 * back up and keeps polling it.
 */
export async function transcribeViaSarvamSteps(callId: string, step: StepRunner, input: SarvamTranscribeStepInput): Promise<TranscriptLine[]> {
  const submitted = await step.run("sarvam-submit", async () => {
    const fresh = await db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) });
    if (fresh?.transcriptRaw?.length) {
      return { jobId: fresh.sarvamJobId, alreadyTranscribed: true as const };
    }
    if (fresh?.sarvamJobId && fresh.sarvamJobStatus === "running") {
      // A job is already in flight (e.g. resumed after a restart) — never
      // blindly resubmit and re-pay, just keep polling the existing job.
      return { jobId: fresh.sarvamJobId, alreadyTranscribed: false as const };
    }
    if (!input.audioUrl) {
      throw new Error(`Call ${callId} has no audioUrl to submit to Sarvam`);
    }

    // A prior job existing here means this is a resubmit after a previous
    // failure (the "still running" case returned above already) — track how
    // many times, so a permanently-broken recording doesn't retry forever.
    const retryCount = fresh?.sarvamJobId ? (fresh.sarvamRetryCount ?? 0) + 1 : 0;
    await db.update(t.conversations).set({ status: "transcribing" }).where(eq(t.conversations.id, callId));
    const { jobId } = await createAndStartSarvamJob({ audioUrl: input.audioUrl, leadName: input.leadName, associateName: input.associateName });
    await db.update(t.conversations).set({ sarvamJobId: jobId, sarvamJobStatus: "running", sarvamRetryCount: retryCount }).where(eq(t.conversations.id, callId));
    return { jobId, alreadyTranscribed: false as const };
  });

  if (submitted.alreadyTranscribed) {
    const fresh = await db.query.conversations.findFirst({ where: eq(t.conversations.id, callId) });
    return fresh!.transcriptRaw!;
  }

  const jobId = submitted.jobId!;
  let status: SarvamJobStatus = "running";
  const startedAtMs = Date.now();
  for (let attempt = 0; status === "running"; attempt++) {
    if (Date.now() - startedAtMs > env.sarvamBatchPollTimeoutSec * 1000) {
      throw new Error(`Sarvam job ${jobId} timed out after ${env.sarvamBatchPollTimeoutSec}s (call ${callId})`);
    }
    const delaySec = Math.min(env.sarvamBatchPollInitialSec * 2 ** attempt, env.sarvamBatchPollMaxSec);
    await step.sleep(`sarvam-poll-wait-${attempt}`, `${delaySec}s`);
    status = await step.run(`sarvam-check-status-${attempt}`, async () => {
      const s = await getSarvamJobStatus(jobId);
      await db.update(t.conversations).set({ sarvamJobStatus: s }).where(eq(t.conversations.id, callId));
      return s;
    });
  }

  if (status === "failed") {
    await db
      .update(t.conversations)
      .set({ status: "failed", errorMessage: `Sarvam transcription job ${jobId} failed` })
      .where(eq(t.conversations.id, callId));
    throw new Error(`Sarvam transcription job ${jobId} failed (call ${callId})`);
  }

  return step.run("sarvam-download-parse", async () => {
    const lines = await downloadSarvamResult(jobId, { leadName: input.leadName, associateName: input.associateName });
    const corrected = applyGlossaryCorrections(lines, input.glossaryTerms);
    await db.update(t.conversations).set({ transcriptRaw: corrected }).where(eq(t.conversations.id, callId));
    return corrected;
  });
}
