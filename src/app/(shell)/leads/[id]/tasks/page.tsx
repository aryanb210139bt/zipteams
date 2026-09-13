import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail } from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function LeadTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getLeadDetail(id);
  if (!detail || detail.lead.orgId !== user.orgId) notFound();

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      {detail.tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet — they&apos;re generated automatically from each call&apos;s action items.</p>}
      {detail.tasks.map((task) => (
        <Card key={task.id} className="flex-row items-start gap-3 p-4">
          {task.status === "done" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-positive" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{task.title}</span>
              <Badge variant={task.status === "done" ? "positive" : "outline"}>{task.status}</Badge>
            </div>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            {task.sayScript && <p className="text-xs italic text-muted-foreground">&ldquo;Say: {task.sayScript}&rdquo;</p>}
            {task.dueDate && <span className="text-xs text-muted-foreground">Due {new Date(task.dueDate).toLocaleString()}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}
