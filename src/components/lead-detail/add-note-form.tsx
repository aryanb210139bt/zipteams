"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AddNoteForm({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, body }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not save note.");
    setBody("");
    toast.success("Note added.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note about this lead..." rows={3} />
      <Button type="submit" size="sm" className="w-fit" disabled={busy || !body.trim()}>
        Add note
      </Button>
    </form>
  );
}
