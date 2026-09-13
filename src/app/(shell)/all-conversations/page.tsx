import { Menu } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getDashboardData, getLeadsTable, getFilterOptions } from "@/lib/db/queries";
import { parseCallFilters, parsePage } from "@/lib/filters";
import { formatDuration, formatPercent } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { FiltersBar } from "@/components/filters/filters-bar";
import { UniqueConnectedLeads } from "@/components/dashboard/unique-connected-leads";
import { LeadsTable } from "@/components/leads/leads-table";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";

export default async function AllConversationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="All Conversations"
        actions={
          <Card className="flex-row items-center gap-4 p-2.5">
            <span className="text-sm font-medium">{data.totalCalls.value} Conversations</span>
            <span className="rounded-full bg-status-positive-bg px-2 py-0.5 text-xs font-medium text-status-positive">
              {formatDuration(data.statCards.totalDuration.value)}
            </span>
            <span className="text-xs text-muted-foreground">Detailed {formatPercent((data.statCards.detailedCallsOver2Min.value / (data.totalCalls.value || 1)) * 100)}</span>
            <span className="text-xs text-muted-foreground">Talk:Listen {formatPercent(data.statCards.talkToListenRatio.value * 100)}</span>
            <span className="text-xs text-muted-foreground">Quality {formatPercent(data.statCards.callQualityScore.value)}</span>
          </Card>
        }
      />
      <FiltersBar associates={filterOptions.associates} sources={filterOptions.sources} />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <UniqueConnectedLeads data={data} />
        <div className="rounded-xl border border-border bg-card">
          <LeadsTable rows={leadsTable.rows} />
          <Pagination page={leadsTable.page} pageSize={leadsTable.pageSize} total={leadsTable.total} />
        </div>
      </div>

      <button
        className="fixed bottom-6 right-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="More actions"
        title="Function unconfirmed against the live product (PRD §8) — placeholder."
      >
        <Menu className="size-5" />
      </button>
    </div>
  );
}
