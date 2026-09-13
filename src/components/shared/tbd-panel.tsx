import { Construction } from "lucide-react";

export function TbdPanel({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <Construction className="size-8 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {note ?? "This screen wasn't captured from the source product's screenshots — see the PRD's open-questions section. Nav item is wired up and routable; content is TBD."}
      </p>
    </div>
  );
}
