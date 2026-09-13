"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { RubricCategory, RubricParameter } from "@/lib/db/schema";

type CategoryWithParams = RubricCategory & { parameters: RubricParameter[] };

export function RubricEditor({ categories }: { categories: CategoryWithParams[] }) {
  const router = useRouter();
  const [newParamText, setNewParamText] = useState<Record<string, string>>({});
  const [newParamWeight, setNewParamWeight] = useState<Record<string, "minor" | "important" | "critical">>({});

  async function addParameter(categoryId: string) {
    const text = newParamText[categoryId]?.trim();
    if (!text) return;
    const res = await fetch("/api/rubric/parameters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, text, weight: newParamWeight[categoryId] ?? "important", supportsPartialCredit: true }),
    });
    if (!res.ok) return toast.error("Could not add this parameter.");
    setNewParamText((s) => ({ ...s, [categoryId]: "" }));
    toast.success("Parameter added.");
    router.refresh();
  }

  async function removeParameter(id: string) {
    const res = await fetch(`/api/rubric/parameters/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not remove this parameter.");
    router.refresh();
  }

  async function updateCategoryWeight(id: string, weight: number) {
    const res = await fetch(`/api/rubric/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight }),
    });
    if (!res.ok) return toast.error("Could not update category weight.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => (
        <Card key={cat.id}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{cat.name}</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Weight
              <Input
                type="number"
                step={0.5}
                min={0}
                defaultValue={cat.weight}
                className="h-7 w-16"
                onBlur={(e) => updateCategoryWeight(cat.id, Number(e.target.value))}
              />
              {cat.weight === 0 && <span className="italic">(diagnostic only — excluded from overall score)</span>}
            </div>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {cat.parameters.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {p.weight}
                  </Badge>
                  <span className="text-sm">{p.text}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeParameter(p.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Add a parameter..."
                value={newParamText[cat.id] ?? ""}
                onChange={(e) => setNewParamText((s) => ({ ...s, [cat.id]: e.target.value }))}
                className="flex-1"
              />
              <Select value={newParamWeight[cat.id] ?? "important"} onValueChange={(v) => setNewParamWeight((s) => ({ ...s, [cat.id]: v as "minor" | "important" | "critical" }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addParameter(cat.id)}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
