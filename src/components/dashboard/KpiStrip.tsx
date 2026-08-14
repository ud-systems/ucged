import type { PerformanceSummary } from "@/hooks/use-cge-data";
import { periodDayCount } from "@/lib/performance-period";
import { cn } from "@/lib/utils";

function Card({
  label,
  value,
  hint,
  progress,
}: {
  label: string;
  value: number | string;
  hint?: string;
  progress?: number;
}) {
  const pct = progress != null ? Math.min(100, Math.max(0, progress)) : null;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] min-w-[140px]">
      <p className="text-xs text-muted-foreground font-body">{label}</p>
      <p className="font-heading text-2xl font-semibold mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      {pct != null && (
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-primary transition-all", pct >= 100 && "bg-emerald-600")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function KpiStrip({
  summary,
  from,
  to,
  isAdmin,
}: {
  summary: PerformanceSummary;
  from: Date;
  to: Date;
  isAdmin: boolean;
}) {
  const days = periodDayCount(from, to);
  const outreachTarget = 15 * days;
  const recoveryTarget = Math.max(1, Math.round((5 / 7) * days));

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <Card
        label="XP"
        value={summary.points}
        hint="+1 outreach · +3 customer · +10 recovery · +2 email"
      />
      <Card
        label="Outreach"
        value={summary.outreach_count}
        hint={`Target ~${outreachTarget}`}
        progress={(summary.outreach_count / outreachTarget) * 100}
      />
      <Card label="Customers touched" value={summary.customers_touched} />
      <Card
        label="Recoveries"
        value={summary.recoveries}
        hint={`Target ~${recoveryTarget}`}
        progress={(summary.recoveries / recoveryTarget) * 100}
      />
      <Card label="Emails sent" value={summary.emails_sent} />
      {!isAdmin && summary.streak != null && (
        <Card label="Streak" value={`${summary.streak}d`} hint="Days with ≥1 outreach" />
      )}
      {isAdmin && <Card label="Active CGEs" value={summary.active_cges} />}
      <Card label="Open / overdue" value={`${summary.open_tasks} / ${summary.overdue_tasks}`} />
    </div>
  );
}
