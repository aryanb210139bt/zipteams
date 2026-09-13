import { TrendingUp, TrendingDown, Meh, ThumbsDown, HelpCircle, CircleSlash } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeltaBadge } from "@/components/shared/delta-badge";
import type { getDashboardData } from "@/lib/db/queries";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const INTENT_CARDS: { key: keyof DashboardData["intentCards"]; label: string; icon: typeof TrendingUp; color: string }[] = [
  { key: "high", label: "High Intent", icon: TrendingUp, color: "text-status-positive" },
  { key: "moderate", label: "Moderate Intent", icon: TrendingUp, color: "text-status-moderate" },
  { key: "neutral", label: "Neutral Intent", icon: Meh, color: "text-status-neutral" },
  { key: "low", label: "Low Intent", icon: TrendingDown, color: "text-status-negative" },
  { key: "notQualified", label: "Not Qualified", icon: ThumbsDown, color: "text-status-negative" },
  { key: "notAvailable", label: "Not Available", icon: CircleSlash, color: "text-status-neutral" },
];

export function UniqueConnectedLeads({ data }: { data: DashboardData }) {
  const { uniqueConnectedLeads, intentCards } = data;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-base font-semibold">Unique Connected Leads {uniqueConnectedLeads.total.value}</h2>
        <BreakdownStat label="Won" stat={uniqueConnectedLeads.won} />
        <BreakdownStat label="Lost" stat={uniqueConnectedLeads.lost} />
        <BreakdownStat label="In Progress" stat={uniqueConnectedLeads.inProgress} />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium">
              Forecasted Sales: {uniqueConnectedLeads.forecastedSales}
              <HelpCircle className="size-3 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Forecasted sales = In-Progress lead count × current filtered conversion rate.</TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {INTENT_CARDS.map(({ key, label, icon: Icon, color }) => {
          const stat = intentCards[key];
          return (
            <Card key={key} className="gap-1.5 p-3">
              <div className="flex items-center justify-between">
                <Icon className={`size-4 ${color}`} />
                <DeltaBadge pct={stat.deltaPct} direction={stat.direction} />
              </div>
              <div className="text-lg font-semibold tabular-nums">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownStat({ label, stat }: { label: string; stat: DashboardData["uniqueConnectedLeads"]["won"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{stat.value}</span>
      <DeltaBadge pct={stat.deltaPct} direction={stat.direction} />
    </span>
  );
}
