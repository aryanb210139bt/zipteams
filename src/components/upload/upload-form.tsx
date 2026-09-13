"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileText } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const SAMPLE_CSV = `associateEmail,leadName,leadEmail,audioUrl,transcript,durationSeconds,source,callDate
aparna.pillai@kalvium.com,Test Lead,test.lead@example.com,,"Hi, this is Aparna calling from Kalvium.\nHi, go ahead.",420,manually_uploaded,2026-09-01`;

export function UploadForm({ associates }: { associates: { id: string; label: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Single upload state
  const [associateId, setAssociateId] = useState(associates[0]?.id ?? "");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [duration, setDuration] = useState("300");

  // CSV upload state
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [csvResult, setCsvResult] = useState<{ total: number; queued: number } | null>(null);

  async function submitSingle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/upload/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ associateId, leadName, leadEmail: leadEmail || undefined, audioUrl: audioUrl || undefined, durationSeconds: Number(duration) || 0 }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Call queued — the pipeline will transcribe, translate, score, and notify.");
      setLeadName("");
      setLeadEmail("");
      setAudioUrl("");
      router.refresh();
    } catch {
      toast.error("Could not queue this call.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCsv(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setCsvResult(null);
    try {
      const res = await fetch("/api/upload/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCsvResult({ total: data.total, queued: data.queued });
      toast.success(`Queued ${data.queued} of ${data.total} rows.`);
      router.refresh();
    } catch {
      toast.error("Could not process this CSV.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tabs defaultValue="single" className="max-w-2xl">
      <TabsList>
        <TabsTrigger value="single">Single call</TabsTrigger>
        <TabsTrigger value="csv">Bulk CSV upload</TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="size-4" /> Upload a single call
            </CardTitle>
            <CardDescription>Kicks off upload → transcribe → translate → score → notify for this one call.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={submitSingle}>
              <div className="flex flex-col gap-1.5">
                <Label>Associate</Label>
                <Select value={associateId} onValueChange={setAssociateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an associate" />
                  </SelectTrigger>
                  <SelectContent>
                    {associates.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Lead name</Label>
                <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Lead email (optional — matches an existing lead)</Label>
                <Input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Audio URL</Label>
                <Input placeholder="https://... (leave blank to run the mock transcriber)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Duration (seconds)</Label>
                <Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy || !leadName || !associateId} className="w-fit">
                Upload & queue
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="csv">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" /> Bulk CSV upload
            </CardTitle>
            <CardDescription>
              Columns: <code>associateEmail, leadName, leadEmail, audioUrl, transcript, durationSeconds, source, callDate</code>. Leave{" "}
              <code>audioUrl</code> blank and put text in <code>transcript</code> to skip transcription for that row.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={submitCsv}>
              <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={10} className="font-mono text-xs" />
              <Button type="submit" disabled={busy} className="w-fit">
                Upload & queue rows
              </Button>
              {csvResult && (
                <p className="text-sm text-muted-foreground">
                  Queued {csvResult.queued} of {csvResult.total} rows.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
