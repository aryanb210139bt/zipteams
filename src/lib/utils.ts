import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"}`;
  if (minutes > 0) return `${minutes} min${minutes === 1 ? "" : "s"} ${seconds}s`;
  return `${seconds}s`;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Every metric with a %-change badge is period-over-period against the
 * same-length prior period. Keep this as the single shared delta computation
 * rather than re-deriving it per metric (see PRD 11.2).
 */
export function computeDelta(current: number, previous: number): { pct: number | null; direction: "up" | "down" | "flat" } {
  if (previous === 0) {
    if (current === 0) return { pct: null, direction: "flat" };
    return { pct: null, direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  return { pct, direction };
}
