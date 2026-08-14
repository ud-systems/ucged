import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCgeFollowups } from "@/hooks/use-cge-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUEUE_SEGMENT_ROUTES, SEGMENT_LABELS, segmentBadgeClass, type CgeSegment } from "@/lib/segments";

export default function FollowUpsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [status, setStatus] = useState("all");
  const [hasOutreach, setHasOutreach] = useState("all");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);

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

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Follow-ups <span className="text-muted-foreground font-normal text-xl ml-1">{total}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Search anyone in your scope and review full follow-up history.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <SelectTrigger className="w-[180px] rounded-xl">
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
          <SelectTrigger className="w-[160px] rounded-xl">
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
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue placeholder="Outreach" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any outreach</SelectItem>
            <SelectItem value="yes">Has outreach</SelectItem>
            <SelectItem value="no">No outreach</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm px-2">
          <Checkbox
            checked={assignedToMe}
            onCheckedChange={(c) => {
              setAssignedToMe(Boolean(c));
              setPage(1);
            }}
          />
          Assigned to me
        </label>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-background/40 z-10 grid place-items-center text-sm text-muted-foreground">Loading…</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Segment</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Owner</th>
                <th className="text-left p-3 font-medium">Last outreach</th>
                <th className="text-right p-3 font-medium">Events</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate(`/customers/${row.customer_id}`)}
                >
                  <td className="p-3">
                    <p className="font-medium">{row.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{row.customer_email || row.customer_phone || "—"}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                      {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                    </Badge>
                  </td>
                  <td className="p-3 capitalize">{row.status.replace("_", " ")}</td>
                  <td className="p-3">{row.ownership_label || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.last_outreach_at ? (
                      <>
                        {new Date(row.last_outreach_at).toLocaleDateString()}
                        {row.last_outreach_channel ? ` · ${row.last_outreach_channel}` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.outreach_count ?? 0}</td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    No follow-ups match these filters.
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
    </div>
  );
}
