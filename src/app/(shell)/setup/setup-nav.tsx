"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const GROUPS: { label: string; items: { label: string; href: string }[] }[] = [
  {
    label: "Get Started",
    items: [
      { label: "Setup Meeting Widget", href: "/setup/meeting-widget" },
      { label: "Meeting/Call Analytics", href: "/setup/analytics" },
    ],
  },
  {
    label: "Set Your Organization",
    items: [
      { label: "Manage Team", href: "/setup/team" },
      { label: "Connect your CRM", href: "/setup/integrations/crm" },
      { label: "Connect your WhatsApp", href: "/setup/integrations/whatsapp" },
      { label: "Connect your Voice Bot", href: "/setup/integrations/voice-bot" },
      { label: "Connect your Ad Account", href: "/setup/integrations/ad-account" },
      { label: "Connect Meeting Room", href: "/setup/integrations/meeting-room" },
      { label: "Leadsquared connection", href: "/setup/leadsquared" },
      { label: "Rubric editor", href: "/setup/rubric" },
      { label: "Glossary / Auto-correct", href: "/setup/glossary" },
      { label: "Qualification rules", href: "/setup/qualification-rules" },
      { label: "Subscription", href: "/setup/subscription" },
      { label: "Manage Custom Field", href: "/setup/custom-fields" },
    ],
  },
  {
    label: "My Settings",
    items: [
      { label: "My Profile", href: "/setup/profile" },
      { label: "Sync your Calendar", href: "/setup/calendar" },
      { label: "Connect your calling software", href: "/setup/calling-software" },
      { label: "Install easy to use apps", href: "/setup/apps" },
    ],
  },
];

export function SetupNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-3 md:flex">
      {GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <span className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group.label}</span>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  pathname === item.href ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
