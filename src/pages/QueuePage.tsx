import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, RefreshCw, Phone, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCgeDashboardKpis, useCgeQueue, useRefreshCgeTasks, type QueueRow } from "@/hooks/use-cge-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  QUEUE_SEGMENT_ROUTES,
  SEGMENT_LABELS,
  queuePathForSegment,
  segmentBadgeClass,
  slugToSegment,
  type CgeSegment,
} from "@/lib/segments";
import { formatDaysQuiet } from "@/lib/days-quiet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ownerLabel(row: QueueRow) {
  return row.ownership_label || row.sp_assigned || row.referred_by || "—";
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-card)] min-w-[140px]">
      <p className="text-xs text-muted-foreground font-body">{label}</p>
      <p className="font-heading text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export default function QueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { segmentSlug } = useParams<{ segmentSlug?: string }>();
  const segment = slugToSegment(segmentSlug);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [segment]);

  const { data: kpis } = useCgeDashboardKpis(user?.id);
  const { data, isLoading, isFetching } = useCgeQueue({
    viewerUserId: user?.id,
    segment,
    search,
    tab,
    page,
    pageSize: 25,
  });
  const refresh = useRefreshCgeTasks();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 25));

  const allChecked = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.id)), [rows, selected]);

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Queue <span className="text-muted-foreground font-normal text-xl ml-1">{total}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Human follow-ups for customers quiet 90+ days (plus assigned never-purchased).</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={refresh.isPending}
          onClick={async () => {
            try {
              await refresh.mutateAsync();
              toast.success("Queue refreshed from Shopify customers");
            } catch (e: any) {
              toast.error(e.message || "Refresh failed");
            }
          }}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refresh.isPending && "animate-spin")} />
          Refresh tasks
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <Kpi label="Open tasks" value={kpis?.open_tasks ?? "—"} />
        <Kpi label="VIP inactive" value={kpis?.vip_inactive ?? "—"} />
        <Kpi label="One-time lapsed" value={kpis?.one_time_lapsed ?? "—"} />
        <Kpi label="Lapsed repeat" value={kpis?.lapsed_repeat ?? "—"} />
        <Kpi label="Never purchased" value={kpis?.never_purchased ?? "—"} />
        <Kpi label="Recovered orders" value={kpis?.recovered_orders ?? "—"} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList className="bg-transparent gap-1 h-auto p-0 flex flex-wrap justify-start">
          {[
            ["all", "All"],
            ["assigned_to_me", "Assigned to me"],
            ["overdue", "Overdue"],
            ["vip", "Hot / VIP"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-xl bg-card"
            placeholder="Search customer, email, phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUEUE_SEGMENT_ROUTES.map((item) => (
            <button
              key={item.segment}
              type="button"
              onClick={() => {
                setPage(1);
                setSelected(new Set());
                navigate(queuePathForSegment(item.segment));
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs border transition-colors",
                segment === item.segment
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-card)] relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-background/40 z-10 grid place-items-center text-sm text-muted-foreground">Loading…</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="w-10 p-3">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(checked) => {
                      if (checked) setSelected(new Set(rows.map((r) => r.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Salesperson</th>
                <th className="text-left p-3 font-medium">RFM</th>
                <th className="text-right p-3 font-medium">Days quiet</th>
                <th className="text-right p-3 font-medium">Priority</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                const tel = row.customer_phone?.replace(/\s+/g, "") || "";
                const wa = tel.replace(/^\+/, "");
                return (
                  <tr
                    key={row.id}
                    className={cn("border-t cursor-pointer hover:bg-accent/40", isSelected && "bg-primary/10")}
                    onClick={() => navigate(`/customers/${row.customer_id}`)}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="p-3 font-medium">{row.customer_name}</td>
                    <td className="p-3 text-muted-foreground">{row.customer_email || "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                        {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                      </Badge>
                    </td>
                    <td className="p-3">{ownerLabel(row)}</td>
                    <td className="p-3 text-muted-foreground">{row.rfm_group || row.customer_rfm_group || "—"}</td>
                    <td className="p-3 text-right tabular-nums">
                      {formatDaysQuiet(row.customer_recency_days, row.recency_days)}
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex gap-0.5" title={`Priority ${row.priority}`}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "w-1 h-3 rounded-sm",
                              i < Math.max(1, 11 - Math.ceil(row.priority / 10)) ? "bg-primary" : "bg-muted",
                            )}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild disabled={!tel} title="Call">
                          <a href={tel ? `tel:${tel}` : undefined}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild disabled={!wa} title="WhatsApp">
                          <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer">
                            <WhatsAppIcon className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Open customer">
                          <Link to={`/customers/${row.customer_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-muted-foreground">
                    No customers in this queue yet. Sync Shopify data, link CGEs to salespersons, then refresh tasks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 rounded-full bg-foreground text-background px-5 py-3 shadow-[var(--shadow-float)] flex items-center gap-4 text-sm">
          <span>Selected: {selected.size}</span>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              const first = rows.find((r) => selected.has(r.id));
              if (first) navigate(`/customers/${first.customer_id}`);
            }}
          >
            Open customer
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full text-background hover:text-background" onClick={() => setSelected(new Set())}>
            Discard
          </Button>
        </div>
      )}
    </div>
  );
}
