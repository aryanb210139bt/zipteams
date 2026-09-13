"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "converted", label: "Converted" },
  { value: "in_progress_calls", label: "In-Progress Calls" },
  { value: "not_converted", label: "Not Converted" },
];

export function LeadControls({
  leadId,
  status,
  assigneeId,
  associates,
}: {
  leadId: string;
  status: string;
  assigneeId: string | null;
  associates: { id: string; label: string }[];
}) {
  const router = useRouter();

  async function updateStatus(value: string) {
    const stageCategory = value === "converted" ? "converted" : value === "not_converted" ? "lost" : "in_pipeline";
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadStage: value, leadStageCategory: stageCategory }),
    });
    if (!res.ok) return toast.error("Could not update status.");
    toast.success("Status updated.");
    router.refresh();
  }

  async function updateAssignee(value: string) {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: value === "unassigned" ? null : value }),
    });
    if (!res.ok) return toast.error("Could not update assignee.");
    toast.success("Assignee updated.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Assignee:</span>
        <Select defaultValue={assigneeId ?? "unassigned"} onValueChange={updateAssignee}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {associates.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Status:</span>
        <Select defaultValue={status} onValueChange={updateStatus}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
