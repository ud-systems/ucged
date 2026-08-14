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
import { PageFrame, PageHeader } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { user, isAdmin, isSupervisor } = useAuth();
  const isTeamViewer = isAdmin || isSupervisor;
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
    isAdmin: isTeamViewer,
  });

  const { data: leaderboard = [], isLoading: boardLoading } = useCgePerformanceLeaderboard({
    viewerUserId: user?.id,
    from: fromIso,
    to: toIsoEnd,
    enabled: isTeamViewer,
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
    enabled: !isTeamViewer,
  });

  const selfStats = selfBoard[0];

  function openDrill(row: LeaderboardRow) {
    setDrillId(row.cge_user_id);
    setDrillName(row.display_name);
  }

  return (
    <PageFrame>
      <PageHeader
        title={isTeamViewer ? "Team performance" : "My performance"}
        description={
          <>
            {isTeamViewer
              ? "Gamified CGE scoreboard — follow-ups, recoveries, and streaks by period."
              : "Your outreach XP, streak, and period targets."}{" "}
            <span className="text-foreground/80">{period.label}</span>
          </>
        }
        actions={
          <PeriodPicker
            periodKey={periodKey}
            onPeriodKeyChange={setPeriodKey}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        }
      />

      {summaryLoading || !summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <KpiStrip summary={summary} from={period.from} to={period.to} isAdmin={isTeamViewer} />
      )}

      {!isTeamViewer && selfStats && (
        <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your rank this period</p>
            <p className="font-heading text-2xl font-semibold mt-1">
              {selfStats.points} XP · {selfStats.streak}d streak
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {selfStats.outreach_count} outreach · {selfStats.customers_touched} customers ·{" "}
              {selfStats.recoveries} recoveries
            </p>
          </div>
          <Button className="rounded-xl w-full sm:w-auto" variant="outline" onClick={() => openDrill(selfStats)}>
            View my drilldown
          </Button>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <TrendChart points={timeseries} />
          {isTeamViewer && (
            <Leaderboard
              rows={leaderboard}
              onSelect={openDrill}
              selectedId={drillId}
            />
          )}
          {boardLoading && isTeamViewer && (
            <Skeleton className="h-40 rounded-2xl" />
          )}
        </div>
        <ActivityFeed items={activity} showCge={isTeamViewer} />
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
    </PageFrame>
  );
}
