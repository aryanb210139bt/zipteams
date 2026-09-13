import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  UserCircle,
  Share2,
  ListChecks,
  FileBarChart,
  Flag,
  UploadCloud,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** PRD notes several sidebar items as not-yet-captured screens; still routable, just an empty state. */
  tbd?: boolean;
};

/** PRD 3.1 "Platform" nav list, plus the audit-suite additions (Review Queue, Upload) from the build prompt. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Conversations Insights", href: "/conversations-insights/dashboard", icon: LayoutDashboard },
  { label: "All Conversations", href: "/all-conversations", icon: ListChecks },
  { label: "Flagged for Review", href: "/review-queue", icon: Flag },
  { label: "Upload Calls", href: "/upload", icon: UploadCloud },
  { label: "Companies", href: "/companies", icon: Building2, tbd: true },
  { label: "My Conversations", href: "/my-conversations", icon: UserCircle, tbd: true },
  { label: "Shared With Me", href: "/shared-with-me", icon: Share2, tbd: true },
  { label: "Custom Reports", href: "/custom-reports", icon: FileBarChart, tbd: true },
];

export const SETUP_NAV_ITEM: NavItem = { label: "Setup", href: "/setup/profile", icon: Settings };
