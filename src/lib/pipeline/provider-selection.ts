import type { conversations } from "@/lib/db/schema";

export type SttProvider = "deepgram" | "sarvam";

/**
 * R5 — least-code provider selection for a first pass: calls sourced from the
 * LeadSquared sync go through Sarvam (needed for reliable Tamil/Telugu/Hindi
 * transcription), everything else (manual upload, CSV bulk upload) keeps using
 * Deepgram. Revisit once real usage data shows which languages actually need
 * Sarvam per PRD § R5 — this is a routing rule, not a per-org setting.
 */
export function getSttProvider(source: (typeof conversations.$inferSelect)["source"]): SttProvider {
  return source === "crm_recordings" ? "sarvam" : "deepgram";
}
