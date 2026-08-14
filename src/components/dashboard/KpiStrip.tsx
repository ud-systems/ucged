import { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PerformanceSummary } from "@/hooks/use-cge-data";
import { periodDayCount } from "@/lib/performance-period";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";
import { CountUpValue } from "@/components/layout";

gsap.registerPlugin(useGSAP);

function Card({
  label,
  value,
  hint,
  progress,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  progress?: number;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = progress != null ? Math.min(100, Math.max(0, progress)) : null;

  useGSAP(
    () => {
      const el = barRef.current;
      if (!el || pct == null) return;
      if (prefersReducedMotion()) {
        gsap.set(el, { width: `${pct}%` });
        return;
      }
      gsap.fromTo(el, { width: "0%" }, { width: `${pct}%`, duration: 0.7, ease: "power2.out" });
    },
    { dependencies: [pct] },
  );

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card shadow-[var(--shadow-card)] flex flex-col overflow-hidden min-w-0",
        className,
      )}
    >
      <div className="p-4 pb-3 min-h-[76px]">
        <p className="text-xs text-muted-foreground font-body truncate">{label}</p>
        <p className="font-heading text-2xl font-semibold mt-1 tabular-nums tracking-tight">
          {typeof value === "number" ? <CountUpValue value={value} /> : value}
        </p>
      </div>
      <div className="mt-auto border-t px-4 py-2.5 min-h-[52px] flex flex-col justify-center gap-1.5">
        <p className={cn("text-[11px] leading-snug line-clamp-2", hint ? "text-muted-foreground" : "text-transparent")}>
          {hint || "—"}
        </p>
        <div className={cn("h-1.5 rounded-full overflow-hidden", pct != null ? "bg-muted" : "bg-transparent")}>
          {pct != null ? (
            <div
              ref={barRef}
              className={cn("h-full rounded-full bg-primary", pct >= 100 && "bg-emerald-600")}
              style={{ width: 0 }}
            />
          ) : null}
        </div>
      </div>
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const days = periodDayCount(from, to);
  const outreachTarget = 15 * days;
  const recoveryTarget = Math.max(1, Math.round((5 / 7) * days));

  const cardProps = useMemo(
    () =>
      [
        {
          label: "Outreach",
          value: summary.outreach_count,
          hint: `Target ~${outreachTarget}`,
          progress: (summary.outreach_count / outreachTarget) * 100,
        },
        { label: "Customers touched", value: summary.customers_touched },
        {
          label: "Recoveries",
          value: summary.recoveries,
          hint: `Target ~${recoveryTarget}`,
          progress: (summary.recoveries / recoveryTarget) * 100,
        },
        { label: "Emails sent", value: summary.emails_sent },
        ...(!isAdmin && summary.streak != null
          ? [{ label: "Streak", value: `${summary.streak}d`, hint: "Days with ≥1 outreach" }]
          : []),
        { label: "Open / overdue", value: `${summary.open_tasks} / ${summary.overdue_tasks}` },
      ] as Array<{ label: string; value: number | string; hint?: string; progress?: number }>,
    [summary, outreachTarget, recoveryTarget, isAdmin],
  );

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const track = trackRef.current;
      if (!wrap || !track) return;

      if (prefersReducedMotion()) return;

      const gap = 12;
      const children = Array.from(track.children) as HTMLElement[];
      const half = Math.floor(children.length / 2);
      if (half < 1) return;
      const setWidth = children.slice(0, half).reduce((sum, el, i) => {
        return sum + el.getBoundingClientRect().width + (i < half - 1 ? gap : 0);
      }, 0);

      if (setWidth <= wrap.clientWidth + 4) {
        gsap.set(track, { x: 0 });
        return;
      }

      const tween = gsap.fromTo(
        track,
        { x: 0 },
        {
          x: -setWidth - gap,
          duration: Math.max(40, setWidth / 12),
          ease: "none",
          repeat: -1,
        },
      );

      const pause = () => tween.pause();
      const play = () => tween.play();
      wrap.addEventListener("mouseenter", pause);
      wrap.addEventListener("mouseleave", play);
      wrap.addEventListener("focusin", pause);
      wrap.addEventListener("focusout", play);

      return () => {
        wrap.removeEventListener("mouseenter", pause);
        wrap.removeEventListener("mouseleave", play);
        wrap.removeEventListener("focusin", pause);
        wrap.removeEventListener("focusout", play);
        tween.kill();
      };
    },
    { scope: wrapRef, dependencies: [summary, isAdmin] },
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {cardProps.map((c) => (
          <Card key={c.label} {...c} />
        ))}
      </div>
      <div ref={wrapRef} className="overflow-hidden hidden lg:block">
        <div ref={trackRef} className="flex gap-3 items-stretch w-max will-change-transform">
          {cardProps.map((c) => (
            <Card key={`a-${c.label}`} className="w-[200px] shrink-0" {...c} />
          ))}
          {cardProps.map((c) => (
            <Card key={`b-${c.label}`} className="w-[200px] shrink-0" {...c} />
          ))}
        </div>
      </div>
    </>
  );
}
