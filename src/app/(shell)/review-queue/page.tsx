import { getCurrentUser, canReviewCalls } from "@/lib/auth";
import { getReviewQueue } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewQueueTable } from "@/components/review-queue/review-queue-table";
import { Card } from "@/components/ui/card";

export default async function ReviewQueuePage() {
  const user = await getCurrentUser();
  const rows = await getReviewQueue(user.orgId);
  const needsReview = rows.filter((r) => r.verdict.riskLevel === "needs_review").length;
  const highRisk = rows.filter((r) => r.verdict.riskLevel === "high_fabrication_risk").length;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Flagged for Review"
        description="Calls the authenticity pass couldn't confidently clear — sign off once a human has listened in."
      />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="gap-1 p-4">
            <span className="text-2xl font-semibold tabular-nums">{rows.length}</span>
            <span className="text-xs text-muted-foreground">Total flagged</span>
          </Card>
          <Card className="gap-1 p-4">
            <span className="text-2xl font-semibold tabular-nums text-status-moderate">{needsReview}</span>
            <span className="text-xs text-muted-foreground">Needs review</span>
          </Card>
          <Card className="gap-1 p-4">
            <span className="text-2xl font-semibold tabular-nums text-status-negative">{highRisk}</span>
            <span className="text-xs text-muted-foreground">High fabrication risk</span>
          </Card>
        </div>
        {!canReviewCalls(user) && (
          <p className="text-sm text-muted-foreground">
            You have view access to the queue; only QA reviewers and admins can sign off a call.
          </p>
        )}
        <div className="rounded-xl border border-border bg-card">
          <ReviewQueueTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
