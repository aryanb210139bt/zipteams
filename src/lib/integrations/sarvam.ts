import { hasSarvam, env } from "@/lib/env";
import type { TranscriptLine } from "@/lib/db/schema";

/**
 * Sarvam Batch STT (https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job) —
 * an async job lifecycle, unlike Deepgram's single synchronous call:
 *   init job -> upload audio bytes to the job's storage container -> start job
 *   -> poll GET .../job/v1/{job_id}/status until terminal -> download + parse result.
 *
 * IMPORTANT: the exact request/response field names below (storage container
 * shape, upload mechanics, result JSON structure) are reconstructed from public
 * docs/search — this environment's egress proxy blocks docs.sarvam.ai directly,
 * so they were **not** verified end-to-end against a live account. Per the PRD's
 * own instruction (§ R3), confirm against Sarvam's current API reference before
 * relying on this in production, in particular whether the batch endpoint can
 * accept a hosted audio URL directly (skipping the upload step) — as written,
 * this assumes it requires uploaded file bytes, matching the Python SDK's
 * upload_files() pattern that kalvium-audit-engine uses.
 */

const SARVAM_BASE_URL = "https://api.sarvam.ai";

export type SarvamJobStatus = "running" | "completed" | "failed";

export type SarvamTranscribeInput = {
  audioUrl: string;
  leadName: string;
  associateName: string;
  /** BCP-47-ish language hint, e.g. "hi-IN", "ta-IN", "te-IN". Unset = Sarvam auto-detects. */
  languageCode?: string;
};

type SarvamInitResponse = {
  job_id: string;
  input_storage_path: string;
  output_storage_path?: string;
};

/** Step 1 of the async lifecycle: create the job, upload the audio, and start it. Returns the durable job id to persist immediately (R3/R4). */
export async function createAndStartSarvamJob(input: SarvamTranscribeInput): Promise<{ jobId: string }> {
  if (!hasSarvam) {
    return { jobId: `mock-sarvam-job-${Date.now()}` };
  }

  const initRes = await fetch(`${SARVAM_BASE_URL}/speech-to-text/job/v1`, {
    method: "POST",
    headers: {
      "api-subscription-key": env.sarvamApiKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job_parameters: {
        model: "saarika:v2.5",
        language_code: input.languageCode,
        with_diarization: true,
        with_timestamps: true,
        num_speakers: 2,
      },
    }),
  });
  if (!initRes.ok) {
    throw new Error(`Sarvam job init failed: ${initRes.status} ${await initRes.text()}`);
  }
  const init = (await initRes.json()) as SarvamInitResponse;

  const audioRes = await fetch(input.audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Failed to fetch audio for Sarvam upload: ${audioRes.status}`);
  }
  const audioBytes = new Uint8Array(await audioRes.arrayBuffer());

  // The init response hands back a (typically SAS-signed) storage container URL —
  // upload directly to it rather than to api.sarvam.ai itself.
  const uploadRes = await fetch(init.input_storage_path, {
    method: "PUT",
    headers: { "Content-Type": "audio/mpeg", "x-ms-blob-type": "BlockBlob" },
    body: audioBytes,
  });
  if (!uploadRes.ok) {
    throw new Error(`Sarvam audio upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const startRes = await fetch(`${SARVAM_BASE_URL}/speech-to-text/job/v1/${init.job_id}/start`, {
    method: "POST",
    headers: { "api-subscription-key": env.sarvamApiKey! },
  });
  if (!startRes.ok) {
    throw new Error(`Sarvam job start failed: ${startRes.status} ${await startRes.text()}`);
  }

  return { jobId: init.job_id };
}

/** Step 2, called on each poll tick: check the job's current status. */
export async function getSarvamJobStatus(jobId: string): Promise<SarvamJobStatus> {
  if (!hasSarvam || jobId.startsWith("mock-sarvam-job-")) {
    return "completed";
  }

  const res = await fetch(`${SARVAM_BASE_URL}/speech-to-text/job/v1/${jobId}/status`, {
    headers: { "api-subscription-key": env.sarvamApiKey! },
  });
  if (!res.ok) {
    throw new Error(`Sarvam status check failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { status: string };
  const status = data.status.toLowerCase();
  if (status === "completed" || status === "success") return "completed";
  if (status === "failed" || status === "error") return "failed";
  return "running";
}

type SarvamResultSegment = { speaker_id?: number; start_time_seconds: number; end_time_seconds: number; transcript: string };

/** Step 3: fetch + parse the finished job's transcript once status is terminal. */
export async function downloadSarvamResult(jobId: string, ctx: { leadName: string; associateName: string }): Promise<TranscriptLine[]> {
  if (!hasSarvam || jobId.startsWith("mock-sarvam-job-")) {
    return mockSarvamTranscript(ctx);
  }

  const res = await fetch(`${SARVAM_BASE_URL}/speech-to-text/job/v1/${jobId}/result`, {
    headers: { "api-subscription-key": env.sarvamApiKey! },
  });
  if (!res.ok) {
    throw new Error(`Sarvam result download failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { segments?: SarvamResultSegment[] };
  const segments = data.segments ?? [];

  // Same speaker-0-is-associate heuristic as Deepgram's transcribeAudio — a
  // human can correct it per-line from the Conversations tab either way.
  return segments.map((s, i) => ({
    speaker: i === 0 || (s.speaker_id ?? 0) === 0 ? "associate" : "lead",
    startSeconds: Math.round(s.start_time_seconds),
    endSeconds: Math.round(s.end_time_seconds),
    text: s.transcript,
  }));
}

function mockSarvamTranscript(ctx: { leadName: string; associateName: string }): TranscriptLine[] {
  const firstName = ctx.associateName.split(" ")[0];
  return [
    { speaker: "associate", startSeconds: 0, endSeconds: 10, text: `Hi ${ctx.leadName}, this is ${firstName} calling from Kalvium — do you have a few minutes?` },
    { speaker: "lead", startSeconds: 10, endSeconds: 16, text: "Yes, go ahead." },
    { speaker: "associate", startSeconds: 16, endSeconds: 45, text: "[mock Sarvam transcript — set SARVAM_API_KEY to transcribe an actual recording] Let me tell you about the program..." },
    { speaker: "lead", startSeconds: 45, endSeconds: 55, text: "[mock] That sounds interesting, tell me more about the fees." },
    { speaker: "associate", startSeconds: 55, endSeconds: 90, text: "[mock] Sure, here's how the fee structure works..." },
  ];
}
