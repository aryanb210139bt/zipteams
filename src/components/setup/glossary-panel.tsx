"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { GlossaryTerm } from "@/lib/db/schema";

export function GlossaryPanel({ terms }: { terms: GlossaryTerm[] }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [mistranscriptions, setMistranscriptions] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    setBusy(true);
    const res = await fetch("/api/glossary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, commonMistranscriptions: mistranscriptions.split(",").map((s) => s.trim()).filter(Boolean) }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not add this term.");
    setTerm("");
    setMistranscriptions("");
    toast.success("Glossary term added.");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/glossary/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not remove this term.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Correct term</Label>
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Kalvium" className="w-48" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Common mistranscriptions (comma-separated)</Label>
            <Input value={mistranscriptions} onChange={(e) => setMistranscriptions(e.target.value)} placeholder="Calvium, Kalvin" className="w-72" />
          </div>
          <Button type="submit" disabled={busy || !term.trim()} className="gap-1.5">
            <Plus className="size-4" /> Add term
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Term</TableHead>
              <TableHead>Common mistranscriptions</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  No glossary terms yet.
                </TableCell>
              </TableRow>
            )}
            {terms.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.term}</TableCell>
                <TableCell className="text-muted-foreground">{(t.commonMistranscriptions ?? []).join(", ") || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
