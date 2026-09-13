"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = ["#2f9e6e", "#e08a3c", "#d1495b", "#3d7ea6", "#9b6bc4", "#8a8a8a"];

export function KeyLeadConcernsPanel({
  concerns,
}: {
  concerns: { totalConcerns: number; uniqueContacts: number; breakdown: { name: string; description: string | null; count: number; pct: number }[] };
}) {
  const chartData = concerns.breakdown.map((c) => ({ name: c.name, value: c.count }));

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="text-base">Key Lead Concerns</CardTitle>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{concerns.totalConcerns}</strong> Total Concerns
          </span>
          <span>
            <strong className="text-foreground">{concerns.uniqueContacts}</strong> Unique Contacts
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row">
        <div className="mx-auto h-40 w-40 shrink-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No concerns yet</div>
          )}
        </div>
        <ScrollArea className="h-40 flex-1">
          <div className="flex flex-col gap-3 pr-2">
            {concerns.breakdown.map((c, i) => (
              <div key={c.name} className="flex items-start gap-2">
                <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {c.pct}% · {c.name}
                  </span>
                  {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                </div>
              </div>
            ))}
            {concerns.breakdown.length === 0 && <span className="text-sm text-muted-foreground">No objections captured for this range yet.</span>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
