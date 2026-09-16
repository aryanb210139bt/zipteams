import Link from "next/link";
import { notFound } from "next/navigation";
import { Share2, Trash2 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail, getConversationDetail } from "@/lib/db/queries";
import { cn, formatDuration } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TranscriptView } from "@/components/lead-detail/transcript-view";
import { QualityScorecard } from "@/components/lead-detail/quality-scorecard";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Uploaded",
  transcribing: "Transcribing",
  translating: "Translating",
  scoring: "Scoring",
  scored: "Scored",
  failed: "Failed",
};

export default async function LeadConversationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ call?: string }> }) {
  const { id } = await params;
  const { call } = await searchParams;
  const user = await getCurrentUser();
  const detail = await getLeadDetail(id);
  if (!detail || detail.lead.orgId !== user.orgId) notFound();

  const selectedId = call ?? detail.conversations[0]?.conversation.id;
  const selected = selectedId ? await getConversationDetail(selectedId) : null;

  return (
    <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr_360px]">
      {/* Panel 1: conversation list */}
      <div className="flex flex-col overflow-y-auto border-r border-border">
        <div className="border-b border-border p-3">
          <span className="text-sm font-semibold">{detail.conversations.length} conversation(s)</span>
        </div>
        <div className="flex flex-col">
          {detail.conversations.map(({ conversation, verdict }) => (
            <Link
              key={conversation.id}
              href={`/leads/${id}/conversations?call=${conversation.id}`}
              className={cn("flex flex-col gap-1 border-b border-border p-3 text-sm hover:bg-accent/50", conversation.id === selectedId && "bg-accent")}
            >
              <span className="font-medium">{new Date(conversation.callDate).toLocaleString()}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{STATUS_LABEL[conversation.status]}</Badge>
                {formatDuration(conversation.durationSeconds)}
              </span>
              {verdict && <span className="text-xs text-muted-foreground">Score: {verdict.overallScore}%</span>}
            </Link>
          ))}
          {detail.conversations.length === 0 && <p className="p-3 text-sm text-muted-foreground">No conversations yet.</p>}
        </div>
      </div>

      {/* Panel 2: player + transcript */}
      <div className="flex flex-col overflow-y-auto border-r border-border">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-border p-3">
              <div>
                <span className="text-sm font-medium">{new Date(selected.conversation.callDate).toLocaleString()}</span>
                <p className="text-xs text-muted-foreground capitalize">Source: {selected.conversation.source.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Share2 className="size-4" />
                <Trash2 className="size-4" />
              </div>
            </div>
            <div className="border-b border-border p-3">
              {selected.conversation.audioUrl ? (
                <audio controls src={selected.conversation.audioUrl} className="w-full" />
              ) : (
                <p className="text-xs text-muted-foreground">No audio file for this call (transcript-only upload or mock pipeline run).</p>
              )}
            </div>
            <Tabs defaultValue="transcript" className="flex-1">
              <div className="border-b border-border px-3 pt-2">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                  <TabsTrigger value="transcript">Transcript View</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="timeline" className="p-4 text-sm text-muted-foreground">
                Per-participant talk-time % and waveform aren&apos;t available without a real audio file — see{" "}
                <code>talkToListenRatio</code> on the conversation row for the aggregate figure shown elsewhere.
              </TabsContent>
              <TabsContent value="transcript">
                <TranscriptView lines={selected.conversation.transcriptTranslated ?? selected.conversation.transcriptRaw} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Select a conversation to view its transcript.</p>
        )}
      </div>

      {/* Panel 3: summary / insights / quality */}
      <div className="flex flex-col overflow-y-auto">
        {selected ? (
          <Tabs defaultValue="summary" className="flex-1">
            <div className="border-b border-border px-3 pt-2">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="quality">Quality</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="summary" className="flex flex-col gap-4 p-4">
              {selected.verdict ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={selected.verdict.riskLevel === "likely_genuine" ? "positive" : selected.verdict.riskLevel === "needs_review" ? "moderate" : "negative"} className="w-fit">
                      {selected.verdict.riskLevel.replace(/_/g, " ")}
                    </Badge>
                    {selected.conversation.intentScore != null && (
                      <Badge variant="outline" className="w-fit">
                        Intent: {selected.conversation.intent ?? "—"} ({selected.conversation.intentScore}/100)
                      </Badge>
                    )}
                  </div>
                  {[
                    { label: "Call Summary", bullets: selected.verdict.callSummary },
                    { label: "Key Points", bullets: selected.verdict.keyPoints },
                    { label: "Main Takeaways", bullets: selected.verdict.mainTakeaways },
                  ].map(({ label, bullets }) =>
                    bullets?.length ? (
                      <div key={label}>
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                          {bullets.map((bullet, i) => (
                            <li key={i}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null
                  )}
                  {!selected.verdict.callSummary?.length && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Conversation Summary</span>
                      <p className="text-sm">{selected.verdict.summary}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">This call hasn&apos;t been scored yet — status: {STATUS_LABEL[selected.conversation.status]}.</p>
              )}
            </TabsContent>
            <TabsContent value="insights" className="flex flex-col gap-3 p-4">
              {selected.dataCapture.length === 0 && <p className="text-sm text-muted-foreground">No extracted fields for this call.</p>}
              {selected.dataCapture.map(({ value, field }) => (
                <div key={field.id} className="rounded-md border border-border p-2">
                  <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                  <p className="text-sm">{value.value}</p>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="quality" className="p-4">
              {selected.verdict ? <QualityScorecard callId={selected.conversation.id} data={selected} user={user} /> : <p className="text-sm text-muted-foreground">Not scored yet.</p>}
            </TabsContent>
          </Tabs>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Nothing to show.</p>
        )}
      </div>
    </div>
  );
}
