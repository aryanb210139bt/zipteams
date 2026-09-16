import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { syncLeadsquaredOrg } from "@/lib/pipeline/leadsquared-sync";

/**
 * R1 — scheduled discovery of new LeadSquared call activities, per org with
 * `leadsquaredConfig.enabled`. Each org's sync runs as its own `step.run` so
 * one org's failure (bad credentials, a LeadSquared outage) doesn't block or
 * retry the others — Inngest's `retries: 3` still applies per-org via the
 * step's own retry, not the whole function's.
 */
export const leadsquaredSync = inngest.createFunction({ id: "leadsquared-sync", retries: 3 }, { cron: "*/15 * * * *" }, async ({ step }) => {
  const orgs = await step.run("load-enabled-orgs", async () => {
    const all = await db.select().from(t.organizations);
    return all.filter((org) => org.leadsquaredConfig?.enabled);
  });

  const results = [];
  for (const org of orgs) {
    const result = await step.run(`sync-org-${org.id}`, () => syncLeadsquaredOrg(org));
    results.push({ orgId: org.id, ...result });
  }
  return { orgsSynced: results.length, results };
});
