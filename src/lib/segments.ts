export type CgeSegment = "one_time_lapsed" | "lapsed_repeat" | "vip_inactive" | "never_purchased";

export const SEGMENT_LABELS: Record<CgeSegment | "all", string> = {
  all: "All",
  vip_inactive: "VIP inactive",
  one_time_lapsed: "One-time lapsed",
  lapsed_repeat: "Lapsed repeat",
  never_purchased: "Never purchased",
};

/** URL slug ↔ RPC segment value */
export const QUEUE_SEGMENT_ROUTES: { slug: string; segment: CgeSegment | "all"; label: string }[] = [
  { slug: "", segment: "all", label: "All" },
  { slug: "vip-inactive", segment: "vip_inactive", label: "VIP inactive" },
  { slug: "one-time-lapsed", segment: "one_time_lapsed", label: "One-time lapsed" },
  { slug: "lapsed-repeat", segment: "lapsed_repeat", label: "Lapsed repeat" },
  { slug: "never-purchased", segment: "never_purchased", label: "Never purchased" },
];

export function segmentToSlug(segment: string): string {
  const hit = QUEUE_SEGMENT_ROUTES.find((r) => r.segment === segment);
  return hit?.slug ?? "";
}

export function slugToSegment(slug?: string): CgeSegment | "all" {
  if (!slug) return "all";
  const hit = QUEUE_SEGMENT_ROUTES.find((r) => r.slug === slug);
  return hit?.segment ?? "all";
}

export function queuePathForSegment(segment: string): string {
  const slug = segmentToSlug(segment);
  return slug ? `/queue/${slug}` : "/queue";
}

export function segmentBadgeClass(segment: string): string {
  switch (segment) {
    case "vip_inactive":
      return "border-primary/40 bg-primary/10 text-primary";
    case "one_time_lapsed":
      return "border-slate-800 bg-slate-900 text-white";
    case "lapsed_repeat":
      return "border-slate-300 bg-white text-slate-700";
    case "never_purchased":
      return "border-sky-300 bg-sky-50 text-sky-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}
