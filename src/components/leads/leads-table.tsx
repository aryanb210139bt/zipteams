"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntentPill } from "@/components/shared/intent-pill";
import { ScoreRing } from "@/components/shared/score-ring";
import { initialOf } from "@/lib/utils";
import type { getLeadsTable } from "@/lib/db/queries";

type Row = Awaited<ReturnType<typeof getLeadsTable>>["rows"][number];

const STATUS_LABEL: Record<string, string> = {
  converted: "Converted",
  in_progress_calls: "In-Progress Calls",
  not_converted: "Not-Converted",
};

export function LeadsTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.lead.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete this lead.");
      return;
    }
    toast.success("Lead removed.");
    router.refresh();
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Conversations</TableHead>
          <TableHead>Last Conversation</TableHead>
          <TableHead>Next Task Due Date</TableHead>
          <TableHead>Next Conversation</TableHead>
          <TableHead>Conversation owner</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Intent</TableHead>
          <TableHead>Quality Score</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
              No leads match the current filters.
            </TableCell>
          </TableRow>
        )}
        {rows.map(({ lead, owner, conversationCount, lastConversationAt, nextTask, intent, qualityScore }) => (
          <TableRow key={lead.id}>
            <TableCell>
              <Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggleOne(lead.id)} aria-label={`Select ${lead.name}`} />
            </TableCell>
            <TableCell>
              <Link href={`/leads/${lead.id}/insights`} className="font-medium text-foreground hover:underline">
                {lead.name}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/leads/${lead.id}/conversations`} className="text-muted-foreground hover:underline">
                {conversationCount} Conversation{conversationCount === 1 ? "" : "s"}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {lastConversationAt ? new Date(lastConversationAt).toLocaleDateString() : "-"}
            </TableCell>
            <TableCell className="max-w-56 truncate text-muted-foreground">
              {nextTask ? (
                <span>
                  {nextTask.dueDate ? new Date(nextTask.dueDate).toLocaleDateString() : ""} — {nextTask.title}
                </span>
              ) : (
                "-"
              )}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5" /> Schedule meeting
              </Button>
            </TableCell>
            <TableCell>
              {owner ? (
                <span className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{initialOf(owner.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{owner.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{STATUS_LABEL[lead.leadStage] ?? lead.leadStage}</Badge>
            </TableCell>
            <TableCell>
              <IntentPill intent={intent} />
            </TableCell>
            <TableCell>
              <ScoreRing value={qualityScore} size={36} />
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)} aria-label="Delete lead">
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
