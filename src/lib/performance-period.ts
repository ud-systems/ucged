export type PeriodKey = "today" | "week" | "month" | "custom";

export type PeriodRange = {
  key: PeriodKey;
  from: Date;
  to: Date;
  label: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Exclusive end bound for SQL: [from, to) */
export function resolvePeriod(
  key: PeriodKey,
  customFrom?: string,
  customTo?: string,
): PeriodRange {
  const now = new Date();
  const today = startOfDay(now);

  if (key === "today") {
    return { key, from: today, to: addDays(today, 1), label: "Today" };
  }
  if (key === "week") {
    const day = today.getDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = addDays(today, mondayOffset);
    return { key, from, to: addDays(today, 1), label: "This week" };
  }
  if (key === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { key, from, to: addDays(today, 1), label: "This month" };
  }

  const from = customFrom ? startOfDay(new Date(customFrom)) : addDays(today, -6);
  let to = customTo ? startOfDay(new Date(customTo)) : today;
  to = addDays(to, 1);
  if (to <= from) to = addDays(from, 1);
  return {
    key: "custom",
    from,
    to,
    label: `${from.toLocaleDateString()} – ${addDays(to, -1).toLocaleDateString()}`,
  };
}

export function toIso(d: Date) {
  return d.toISOString();
}

/** Days in period for target scaling */
export function periodDayCount(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
}
