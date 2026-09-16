import { env } from "@/lib/env";
import type { LeadsquaredConfig } from "@/lib/integrations/leadsquared";

/**
 * Inbound direction (R1) — the counterpart to `pushCallScoreToLeadsquared` in
 * leadsquared.ts, which only pushes outbound. Fetches call-type activities
 * modified since a watermark, via LeadSquared's
 * `POST /v2/ProspectActivity.svc/CustomActivity/RetrieveByActivityEvent`
 * (filters by `ActivityEvent` + `FromDate`/`ToDate`, paginated ~25/call).
 *
 * The ActivityEvent code and the recording-url/lead-name field SchemaNames are
 * Phase 0 outputs (.github/workflows/leadsquared-discovery.yml, run once
 * against the real account) — see env.ts. Until
 * `LEADSQUARED_PHONE_CALL_ACTIVITY_EVENT` is set, `fetchNewCallActivities`
 * returns an empty list rather than guessing, same "unset -> safe no-op"
 * convention as every other integration.
 */

export type LeadsquaredCallActivity = {
  activityId: string;
  prospectId: string;
  modifiedOn: string;
  activityDate: string;
  recordingUrl: string | null;
  durationSeconds: number;
  leadName: string | null;
};

type ActivityField = { SchemaName: string; Value: string };
type RawActivity = {
  Id?: string;
  ActivityId?: string;
  RelatedProspectId: string;
  ModifiedOn: string;
  ActivityDateTime?: string;
  ActivityEvent: number;
  Fields?: ActivityField[];
};

export async function fetchNewCallActivities(config: LeadsquaredConfig, since: Date): Promise<LeadsquaredCallActivity[]> {
  const accessKey = config?.accessKey ?? env.leadsquaredAccessKey;
  const secretKey = config?.secretKey ?? env.leadsquaredSecretKey;
  const host = config?.hostUrl ?? env.leadsquaredHost;
  const activityEvent = env.leadsquaredPhoneCallActivityEvent;

  if (!config?.enabled || !accessKey || !secretKey) {
    return [];
  }
  if (!activityEvent) {
    console.warn(
      "[leadsquared-sync] LEADSQUARED_PHONE_CALL_ACTIVITY_EVENT is not set — run .github/workflows/leadsquared-discovery.yml against the real account first (PRD Phase 0). Skipping this org's sync until it's configured."
    );
    return [];
  }

  const url = `${host}/v2/ProspectActivity.svc/CustomActivity/RetrieveByActivityEvent?accessKey=${accessKey}&secretKey=${secretKey}`;
  const activities: RawActivity[] = [];
  let pageIndex = 1;
  const pageSize = 25;

  // Paginate until a short page tells us we've reached the end — LeadSquared
  // returns up to `pageSize` activities per call.
  for (;;) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ActivityEvent: Number(activityEvent),
        FromDate: since.toISOString(),
        ToDate: new Date().toISOString(),
        Parameter: { PageIndex: pageIndex, PageSize: pageSize },
      }),
    });
    if (!res.ok) {
      throw new Error(`LeadSquared activity fetch failed: ${res.status} ${await res.text()}`);
    }
    const page = (await res.json()) as RawActivity[];
    activities.push(...page);
    if (page.length < pageSize) break;
    pageIndex++;
  }

  return activities.map(parseCallActivity);
}

function findField(fields: ActivityField[] | undefined, schemaName: string): string | null {
  return fields?.find((f) => f.SchemaName === schemaName)?.Value ?? null;
}

function parseCallActivity(raw: RawActivity): LeadsquaredCallActivity {
  const recordingUrl = findField(raw.Fields, env.leadsquaredRecordingUrlField);
  const leadName = findField(raw.Fields, env.leadsquaredLeadNameField);
  const durationRaw = findField(raw.Fields, env.leadsquaredCallDurationField);

  return {
    activityId: raw.Id ?? raw.ActivityId ?? `${raw.RelatedProspectId}-${raw.ModifiedOn}`,
    prospectId: raw.RelatedProspectId,
    modifiedOn: raw.ModifiedOn,
    activityDate: raw.ActivityDateTime ?? raw.ModifiedOn,
    recordingUrl: recordingUrl && recordingUrl.length ? recordingUrl : null,
    durationSeconds: durationRaw ? Number(durationRaw) || 0 : 0,
    leadName,
  };
}
