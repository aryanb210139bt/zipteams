import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SetupNav } from "./setup-nav";

export default async function SetupLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const org = await db.query.organizations.findFirst();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 bg-teal px-4 py-3 text-teal-foreground md:px-6">
        <span className="text-sm font-semibold">{org?.name ?? "Kalvium"}</span>
        <span className="text-xs opacity-80">{org?.workspaceName ?? "Default"} workspace</span>
        <span className="ml-auto text-xs opacity-80">Signed in as {user.name}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <SetupNav />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
