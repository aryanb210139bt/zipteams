"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import type { getReviewQueue } from "@/lib/db/queries";

type Row = Awaited<ReturnType<typeof getReviewQueue>>[number];

const RISK_VARIANT = { needs_review: "moderate", high_fabrication_risk: "negative" } as const;
const RISK_LABEL = { needs_review: "Needs Review", high_fabrication_risk: "High Fabrication Risk" } as const;

export function ReviewQueueTable({ rows }: { rows: Row[] }) {
  const router = useRouter();

  async function signOff(callId: string) {
    const res = await fetch(`/api/calls/${callId}/verdict`, { method: "PATCH", body: JSON.stringify({ action: "sign-off" }) });
    if (!res.ok) {
      toast.error("Could not sign off this call.");
      return;
    }
    toast.success("Marked as reviewed.");
    router.refresh();
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lead</TableHead>
          <TableHead>Associate</TableHead>
          <TableHead>Call Date</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Risk Level</TableHead>
          <TableHead>Score</TableHead>
          <TableHead className="min-w-64">Fabrication Rationale</TableHead>
          <TableHead>Reviewed</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
              Nothing flagged right now — every scored call looks like a genuine, well-handled conversation.
            </TableCell>
          </TableRow>
        )}
        {rows.map(({ conversation, lead, verdict, associate }) => (
          <TableRow key={conversation.id}>
            <TableCell>
              <Link href={`/leads/${lead.id}/conversations`} className="font-medium hover:underline">
                {lead.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{associate?.name ?? "Unassigned"}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(conversation.callDate).toLocaleString()}</TableCell>
            <TableCell className="text-muted-foreground">{formatDuration(conversation.durationSeconds)}</TableCell>
            <TableCell>
              <Badge variant={RISK_VARIANT[verdict.riskLevel as keyof typeof RISK_VARIANT]}>{RISK_LABEL[verdict.riskLevel as keyof typeof RISK_LABEL]}</Badge>
            </TableCell>
            <TableCell className="tabular-nums">{verdict.overallScore}%</TableCell>
            <TableCell className="max-w-72 truncate text-sm text-muted-foreground" title={verdict.fabricationRationale ?? undefined}>
              {verdict.fabricationRationale}
            </TableCell>
            <TableCell>
              {verdict.reviewedAt ? (
                <span className="text-xs text-status-positive">Reviewed {new Date(verdict.reviewedAt).toLocaleDateString()}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Pending</span>
              )}
            </TableCell>
            <TableCell>
              {!verdict.reviewedAt && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => signOff(conversation.id)}>
                  <ShieldCheck className="size-3.5" /> Sign off
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
