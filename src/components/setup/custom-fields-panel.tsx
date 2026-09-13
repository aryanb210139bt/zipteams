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
import { Badge } from "@/components/ui/badge";
import type { DataCaptureField } from "@/lib/db/schema";

export function CustomFieldsPanel({ fields }: { fields: DataCaptureField[] }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !label.trim()) return;
    setBusy(true);
    const res = await fetch("/api/data-capture-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key.trim().toLowerCase().replace(/\s+/g, "_"), label, fieldType: "text" }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not add this field.");
    setKey("");
    setLabel("");
    toast.success("Custom field added.");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/data-capture-fields/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not remove this field.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Course/College interested in" className="w-64" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Key</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="course_college" className="w-48" />
          </div>
          <Button type="submit" disabled={busy || !key.trim() || !label.trim()} className="gap-1.5">
            <Plus className="size-4" /> Add field
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No custom fields yet.
                </TableCell>
              </TableRow>
            )}
            {fields.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.label}</TableCell>
                <TableCell className="text-muted-foreground">{f.key}</TableCell>
                <TableCell>
                  <Badge variant="outline">{f.fieldType}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)}>
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
