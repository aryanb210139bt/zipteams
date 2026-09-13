import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialOf } from "@/lib/utils";
import type { getLeaderboard } from "@/lib/db/queries";

type Row = Awaited<ReturnType<typeof getLeaderboard>>[number];

export function LeaderboardTable({ rows }: { rows: Row[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Total Calls</TableHead>
          <TableHead>Unique Leads</TableHead>
          <TableHead>High Intent %</TableHead>
          <TableHead>Quality Score</TableHead>
          <TableHead>Won %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
              No calls in the selected range.
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.associate.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback>{initialOf(r.associate.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{r.associate.name}</span>
                  <span className="text-xs text-muted-foreground">{r.associate.email}</span>
                </div>
              </div>
            </TableCell>
            <TableCell className="tabular-nums">{r.totalCalls}</TableCell>
            <TableCell className="tabular-nums">{r.uniqueLeads}</TableCell>
            <TableCell className="tabular-nums">{r.highIntentPct}%</TableCell>
            <TableCell className="tabular-nums">{r.qualityScore}%</TableCell>
            <TableCell className="tabular-nums">{r.wonPct}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
