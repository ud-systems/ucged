import { useRef } from "react";
import type { LeaderboardRow } from "@/hooks/use-cge-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DataTableShell,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";
import { useStaggerIn } from "@/hooks/use-stagger-in";

function rankBadge(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

export function Leaderboard({
  rows,
  onSelect,
  selectedId,
}: {
  rows: LeaderboardRow[];
  onSelect: (row: LeaderboardRow) => void;
  selectedId?: string | null;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useStaggerIn(listRef, "[data-stagger-item]", [rows]);

  return (
    <div ref={listRef} className="rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-4 py-3 border-b">
        <h2 className="font-heading text-lg font-semibold">Leaderboard</h2>
        <p className="text-xs text-muted-foreground">Click a CGE for follow-up drilldown</p>
      </div>
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {rows.map((row) => (
          <RecordCard
            key={row.cge_user_id}
            className={cn(selectedId === row.cge_user_id && "ring-1 ring-primary/40 bg-primary/5")}
            onClick={() => onSelect(row)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{row.display_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {row.outreach_count} outreach · {row.customers_touched} customers
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant={row.rank <= 3 ? "default" : "outline"} className="tabular-nums">
                  {rankBadge(row.rank)}
                </Badge>
                <p className="text-sm font-semibold tabular-nums mt-1">{row.points} XP</p>
              </div>
            </div>
          </RecordCard>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No CGE activity in this period yet.</p>
        )}
      </div>
      <DataTableShell className="hidden md:block border-0 rounded-none shadow-none">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>CGE</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Outreach</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Customers</TableHead>
              <TableHead className="text-right">Recoveries</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Streak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.cge_user_id}
                data-stagger-item
                className={cn(
                  "cursor-pointer",
                  selectedId === row.cge_user_id && "bg-primary/10",
                  row.rank <= 3 && "font-medium",
                )}
                onClick={() => onSelect(row)}
              >
                <TableCell>
                  <Badge variant={row.rank <= 3 ? "default" : "outline"} className="tabular-nums">
                    {rankBadge(row.rank)}
                  </Badge>
                </TableCell>
                <TableCell className="truncate max-w-[10rem]">{row.display_name}</TableCell>
                <TableCell className="text-right tabular-nums">{row.points}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">{row.outreach_count}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">{row.customers_touched}</TableCell>
                <TableCell className="text-right tabular-nums">{row.recoveries}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">{row.streak}d</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                  No CGE activity in this period yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}
