import { ArrowUp, ArrowDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export function DeltaBadge({ pct, direction, className }: { pct: number | null; direction: "up" | "down" | "flat"; className?: string }) {
  if (pct === null) {
    return <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", className)}>N/A —</span>;
  }
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const color = direction === "up" ? "text-status-positive" : direction === "down" ? "text-status-negative" : "text-status-neutral";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", color, className)}>
      <Icon className="size-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
