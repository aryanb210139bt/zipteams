import { notFound } from "next/navigation";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail, getConversationDetail } from "@/lib/db/queries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BANT_KEYS = ["budget", "authority", "needs", "timeline"];

export default async function LeadInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getLeadDetail(id);
  if (!detail || detail.lead.orgId !== user.orgId) notFound();

  const latestCall = detail.latestScoredCallId ? await getConversationDetail(detail.latestScoredCallId) : null;
  const passes = latestCall?.scores.filter((s) => s.score.verdict === "pass") ?? [];
  const fails = latestCall?.scores.filter((s) => s.score.verdict === "fail") ?? [];
  const bant = detail.dataCapture.filter((d) => BANT_KEYS.includes(d.field.key));
  const customCapture = detail.dataCapture.filter((d) => !BANT_KEYS.includes(d.field.key));

  const openTasks = detail.tasks.filter((task) => task.status === "open");

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_320px] md:p-6">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buying Intent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Badge variant="positive" className="w-fit text-sm">
              {detail.lead.leadStage === "converted" ? "Converted" : latestCall?.conversation.intent ?? "Not scored yet"}{" "}
              {detail.lead.intentScore != null && `${detail.lead.intentScore}/100`}
            </Badge>
            {passes.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">High Intent factors</span>
                {passes.slice(0, 4).map((p) => (
                  <span key={p.parameter.id} className="flex items-start gap-1.5 text-sm">
                    <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-status-positive" /> {p.parameter.text}
                  </span>
                ))}
              </div>
            )}
            {fails.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Low Intent factors</span>
                {fails.slice(0, 4).map((f) => (
                  <span key={f.parameter.id} className="flex items-start gap-1.5 text-sm">
                    <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-status-negative" /> Not observed: {f.parameter.text}
                  </span>
                ))}
              </div>
            )}
            {!latestCall && <p className="text-sm text-muted-foreground">No scored calls yet for this lead.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objections</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {detail.objections.length === 0 && <p className="text-sm text-muted-foreground">No objections captured on the latest call.</p>}
            {detail.objections.map(({ objection, concern }) => (
              <div key={objection.id} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <Badge variant="outline" className="w-fit">
                  {concern.name}
                </Badge>
                <p className="text-sm">{objection.statement}</p>
                <p className="text-xs text-muted-foreground">
                  <strong>How this objection was handled?</strong> {objection.handling}
                </p>
                <p className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className={`size-3.5 ${objection.customerSatisfied ? "text-status-positive" : "text-status-moderate"}`} />
                  Was the customer satisfied? {objection.customerSatisfied ? "Yes" : "Not fully"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">BANT</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bant.length === 0 && <p className="text-sm text-muted-foreground">No BANT data captured yet.</p>}
            {bant.map(({ value, field }) => (
              <div key={field.id} className="rounded-lg border border-border p-3">
                <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                <p className="text-sm">{value.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Capture</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customCapture.length === 0 && <p className="text-sm text-muted-foreground">No custom fields captured yet.</p>}
            {customCapture.map(({ value, field }) => (
              <div key={field.id} className="rounded-lg border border-border p-3">
                <Badge variant="outline" className="mb-1">
                  {field.label}
                </Badge>
                <p className="text-sm">{value.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="md:sticky md:top-4 md:h-fit">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Path to Conversion</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Previous Conversation Summary</span>
              <p className="mt-1 text-sm">{latestCall?.verdict?.summary ?? "No summary yet — upload or score a call for this lead."}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">What to do next?</span>
              <div className="mt-2 flex flex-col gap-3">
                {openTasks.length === 0 && <p className="text-sm text-muted-foreground">No open next steps.</p>}
                {openTasks.map((task, i) => (
                  <div key={task.id} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                    <span className="text-sm font-semibold">
                      {i + 1}. {task.title}
                    </span>
                    {task.sayScript && <p className="text-xs italic text-muted-foreground">&ldquo;Say: {task.sayScript}&rdquo;</p>}
                    {task.rationale && (
                      <p className="flex items-start gap-1 text-xs text-status-positive">
                        <CheckCircle2 className="mt-0.5 size-3 shrink-0" /> {task.rationale}
                      </p>
                    )}
                    {task.dueDate && <span className="text-xs text-muted-foreground">Due by: {new Date(task.dueDate).toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
