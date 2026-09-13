import { hasDeepgram, env } from "@/lib/env";
import type { TranscriptLine } from "@/lib/db/schema";

export type TranscribeInput = {
  audioUrl: string | null;
  leadName: string;
  associateName: string;
  /** Org glossary — fed to Deepgram as boosted keywords (brand names, exam codes, locations). */
  glossaryTerms: { term: string; commonMistranscriptions: string[] }[];
};

/**
 * Transcribes + diarizes a call recording with Deepgram (nova-2, two speakers).
 * Falls back to a deterministic mock transcript when DEEPGRAM_API_KEY is
 * unset or no audio URL was supplied (e.g. a CSV row with an inline
 * transcript instead of audio) — the pipeline stays runnable either way.
 */
export async function transcribeAudio(input: TranscribeInput): Promise<TranscriptLine[]> {
  if (hasDeepgram && input.audioUrl) {
    const keywords = input.glossaryTerms.map((g) => `${g.term}:2`).join("&keywords=");
    const url = `https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&utterances=true${keywords ? `&keywords=${keywords}` : ""}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${env.deepgramApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: input.audioUrl }),
    });
    if (!res.ok) {
      throw new Error(`Deepgram transcription failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const utterances = data?.results?.utterances ?? [];
    return utterances.map((u: { speaker: number; start: number; end: number; transcript: string }, i: number) => ({
      // Deepgram numbers speakers by first-to-talk; we heuristically treat
      // speaker 0 as the associate (they open the call) — a human can
      // correct this per-line from the Conversations tab transcript editor.
      speaker: i === 0 || u.speaker === 0 ? "associate" : "lead",
      startSeconds: Math.round(u.start),
      endSeconds: Math.round(u.end),
      text: u.transcript,
    }));
  }

  return applyGlossaryCorrections(mockTranscript(input), input.glossaryTerms);
}

function mockTranscript(input: TranscribeInput): TranscriptLine[] {
  const firstName = input.associateName.split(" ")[0];
  return [
    { speaker: "associate", startSeconds: 0, endSeconds: 10, text: `Hi ${input.leadName}, this is ${firstName} calling from Kalvium — do you have a few minutes?` },
    { speaker: "lead", startSeconds: 10, endSeconds: 16, text: "Yes, go ahead." },
    { speaker: "associate", startSeconds: 16, endSeconds: 45, text: "[mock transcript — set DEEPGRAM_API_KEY and provide a real audio_url to transcribe an actual recording] Let me tell you about the program..." },
    { speaker: "lead", startSeconds: 45, endSeconds: 55, text: "[mock] That sounds interesting, tell me more about the fees." },
    { speaker: "associate", startSeconds: 55, endSeconds: 90, text: "[mock] Sure, here's how the fee structure works..." },
  ];
}

/** Post-transcription auto-correct pass using the org's glossary_terms table. */
export function applyGlossaryCorrections(
  lines: TranscriptLine[],
  glossaryTerms: { term: string; commonMistranscriptions: string[] }[]
): TranscriptLine[] {
  if (!glossaryTerms.length) return lines;
  return lines.map((line) => {
    let text = line.text;
    for (const g of glossaryTerms) {
      for (const mistake of g.commonMistranscriptions) {
        const re = new RegExp(`\\b${mistake.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        text = text.replace(re, g.term);
      }
    }
    return { ...line, text };
  });
}
