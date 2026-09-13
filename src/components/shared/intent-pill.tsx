import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const INTENT_LABEL: Record<string, string> = {
  high: "High",
  moderate: "Moderate",
  neutral: "Neutral",
  low: "Low",
  not_qualified: "Not Qualified",
  not_available: "Not Available",
};

const INTENT_VARIANT: Record<string, "positive" | "moderate" | "negative" | "neutral"> = {
  high: "positive",
  moderate: "moderate",
  neutral: "neutral",
  low: "negative",
  not_qualified: "neutral",
  not_available: "neutral",
};

export function IntentPill({ intent, trend, className }: { intent: string | null; trend?: "up" | "down" | "flat"; className?: string }) {
  if (!intent) return <span className="text-xs text-muted-foreground">—</span>;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge variant={INTENT_VARIANT[intent] ?? "neutral"}>{INTENT_LABEL[intent] ?? intent}</Badge>
      {trend && <TrendIcon className={cn("size-3.5", trend === "up" ? "text-status-positive" : trend === "down" ? "text-status-negative" : "text-status-neutral")} />}
    </span>
  );
}
