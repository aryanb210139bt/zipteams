import { Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getFilterOptions } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { FiltersDrawer } from "@/components/filters/filters-drawer";
import { Card } from "@/components/ui/card";

/**
 * Every screenshot of this tab in the source product showed an empty/error
 * state (PRD §6) — the populated "weekly AI insight digest" view was never
 * captured, so this ships as the confirmed empty state rather than a guess
 * at unseen content.
 */
export default async function InsightsPage() {
  const user = await getCurrentUser();
  const filterOptions = await getFilterOptions(user.orgId);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader title="Insights" actions={<FiltersDrawer associates={filterOptions.associates} sources={filterOptions.sources} fieldSubset="insights" />} />
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[240px_1fr] md:p-6">
        <Card className="gap-2 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-teal" />
            <span className="text-sm font-semibold">Weekly Insights</span>
          </div>
          <p className="text-sm text-muted-foreground">No weekly insights available for the selected filters.</p>
        </Card>
        <Card className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-base font-semibold">Select a date range to view insights</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Oops! Insights are not available for this period. Please try a different date range.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
