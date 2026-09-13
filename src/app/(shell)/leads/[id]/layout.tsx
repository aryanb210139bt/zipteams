import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail, getFilterOptions } from "@/lib/db/queries";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { initialOf, formatDuration, formatPercent } from "@/lib/utils";
import { LeadTabs } from "./lead-tabs";
import { LeadControls } from "@/components/lead-detail/lead-controls";

export default async function LeadDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [detail, filterOptions] = await Promise.all([getLeadDetail(id), getFilterOptions(user.orgId)]);
  if (!detail || detail.lead.orgId !== user.orgId) notFound();

  const { lead, owner, stats } = detail;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-border px-4 py-4 md:px-6">
        <span className="text-xs text-muted-foreground">Conversations &gt; Lead Details</span>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-lg">{initialOf(lead.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{lead.name}</h1>
              <p className="text-sm text-muted-foreground">{lead.email ?? "No email on file"}</p>
              <p className="text-xs text-muted-foreground">Owner name: {owner?.name ?? "Unassigned"}</p>
            </div>
          </div>
          <LeadControls leadId={lead.id} status={lead.leadStage} assigneeId={lead.assigneeId} associates={filterOptions.associates} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Total Conversation Duration" value={formatDuration(stats.totalDurationSeconds)} />
          <StatBlock label="Talk-to-Listen Ratio" value={formatPercent(stats.avgTalkToListen * 100)} tooltip="Share of the call the associate spent talking vs. the lead." />
          <StatBlock label="Intent Score (/100)" value={String(lead.intentScore ?? "—")} />
          <StatBlock label="Avg. Call Quality Score" value={formatPercent(stats.avgQualityScore)} />
        </div>
      </div>
      <LeadTabs leadId={lead.id} />
      {children}
    </div>
  );
}

function StatBlock({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger className="cursor-help">ⓘ</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
