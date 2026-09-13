"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SUB_TABS = ["insights", "conversations", "profile", "tasks", "notes", "whatsapp"] as const;

export function LeadTabs({ leadId }: { leadId: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 border-b border-border px-4 md:px-6">
      {SUB_TABS.map((tab) => {
        const href = `/leads/${leadId}/${tab}`;
        const active = pathname === href;
        return (
          <Link
            key={tab}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium capitalize transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </Link>
        );
      })}
    </nav>
  );
}
