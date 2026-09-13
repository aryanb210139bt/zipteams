"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/conversations-insights/dashboard" },
  { label: "Insights", href: "/conversations-insights/insights" },
  { label: "Leaderboard", href: "/conversations-insights/leaderboard" },
];

export function ConversationsInsightsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            pathname === tab.href ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
