import type { TimeseriesPoint } from "@/hooks/use-cge-data";

export function TrendChart({ points }: { points: TimeseriesPoint[] }) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.outreach_count, p.recoveries)));
  const w = 560;
  const h = 120;
  const pad = 8;

  const toX = (i: number) => {
    if (points.length <= 1) return pad;
    return pad + (i / (points.length - 1)) * (w - pad * 2);
  };
  const toY = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const outreachPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.outreach_count).toFixed(1)}`)
    .join(" ");
  const recoveryPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.recoveries).toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Trend</h2>
          <p className="text-xs text-muted-foreground">Daily outreach vs recoveries</p>
        </div>
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Outreach
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> Recoveries
          </span>
        </div>
      </div>
      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]" role="img" aria-label="Performance trend">
          <path d={outreachPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
          <path d={recoveryPath} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
        </svg>
      )}
    </div>
  );
}
