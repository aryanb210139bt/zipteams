import { Clock, Timer, Scale, ListChecks, Gauge, Repeat } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getDashboardData, getLeadsTable, getFilterOptions } from "@/lib/db/queries";
import { parseCallFilters, parsePage } from "@/lib/filters";
import { formatDuration, formatPercent } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FiltersDrawer } from "@/components/filters/filters-drawer";
import { UniqueConnectedLeads } from "@/components/dashboard/unique-connected-leads";
import { QualityScorePanel } from "@/components/dashboard/quality-score-panel";
import { KeyLeadConcernsPanel } from "@/components/dashboard/key-lead-concerns-panel";
import { LeadsTable } from "@/components/leads/leads-table";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const filters = parseCallFilters(sp);
  const page = parsePage(sp);

  const [data, leadsTable, filterOptions] = await Promise.all([
    getDashboardData(user.orgId, filters),
    getLeadsTable(user.orgId, filters, page, 10),
    getFilterOptions(user.orgId),
  ]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title={`Total Calls ${data.totalCalls.value}`}
        description={`% Change is calculated against the previous period of the same length (${data.range.from.toLocaleDateString()} – ${data.range.to.toLocaleDateString()}).`}
        actions={<FiltersDrawer associates={filterOptions.associates} sources={filterOptions.sources} fieldSubset="full" />}
      />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Clock} label="Total Call Duration" value={formatDuration(data.statCards.totalDuration.value)} deltaPct={data.statCards.totalDuration.deltaPct} direction={data.statCards.totalDuration.direction} />
          <StatCard icon={Timer} label="Avg. Call Duration" value={formatDuration(data.statCards.avgDuration.value)} deltaPct={data.statCards.avgDuration.deltaPct} direction={data.statCards.avgDuration.direction} />
          <StatCard icon={Scale} label="Talk-to-listen Ratio" value={formatPercent(data.statCards.talkToListenRatio.value * 100)} deltaPct={data.statCards.talkToListenRatio.deltaPct} direction={data.statCards.talkToListenRatio.direction} />
          <StatCard icon={ListChecks} label="Detailed Calls > 2 mins" value={String(data.statCards.detailedCallsOver2Min.value)} deltaPct={data.statCards.detailedCallsOver2Min.deltaPct} direction={data.statCards.detailedCallsOver2Min.direction} />
          <StatCard icon={Gauge} label="Call Quality Score" value={formatPercent(data.statCards.callQualityScore.value)} deltaPct={data.statCards.callQualityScore.deltaPct} direction={data.statCards.callQualityScore.direction} />
          <StatCard icon={Repeat} label="Connected Calls per Lead" value={data.statCards.connectedCallsPerLead.value.toFixed(1)} deltaPct={data.statCards.connectedCallsPerLead.deltaPct} direction={data.statCards.connectedCallsPerLead.direction} />
        </div>

        <UniqueConnectedLeads data={data} />

        <div className="flex flex-col gap-4 lg:flex-row">
          <QualityScorePanel categoryBars={data.categoryBars} />
          <KeyLeadConcernsPanel concerns={data.concerns} />
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Download className="size-3.5" /> Call Quality Scores
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Download className="size-3.5" /> Intent Insights Report
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Download className="size-3.5" /> Objection Handling Report
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">{leadsTable.total} Selected</span>
          </div>
          <LeadsTable rows={leadsTable.rows} />
          <Pagination page={leadsTable.page} pageSize={leadsTable.pageSize} total={leadsTable.total} />
        </div>
      </div>
    </div>
  );
}
