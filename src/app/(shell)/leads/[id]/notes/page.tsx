import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail } from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialOf } from "@/lib/utils";
import { AddNoteForm } from "@/components/lead-detail/add-note-form";

export default async function LeadNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getLeadDetail(id);
  if (!detail || detail.lead.orgId !== user.orgId) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Card>
        <AddNoteForm leadId={id} />
      </Card>
      <div className="flex flex-col gap-3">
        {detail.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        {detail.notes.map(({ note, author }) => (
          <div key={note.id} className="flex gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initialOf(author?.name ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                {author?.name ?? "Unknown"} · {new Date(note.createdAt).toLocaleString()}
              </span>
              <p className="text-sm">{note.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
