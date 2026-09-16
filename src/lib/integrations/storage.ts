import { spawn, spawnSync } from "node:child_process";

import { env, hasSupabaseStorage } from "@/lib/env";

/**
 * Audio file storage (R2). Only a signed URL is ever persisted in Postgres
 * (`conversations.audioUrl`) — the raw file always lives in Supabase Storage.
 *
 * `rehostRecording` is the one entry point the pipeline calls: fetch a
 * (possibly short-lived, e.g. LeadSquared-issued) recording URL, normalize it
 * for STT, upload it to our own bucket, and hand back a signed URL to use for
 * the rest of the pipeline. Falls back to skipping normalization (with a
 * warning) when `ffmpeg` isn't on PATH, and throws if Supabase Storage isn't
 * configured — callers should check `hasSupabaseStorage` first and skip the
 * rehost step entirely rather than calling this without credentials.
 */
export function isSupportedAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** Bucket key a recording is rehosted under — deterministic so cleanup can recompute it without a dedicated storage-path column. */
export function recordingObjectPath(orgId: string, conversationId: string): string {
  return `recordings/${orgId}/${conversationId}.mp3`;
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days — generous given jobs can span a Sarvam poll loop across redeploys; see note in sarvam-transcribe.ts about re-signing if this ever proves too short.

export async function rehostRecording(input: { orgId: string; conversationId: string; sourceUrl: string }): Promise<{ url: string; path: string }> {
  if (!hasSupabaseStorage) {
    throw new Error("rehostRecording called without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configured — check hasSupabaseStorage before calling this");
  }

  const sourceRes = await fetch(input.sourceUrl);
  if (!sourceRes.ok) {
    throw new Error(`Failed to fetch recording from ${input.sourceUrl}: ${sourceRes.status}`);
  }
  const original = Buffer.from(await sourceRes.arrayBuffer());
  const normalized = await normalizeAudioForStt(original);

  const path = recordingObjectPath(input.orgId, input.conversationId);
  await uploadToBucket(path, normalized);
  const url = await createSignedUrl(path);
  return { url, path };
}

/** Deletes the rehosted object for a conversation, once it's eligible (scored/failed, past retries) — see storage-cleanup.ts. No-ops quietly if storage isn't configured or the object is already gone. */
export async function deleteRehostedRecording(orgId: string, conversationId: string): Promise<void> {
  if (!hasSupabaseStorage) return;
  const path = recordingObjectPath(orgId, conversationId);
  const res = await fetch(`${env.supabaseUrl}/storage/v1/object/${env.storageBucket}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.supabaseServiceRoleKey}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Supabase Storage delete failed: ${res.status} ${await res.text()}`);
  }
}

async function uploadToBucket(path: string, body: Buffer): Promise<void> {
  const res = await fetch(`${env.supabaseUrl}/storage/v1/object/${env.storageBucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      "Content-Type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    throw new Error(`Supabase Storage upload failed: ${res.status} ${await res.text()}`);
  }
}

async function createSignedUrl(path: string): Promise<string> {
  const res = await fetch(`${env.supabaseUrl}/storage/v1/object/sign/${env.storageBucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_EXPIRY_SECONDS }),
  });
  if (!res.ok) {
    throw new Error(`Supabase Storage sign failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { signedURL: string };
  return `${env.supabaseUrl}/storage/v1${data.signedURL}`;
}

/**
 * Normalizes to mono/16kHz mp3 (matching kalvium-audit-engine's
 * `_ffmpeg_extract_mp3` flags) via a spawned `ffmpeg` process.
 *
 * Deployment note (PRD R2, flagged rather than assumed): this repo has no
 * Dockerfile, so the chosen path is a Render buildpack apt package
 * (`ffmpeg`) rather than an npm dependency like `ffmpeg-static` — smaller
 * install, no binary bundled into the deploy artifact. If ffmpeg isn't on
 * PATH (e.g. it hasn't been added to the Render build yet), this logs a
 * warning and uploads the original bytes unnormalized rather than failing
 * the whole pipeline — Deepgram/Sarvam both still work, just possibly less
 * reliably, so a broken deploy config never silently drops calls.
 */
async function normalizeAudioForStt(input: Buffer): Promise<Buffer> {
  if (!hasFfmpeg()) {
    console.warn("[storage] ffmpeg not found on PATH — uploading recording without mono/16kHz normalization. Add the `ffmpeg` apt package to the Render build (see SETUP.md).");
    return input;
  }
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-i", "pipe:0", "-ac", "1", "-ar", "16000", "-f", "mp3", "pipe:1"]);
    const chunks: Buffer[] = [];
    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", () => {}); // ffmpeg logs progress to stderr even on success; nothing worth surfacing here
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited with code ${code}`))));
    ff.stdin.write(input);
    ff.stdin.end();
  });
}

function hasFfmpeg(): boolean {
  try {
    return spawnSync("ffmpeg", ["-version"]).status === 0;
  } catch {
    return false;
  }
}
