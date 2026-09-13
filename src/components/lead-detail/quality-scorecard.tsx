"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canReviewCalls, type CurrentUser } from "@/lib/roles";
import type { getConversationDetail } from "@/lib/db/queries";

type Scores = Awaited<ReturnType<typeof getConversationDetail>>;

const VERDICT_LABEL: Record<string, string> = { pass: "Done", partial: "Partially Done", fail: "Needs Improvement", na: "Not Applicable" };
const VERDICT_VARIANT: Record<string, "positive" | "moderate" | "negative" | "neutral"> = { pass: "positive", partial: "moderate", fail: "negative", na: "neutral" };
const MARK_OPTIONS = ["pass", "partial", "fail", "na"] as const;

export function QualityScorecard({ callId, data, user }: { callId: string; data: NonNullable<Scores>; user: CurrentUser }) {
  const router = useRouter();
  const canOverride = canReviewCalls(user);

  async function mark(parameterId: string, verdict: (typeof MARK_OPTIONS)[number]) {
    const res = await fetch(`/api/calls/${callId}/scores`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parameterId, verdict }),
    });
    if (!res.ok) return toast.error("Could not update this score.");
    toast.success("Score updated.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Overall Call Quality Score: {data.verdict?.overallScore ?? 0}%
        </h3>
        <Badge variant={data.verdict?.riskLevel === "likely_genuine" ? "positive" : data.verdict?.riskLevel === "needs_review" ? "moderate" : "negative"}>
          {data.verdict?.riskLevel?.replace(/_/g, " ") ?? "unscored"}
        </Badge>
      </div>
      {data.verdict?.fabricationRationale && <p className="text-sm text-muted-foreground">{data.verdict.fabricationRationale}</p>}

      <div className="flex flex-col gap-3">
        {data.scores.map(({ score, parameter, category }) => (
          <div key={score.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs text-muted-foreground">{category.name}</span>
                <p className="text-sm font-medium">{parameter.text}</p>
              </div>
              <Badge variant={VERDICT_VARIANT[score.verdict]}>{VERDICT_LABEL[score.verdict]}</Badge>
            </div>
            {score.aiRationale && <p className="text-xs text-muted-foreground">{score.aiRationale}</p>}
            {score.supportingQuote && <p className="rounded-md bg-muted px-2 py-1 text-xs italic">&ldquo;{score.supportingQuote}&rdquo;</p>}
            {canOverride && (
              <div className="flex flex-wrap gap-1.5">
                {MARK_OPTIONS.filter((opt) => opt !== "partial" || parameter.supportsPartialCredit).map((opt) => (
                  <Button key={opt} size="sm" variant={score.verdict === opt ? "default" : "outline"} onClick={() => mark(parameter.id, opt)}>
                    {VERDICT_LABEL[opt]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
