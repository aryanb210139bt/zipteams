"use client";

import { useState } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export function QualityScorePanel({ categoryBars }: { categoryBars: { name: string; pct: number }[] }) {
  const [tab, setTab] = useState<"score" | "gap">("score");

  return (
    <Card className="flex-1">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Call Quality {tab === "score" ? "Score" : "Gap"}</CardTitle>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "score" | "gap")}>
          <TabsList>
            <TabsTrigger value="score">Call Quality Score</TabsTrigger>
            <TabsTrigger value="gap">Call Quality Gap</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {tab === "score" ? (
          <div className="flex flex-col gap-3">
            {categoryBars.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm">{c.name}</span>
                <Progress value={c.pct} className="h-2" indicatorClassName={c.pct >= 70 ? "bg-status-positive" : c.pct >= 40 ? "bg-status-moderate" : "bg-status-negative"} />
                <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{c.pct}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Call Quality Gap view wasn&apos;t captured in the source product screenshots (PRD §5.2) — this tab is a
            placeholder until that content is confirmed against the live product.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
