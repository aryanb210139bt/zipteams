/**
 * Audio file storage. Only a signed URL is ever persisted in Postgres
 * (`conversations.audioUrl`) — the raw file always stays in Supabase
 * Storage / an S3-compatible bucket.
 *
 * TODO: wire the Supabase Storage SDK (or an S3 client) here once
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set. Until then, the upload
 * form accepts an already-hosted audio URL directly (or no audio at all —
 * see the CSV bulk-upload flow, which can carry an inline transcript
 * instead) so the rest of the pipeline is exercisable without a bucket.
 */
export function isSupportedAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
