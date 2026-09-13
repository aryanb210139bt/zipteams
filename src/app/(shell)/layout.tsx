import type { ReactNode } from "react";

import { Sidebar } from "@/components/shell/sidebar";

// Every page under this shell reads live, mutable data straight from the
// database (org settings, leads, scores, review queue, …) — none of it
// should ever be baked in at build time, so force the whole authenticated
// app to render per-request.
export const dynamic = "force-dynamic";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
