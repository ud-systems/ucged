import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, RefreshCw, Phone, ExternalLink } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
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
import { prefersReducedMotion } from "@/lib/motion";
import { toast } from "sonner";
import {
  CountUpValue,
  DataTableShell,
  FilterBar,
  PageFrame,
  PageHeader,
  PagePagination,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";
import { useStaggerIn } from "@/hooks/use-stagger-in";

gsap.registerPlugin(useGSAP);

function ownerLabel(row: QueueRow) {
  return row.ownership_label || row.sp_assigned || row.referred_by || "—";
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-card)] min-w-0 lg:flex-1">
      <p className="text-xs text-muted-foreground font-body truncate">{label}</p>
      <p className="font-heading text-2xl font-semibold mt-1">
        {typeof value === "number" ? <CountUpValue value={value} /> : value}
      </p>
    </div>
  );
}

function QueueActions({ tel, wa, customerId }: { tel: string; wa: string; customerId: string }) {
  return (
    <div className="flex justify-end gap-1">
      <Button size="icon" variant="ghost" className="size-11 md:size-8" asChild disabled={!tel} title="Call">
        <a href={tel ? `tel:${tel}` : undefined}>
          <Phone />
        </a>
      </Button>
      <Button size="icon" variant="ghost" className="size-11 md:size-8" asChild disabled={!wa} title="WhatsApp">
        <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer">
          <WhatsAppIcon />
        </a>
      </Button>
      <Button size="icon" variant="ghost" className="size-11 md:size-8" asChild title="Open customer">
        <Link to={`/customers/${customerId}`}>
          <ExternalLink />
        </Link>
      </Button>
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
  const listRef = useRef<HTMLDivElement>(null);
  const bulkRef = useRef<HTMLDivElement>(null);

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

  useStaggerIn(listRef, "[data-stagger-item]", [rows, page, tab, segment]);

  useGSAP(
    () => {
      const el = bulkRef.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
        return;
      }
      gsap.from(el, { autoAlpha: 0, y: 24, duration: 0.35, ease: "power3.out", clearProps: "transform" });
    },
    { dependencies: [selected.size > 0] },
  );

  return (
    <PageFrame>
      <PageHeader
        title="Queue"
        count={total}
        description="Human follow-ups for customers quiet 90+ days (plus assigned never-purchased)."
        actions={
          <Button
            variant="outline"
            className="rounded-xl w-full sm:w-auto"
            disabled={refresh.isPending}
            onClick={async () => {
              try {
                await refresh.mutateAsync();
                toast.success("Queue refreshed from Shopify customers");
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "Refresh failed");
              }
            }}
          >
            <RefreshCw className={cn(refresh.isPending && "animate-spin")} data-icon="inline-start" />
            Refresh tasks
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-3">
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
        <TabsList className="bg-transparent gap-1 h-auto p-0 flex w-full overflow-x-auto justify-start">
          {[
            ["all", "All"],
            ["assigned_to_me", "Assigned to me"],
            ["overdue", "Overdue"],
            ["vip", "Hot / VIP"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 shrink-0"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FilterBar>
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
                "px-3 py-1.5 rounded-full text-xs border motion-safe:transition-colors",
                segment === item.segment
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </FilterBar>

      <div ref={listRef} className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => {
            const isSelected = selected.has(row.id);
            const tel = row.customer_phone?.replace(/\s+/g, "") || "";
            const wa = tel.replace(/^\+/, "");
            return (
              <RecordCard
                key={row.id}
                className={cn(isSelected && "ring-1 ring-primary/40 bg-primary/5")}
                onClick={() => navigate(`/customers/${row.customer_id}`)}
              >
                <div className="flex items-start gap-3">
                  <div onClick={(e) => e.stopPropagation()} className="pt-1">
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
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{row.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.customer_email || "—"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                        {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDaysQuiet(row.customer_recency_days, row.recency_days)} quiet
                      </span>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <QueueActions tel={tel} wa={wa} customerId={row.customer_id} />
                  </div>
                </div>
              </RecordCard>
            );
          })}
          {!isLoading && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No customers in this queue yet. Sync Shopify data, link CGEs to salespersons, then refresh tasks.
            </p>
          )}
        </div>

        <DataTableShell loading={isLoading || isFetching} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(checked) => {
                      if (checked) setSelected(new Set(rows.map((r) => r.id)));
                      else setSelected(new Set());
                    }}
                  />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead className="hidden lg:table-cell">RFM</TableHead>
                <TableHead className="text-right">Days quiet</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Priority</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                const tel = row.customer_phone?.replace(/\s+/g, "") || "";
                const wa = tel.replace(/^\+/, "");
                return (
                  <TableRow
                    key={row.id}
                    data-stagger-item
                    className={cn("cursor-pointer", isSelected && "bg-primary/10")}
                    onClick={() => navigate(`/customers/${row.customer_id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    </TableCell>
                    <TableCell className="font-medium max-w-[12rem] truncate">{row.customer_name}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[14rem] truncate">
                      {row.customer_email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                        {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">{ownerLabel(row)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {row.rfm_group || row.customer_rfm_group || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDaysQuiet(row.customer_recency_days, row.recency_days)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
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
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <QueueActions tel={tel} wa={wa} customerId={row.customer_id} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="p-10 text-center text-muted-foreground">
                    No customers in this queue yet. Sync Shopify data, link CGEs to salespersons, then refresh tasks.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <PagePagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {selected.size > 0 && (
        <div
          ref={bulkRef}
          className="fixed z-20 inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6 rounded-2xl md:rounded-full bg-foreground text-background px-5 py-3 shadow-[var(--shadow-float)] flex flex-wrap items-center justify-center gap-3 text-sm max-w-full"
        >
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
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-background hover:text-background"
            onClick={() => setSelected(new Set())}
          >
            Discard
          </Button>
        </div>
      )}
    </PageFrame>
  );
}
