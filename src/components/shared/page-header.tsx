import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

export function PageHeader({
  title,
  breadcrumb,
  description,
  actions,
}: {
  title: string;
  breadcrumb?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
      <div className="flex flex-col gap-0.5">
        {breadcrumb && <span className="text-xs text-muted-foreground">{breadcrumb}</span>}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{title}</h1>
          <HelpCircle className="size-4 text-muted-foreground" />
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
