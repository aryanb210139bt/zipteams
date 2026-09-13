import { cn } from "@/lib/utils";

/** Circular quality-score ring: green stroke ≥ ~70%, orange/mixed below (PRD 3.3). */
export function ScoreRing({ value, size = 40 }: { value: number | null; size?: number }) {
  if (value == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 70 ? "stroke-status-positive" : clamped >= 40 ? "stroke-status-moderate" : "stroke-status-negative";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={4} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("fill-none transition-all", color)}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums">{Math.round(clamped)}%</span>
    </div>
  );
}
