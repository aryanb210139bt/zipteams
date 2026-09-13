import { ChevronsUpDown } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialOf } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";

export async function Sidebar() {
  const user = await getCurrentUser();
  const org = await db.query.organizations.findFirst();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2 border-b border-border px-3 py-3.5">
        <div className="flex size-7 items-center justify-center rounded-md bg-teal text-sm font-bold text-teal-foreground">
          {initialOf(org?.name ?? "K")}
        </div>
        <div className="flex flex-1 flex-col leading-tight">
          <span className="text-sm font-semibold">{org?.name ?? "Kalvium"}</span>
          <span className="text-xs text-muted-foreground">{org?.workspaceName ?? "Default"}</span>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </div>

      <SidebarNav />

      <div className="flex items-center gap-2 border-t border-border p-3">
        <Avatar className="size-8">
          <AvatarFallback>{initialOf(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </div>
      </div>
    </aside>
  );
}
