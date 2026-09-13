"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Organization } from "@/lib/db/schema";

export function LeadsquaredForm({ config }: { config: Organization["leadsquaredConfig"] }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [accessKey, setAccessKey] = useState(config?.accessKey ?? "");
  const [secretKey, setSecretKey] = useState(config?.secretKey ?? "");
  const [hostUrl, setHostUrl] = useState(config?.hostUrl ?? "https://api.leadsquared.com");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/leadsquared-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, accessKey: accessKey || undefined, secretKey: secretKey || undefined, hostUrl: hostUrl || undefined }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not save Leadsquared config.");
    toast.success("Leadsquared config saved.");
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Push call scores to Leadsquared</p>
          <p className="text-xs text-muted-foreground">On score completion, pushes score/verdict/flag status back to the lead&apos;s CRM record.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Access key</Label>
          <Input value={accessKey} onChange={(e) => setAccessKey(e.target.value)} type="password" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Secret key</Label>
          <Input value={secretKey} onChange={(e) => setSecretKey(e.target.value)} type="password" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Host URL</Label>
          <Input value={hostUrl} onChange={(e) => setHostUrl(e.target.value)} />
        </div>
        <Button onClick={save} disabled={busy} className="w-fit" variant="teal">
          Save
        </Button>
      </div>
    </Card>
  );
}
