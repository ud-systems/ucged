import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCgePerformanceActivity,
  useCgePerformanceLeaderboard,
  useCgePerformanceSummary,
  useCgePerformanceTimeseries,
  type LeaderboardRow,
} from "@/hooks/use-cge-data";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DrilldownSheet } from "@/components/dashboard/DrilldownSheet";
import { resolvePeriod, toIso, type PeriodKey } from "@/lib/performance-period";
import { Button } from "@/components/ui/button";

function defaultCustomFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function defaultCustomTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("week");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(defaultCustomTo);
  const [drillId, setDrillId] = useState<string | null>(null);
  const [drillName, setDrillName] = useState<string | undefined>();

  const period = useMemo(
    () => resolvePeriod(periodKey, customFrom, customTo),
    [periodKey, customFrom, customTo],
  );
  const fromIso = toIso(period.from);
  const toIsoEnd = toIso(period.to);

  const { data: summary, isLoading: summaryLoading } = useCgePerformanceSummary({
    viewerUserId: user?.id,
    from: fromIso,
    to: toIsoEnd,
    isAdmin,
  });

  const { data: leaderboard = [], isLoading: boardLoading } = useCgePerformanceLeaderboard({
    viewerUserId: user?.id,
    from: fromIso,
    to: toIsoEnd,
    enabled: isAdmin,
  });

  const { data: timeseries = [] } = useCgePerformanceTimeseries({
    viewerUserId: user?.id,
    from: fromIso,
    to: toIsoEnd,
  });

  const { data: activity = [] } = useCgePerformanceActivity({
    viewerUserId: user?.id,
    from: fromIso,
    to: toIsoEnd,
    limit: 25,
  });

  // CGE view: leaderboard RPC returns only self
  const { data: selfBoard = [] } = useCgePerformanceLeaderboard({
    viewerUserId: user?.id,
    from: fromIso,
    to: toIsoEnd,
    enabled: !isAdmin,
  });

  const selfStats = selfBoard[0];

  function openDrill(row: LeaderboardRow) {
    setDrillId(row.cge_user_id);
    setDrillName(row.display_name);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {isAdmin ? "Team performance" : "My performance"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Gamified CGE scoreboard — follow-ups, recoveries, and streaks by period."
              : "Your outreach XP, streak, and period targets."}{" "}
            <span className="text-foreground/80">{period.label}</span>
          </p>
        </div>
        <PeriodPicker
          periodKey={periodKey}
          onPeriodKeyChange={setPeriodKey}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {summaryLoading || !summary ? (
        <p className="text-muted-foreground">Loading performance…</p>
      ) : (
        <KpiStrip summary={summary} from={period.from} to={period.to} isAdmin={isAdmin} />
      )}

      {!isAdmin && selfStats && (
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your rank this period</p>
            <p className="font-heading text-2xl font-semibold mt-1">
              {selfStats.points} XP · {selfStats.streak}d streak
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {selfStats.outreach_count} outreach · {selfStats.customers_touched} customers ·{" "}
              {selfStats.recoveries} recoveries
            </p>
          </div>
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => openDrill(selfStats)}
          >
            View my drilldown
          </Button>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4">
          <TrendChart points={timeseries} />
          {isAdmin && (
            <Leaderboard
              rows={leaderboard}
              onSelect={openDrill}
              selectedId={drillId}
            />
          )}
          {boardLoading && isAdmin && (
            <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
          )}
        </div>
        <ActivityFeed items={activity} showCge={isAdmin} />
      </div>

      <DrilldownSheet
        open={Boolean(drillId)}
        onOpenChange={(o) => {
          if (!o) {
            setDrillId(null);
            setDrillName(undefined);
          }
        }}
        viewerUserId={user?.id}
        cgeUserId={drillId}
        cgeName={drillName}
        from={fromIso}
        to={toIsoEnd}
      />
    </div>
  );
}
