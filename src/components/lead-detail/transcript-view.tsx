import { formatClock } from "@/lib/utils";
import type { TranscriptLine } from "@/lib/db/schema";

export function TranscriptView({ lines }: { lines: TranscriptLine[] | null }) {
  if (!lines || lines.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No transcript yet — this call is still in the pipeline, or hasn&apos;t been uploaded.</p>;
  }
  return (
    <div className="flex flex-col gap-3 p-4">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-3">
          <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{formatClock(line.startSeconds)}</span>
          <div className="flex flex-col">
            <span className={`text-xs font-medium ${line.speaker === "associate" ? "text-teal" : "text-muted-foreground"}`}>
              {line.speaker === "associate" ? "Associate" : "Lead"}
            </span>
            <p className="text-sm">{line.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
