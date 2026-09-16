/**
 * BANT (Budget / Authority / Needs / Timeline) is a fixed sales-methodology
 * concept, not an org-configurable data-capture field — but it's persisted
 * through the same generic `data_capture_fields`/`data_capture_values`
 * mechanism as the org's custom extraction fields (see seed.ts, which seeds
 * these 4 keys for every org). Shared here so the AI-evaluation pipeline
 * (which writes BANT values) and the UI (which reads them back out) can't
 * drift apart on the key list.
 */
export const BANT_KEYS: string[] = ["budget", "authority", "needs", "timeline"];
