import type { LeaderboardRow } from "@/hooks/use-cge-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-4 py-3 border-b">
        <h2 className="font-heading text-lg font-semibold">Leaderboard</h2>
        <p className="text-xs text-muted-foreground">Click a CGE for follow-up drilldown</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Rank</th>
              <th className="text-left p-3 font-medium">CGE</th>
              <th className="text-right p-3 font-medium">XP</th>
              <th className="text-right p-3 font-medium">Outreach</th>
              <th className="text-right p-3 font-medium">Customers</th>
              <th className="text-right p-3 font-medium">Recoveries</th>
              <th className="text-right p-3 font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.cge_user_id}
                className={cn(
                  "border-t cursor-pointer hover:bg-accent/40",
                  selectedId === row.cge_user_id && "bg-primary/10",
                  row.rank <= 3 && "font-medium",
                )}
                onClick={() => onSelect(row)}
              >
                <td className="p-3">
                  <Badge variant={row.rank <= 3 ? "default" : "outline"} className="tabular-nums">
                    {rankBadge(row.rank)}
                  </Badge>
                </td>
                <td className="p-3">{row.display_name}</td>
                <td className="p-3 text-right tabular-nums">{row.points}</td>
                <td className="p-3 text-right tabular-nums">{row.outreach_count}</td>
                <td className="p-3 text-right tabular-nums">{row.customers_touched}</td>
                <td className="p-3 text-right tabular-nums">{row.recoveries}</td>
                <td className="p-3 text-right tabular-nums">{row.streak}d</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No CGE activity in this period yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
