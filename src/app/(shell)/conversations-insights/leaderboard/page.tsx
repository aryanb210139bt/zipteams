import { Download } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard, getFilterOptions } from "@/lib/db/queries";
import { parseCallFilters } from "@/lib/filters";
import { PageHeader } from "@/components/shared/page-header";
import { FiltersDrawer } from "@/components/filters/filters-drawer";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { Button } from "@/components/ui/button";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const filters = parseCallFilters(sp);

  const [rows, filterOptions] = await Promise.all([getLeaderboard(user.orgId, filters), getFilterOptions(user.orgId)]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Leaderboard"
        description="Sales person wise quality score"
        actions={<FiltersDrawer associates={filterOptions.associates} sources={filterOptions.sources} fieldSubset="full" />}
      />
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <button className="text-sm text-muted-foreground underline-offset-2 hover:underline">Reset</button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Download className="size-3.5" /> Export
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-card">
          <LeaderboardTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
