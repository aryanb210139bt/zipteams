"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, SETUP_NAV_ITEM, type NavItem } from "./nav-config";

/**
 * Client component so lucide icon components (function refs) never have to
 * cross the server → client boundary as props — this module imports
 * nav-config directly instead of receiving it from the server Sidebar.
 */
export function SidebarNav() {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function renderLink(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
      <span className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Platform</span>
      {renderLink(SETUP_NAV_ITEM)}
      <div className="my-1 h-px bg-border" />
      {NAV_ITEMS.map(renderLink)}
    </nav>
  );
}
