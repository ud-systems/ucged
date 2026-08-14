import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCgeFollowups } from "@/hooks/use-cge-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUEUE_SEGMENT_ROUTES, SEGMENT_LABELS, segmentBadgeClass, type CgeSegment } from "@/lib/segments";
import {
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

export default function FollowUpsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [status, setStatus] = useState("all");
  const [hasOutreach, setHasOutreach] = useState("all");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useCgeFollowups({
    viewerUserId: user?.id,
    search,
    segment,
    status,
    hasOutreach,
    assignedToMe,
    page,
    pageSize: 25,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 25));

  useStaggerIn(listRef, "[data-stagger-item]", [rows, page, segment, status, hasOutreach, assignedToMe]);

  return (
    <PageFrame>
      <PageHeader
        title="Follow-ups"
        count={total}
        description="Search anyone in your scope and review full follow-up history."
      />

      <FilterBar>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-xl bg-card"
            placeholder="Search name, email, phone, SP…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={segment}
          onValueChange={(v) => {
            setSegment(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            {QUEUE_SEGMENT_ROUTES.map((s) => (
              <SelectItem key={s.segment} value={s.segment}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="recovered">Recovered</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={hasOutreach}
          onValueChange={(v) => {
            setHasOutreach(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
            <SelectValue placeholder="Outreach" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any outreach</SelectItem>
            <SelectItem value="yes">Has outreach</SelectItem>
            <SelectItem value="no">No outreach</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm px-1 min-h-10">
          <Checkbox
            checked={assignedToMe}
            onCheckedChange={(c) => {
              setAssignedToMe(Boolean(c));
              setPage(1);
            }}
          />
          Assigned to me
        </label>
      </FilterBar>

      <div ref={listRef} className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => (
            <RecordCard key={row.id} onClick={() => navigate(`/customers/${row.customer_id}`)}>
              <p className="font-medium truncate">{row.customer_name}</p>
              <p className="text-xs text-muted-foreground truncate">{row.customer_email || row.customer_phone || "—"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                  {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                </Badge>
                <span className="text-xs capitalize text-muted-foreground">{row.status.replace("_", " ")}</span>
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">{row.outreach_count ?? 0} events</span>
              </div>
            </RecordCard>
          ))}
          {!isLoading && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">No follow-ups match these filters.</p>
          )}
        </div>

        <DataTableShell loading={isLoading || isFetching} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead className="hidden lg:table-cell">Last outreach</TableHead>
                <TableHead className="text-right">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-stagger-item
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${row.customer_id}`)}
                >
                  <TableCell>
                    <p className="font-medium truncate max-w-[14rem]">{row.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[14rem]">
                      {row.customer_email || row.customer_phone || "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                      {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{row.status.replace("_", " ")}</TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-[10rem]">{row.ownership_label || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {row.last_outreach_at ? (
                      <>
                        {new Date(row.last_outreach_at).toLocaleDateString()}
                        {row.last_outreach_channel ? ` · ${row.last_outreach_channel}` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.outreach_count ?? 0}</TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-10 text-center text-muted-foreground">
                    No follow-ups match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      <PagePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </PageFrame>
  );
}
