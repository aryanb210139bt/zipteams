import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  deltaPct,
  direction,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  deltaPct?: number | null;
  direction?: "up" | "down" | "flat";
  className?: string;
}) {
  return (
    <Card className={cn("gap-2 p-4", className)}>
      <div className="flex items-center justify-between">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {deltaPct !== undefined && direction && <DeltaBadge pct={deltaPct} direction={direction} />}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
