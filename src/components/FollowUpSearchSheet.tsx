import { useEffect, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CustomerFollowUpPanel } from "@/components/CustomerDetailSheet";
import { useAuth } from "@/contexts/AuthContext";
import { type FollowUpRow, useCgeFollowups } from "@/hooks/use-cge-data";
import { SEGMENT_LABELS, segmentBadgeClass, type CgeSegment } from "@/lib/segments";

const PAGE_SIZE = 20;

export function FollowUpSearchSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FollowUpRow | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
      setSelected(null);
    }
  }, [open]);

  const { data, isLoading, isFetching } = useCgeFollowups({
    viewerUserId: user?.id,
    search,
    status: "all",
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg h-full flex flex-col overflow-hidden gap-0">
        <SheetHeader className="text-left space-y-1 shrink-0 pr-8">
          {selected ? (
            <div className="flex items-center gap-1 -ml-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setSelected(null)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          ) : null}
          <SheetTitle className="font-heading text-xl">
            {selected ? "Follow up" : "Find a customer"}
          </SheetTitle>
          {!selected && (
            <p className="text-sm text-muted-foreground font-normal">
              Search anyone in your scope, then continue with a quick follow-up.
            </p>
          )}
        </SheetHeader>

        {selected ? (
          <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
            <CustomerFollowUpPanel row={selected} onOpenFullCustomer={() => onOpenChange(false)} />
          </div>
        ) : (
          <div className="mt-4 flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 rounded-xl"
                placeholder="Search name, email, phone, SP…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                autoFocus
              />
            </div>

            <div className="relative flex-1 min-h-0 overflow-y-auto">
              {(isLoading || isFetching) && (
                <div className="absolute inset-0 bg-background/40 z-10 grid place-items-center text-sm text-muted-foreground">
                  Loading…
                </div>
              )}
              <ul className="space-y-1 pb-1">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="w-full text-left rounded-xl border px-3 py-2.5 hover:bg-accent/40 transition-colors"
                      onClick={() => setSelected(row)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{row.customer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {row.customer_email || row.customer_phone || "No contact"}
                          </p>
                        </div>
                        <Badge variant="outline" className={segmentBadgeClass(row.segment)}>
                          {SEGMENT_LABELS[row.segment as CgeSegment] || row.segment}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
                {!isLoading && rows.length === 0 && (
                  <li className="py-10 text-center text-sm text-muted-foreground">
                    No customers match that search.
                  </li>
                )}
              </ul>
            </div>

            {total > PAGE_SIZE && (
              <div className="shrink-0 flex items-center justify-between gap-2 pt-3 border-t bg-background">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
