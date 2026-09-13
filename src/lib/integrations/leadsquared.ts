import { env } from "@/lib/env";

export type LeadsquaredConfig = { accessKey?: string; secretKey?: string; hostUrl?: string; enabled: boolean } | null;

export type PushCallScoreInput = {
  config: LeadsquaredConfig;
  leadsquaredLeadId?: string | null;
  callId: string;
  overallScore: number;
  riskLevel: "likely_genuine" | "needs_review" | "high_fabrication_risk";
  summary: string;
};

/**
 * Pushes the finished score back to the associated Leadsquared lead record as
 * an Activity, per org config (Setup > Leadsquared). No-ops with a console
 * log when the org hasn't connected Leadsquared or the lead has no
 * `crmRecordUrl`/external id — the pipeline still completes.
 */
export async function pushCallScoreToLeadsquared(input: PushCallScoreInput): Promise<{ pushed: boolean; reason?: string }> {
  const cfg = input.config;
  const accessKey = cfg?.accessKey ?? env.leadsquaredAccessKey;
  const secretKey = cfg?.secretKey ?? env.leadsquaredSecretKey;
  const host = cfg?.hostUrl ?? env.leadsquaredHost;

  if (!cfg?.enabled || !accessKey || !secretKey || !input.leadsquaredLeadId) {
    console.log(
      `[leadsquared:mock] would push call ${input.callId} → lead ${input.leadsquaredLeadId ?? "(none)"} — score=${input.overallScore} risk=${input.riskLevel}`
    );
    return { pushed: false, reason: "Leadsquared not connected for this org, or lead has no CRM record id" };
  }

  const url = `${host}/v2/ProspectActivity.svc/Create?accessKey=${accessKey}&secretKey=${secretKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      RelatedProspectId: input.leadsquaredLeadId,
      ActivityEvent: 1000, // custom activity type, configured on the Leadsquared side
      ActivityNote: input.summary,
      Fields: [
        { SchemaName: "mx_Custom_1", Value: String(input.overallScore) },
        { SchemaName: "mx_Custom_2", Value: input.riskLevel },
        { SchemaName: "mx_Custom_3", Value: input.callId },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Leadsquared push failed: ${res.status} ${await res.text()}`);
  }
  return { pushed: true };
}
