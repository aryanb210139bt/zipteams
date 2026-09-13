import { hasGoogleTranslate, env } from "@/lib/env";
import type { TranscriptLine } from "@/lib/db/schema";

/**
 * Translates a diarized transcript to English with the Google Cloud
 * Translation API, run after transcription. Falls back to a passthrough
 * (assumes the source is already English) when GOOGLE_TRANSLATE_API_KEY is
 * unset, so the pipeline stays runnable without a Google Cloud account.
 */
export async function translateTranscript(lines: TranscriptLine[]): Promise<TranscriptLine[]> {
  if (!hasGoogleTranslate || lines.length === 0) return lines;

  const res = await fetch(`https://translation.googleapis.com/language/translate2?key=${env.googleTranslateApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: lines.map((l) => l.text), target: "en", format: "text" }),
  });
  if (!res.ok) {
    throw new Error(`Google Translate failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const translations: { translatedText: string }[] = data?.data?.translations ?? [];
  return lines.map((line, i) => ({ ...line, text: translations[i]?.translatedText ?? line.text }));
}
