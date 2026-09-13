"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { QualificationRule } from "@/lib/db/schema";

export function QualificationRulesPanel({ rules }: { rules: QualificationRule[] }) {
  const router = useRouter();
  const [ruleText, setRuleText] = useState("");
  const [quote, setQuote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleText.trim()) return;
    setBusy(true);
    const res = await fetch("/api/qualification-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleText, supportingQuote: quote || undefined }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not add this rule.");
    setRuleText("");
    setQuote("");
    toast.success("Qualification rule added.");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/qualification-rules/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not remove this rule.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Rule</Label>
            <Textarea value={ruleText} onChange={(e) => setRuleText(e.target.value)} rows={2} placeholder="A lead is qualified only if..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Supporting quote (optional)</Label>
            <Input value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="A quote from a call that surfaced this rule" />
          </div>
          <Button type="submit" disabled={busy || !ruleText.trim()} className="w-fit gap-1.5">
            <Plus className="size-4" /> Add rule
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {rules.length === 0 && <p className="text-sm text-muted-foreground">No qualification rules extracted yet.</p>}
        {rules.map((r) => (
          <Card key={r.id} className="flex-row items-start gap-3 p-4">
            <div className="flex-1">
              <p className="text-sm">{r.ruleText}</p>
              {r.supportingQuote && <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{r.supportingQuote}&rdquo;</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
