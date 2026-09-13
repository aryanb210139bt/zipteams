import type { ReactNode } from "react";

import { ConversationsInsightsTabs } from "./tabs";

export default function ConversationsInsightsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold">Conversations Insights</h1>
        <ConversationsInsightsTabs />
      </header>
      {children}
    </div>
  );
}
