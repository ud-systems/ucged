import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCgePerformanceDrilldown } from "@/hooks/use-cge-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DrilldownSheet({
  open,
  onOpenChange,
  viewerUserId,
  cgeUserId,
  cgeName,
  from,
  to,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  viewerUserId?: string;
  cgeUserId: string | null;
  cgeName?: string;
  from?: string;
  to?: string;
}) {
  const { data, isLoading } = useCgePerformanceDrilldown({
    viewerUserId,
    cgeUserId,
    from,
    to,
    enabled: open && Boolean(cgeUserId),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto max-h-dvh">
        <SheetHeader>
          <SheetTitle className="font-heading">{data?.display_name || cgeName || "CGE"}</SheetTitle>
          <SheetDescription>Follow-ups and recoveries in the selected period</SheetDescription>
        </SheetHeader>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && data && (
          <Tabs defaultValue="outreach" className="mt-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="outreach">Outreach ({data.outreach_total})</TabsTrigger>
              <TabsTrigger value="recoveries">Recoveries ({data.recoveries.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="outreach" className="mt-3 flex flex-col gap-2">
              {data.outreach.map((ev) => (
                <div key={ev.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <Link to={`/customers/${ev.customer_id}`} className="font-medium hover:underline truncate min-w-0">
                      {ev.customer_name || "Customer"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="outline" className="capitalize">
                      {ev.channel}
                    </Badge>
                    {ev.outcome && (
                      <Badge variant="secondary" className="capitalize">
                        {ev.outcome.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  {ev.notes && <p className="mt-2 text-muted-foreground">{ev.notes}</p>}
                </div>
              ))}
              {data.outreach.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No outreach in this period.</p>
              )}
            </TabsContent>

            <TabsContent value="recoveries" className="mt-3 flex flex-col gap-2">
              {data.recoveries.map((r) => (
                <div key={r.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <Link to={`/customers/${r.customer_id}`} className="font-medium hover:underline truncate min-w-0">
                      {r.customer_name || "Customer"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {r.recovered_at ? new Date(r.recovered_at).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="outline">{r.segment}</Badge>
                    {r.recovered_order_id && (
                      <Link to={`/orders/${r.recovered_order_id}`} className="text-xs text-primary hover:underline">
                        {r.order_number || "Order"}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {data.recoveries.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No recoveries in this period.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
