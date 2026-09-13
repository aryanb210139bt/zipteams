import type { TranscriptLine } from "@/lib/db/schema";

/**
 * Wraps a plain-text transcript (e.g. pasted into the CSV bulk-upload flow)
 * into the diarized TranscriptLine[] shape the rest of the app expects.
 * Alternates speaker per line as a rough heuristic — a human can correct
 * speaker labels from the Conversations tab transcript editor (PRD 9.3).
 */
export function plainTextToTranscript(text: string): TranscriptLine[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  return lines.map((line, i) => ({
    speaker: i % 2 === 0 ? "associate" : "lead",
    startSeconds: i * 10,
    endSeconds: i * 10 + 9,
    text: line,
  }));
}
