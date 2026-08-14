import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCgeOrdersBrowse } from "@/hooks/use-cge-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-money";

export default function OrdersBrowsePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useCgeOrdersBrowse({
    viewerUserId: user?.id,
    search,
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
          Orders <span className="text-muted-foreground font-normal text-xl ml-1">{total}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and search orders without opening a customer first.</p>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 rounded-xl bg-card"
          placeholder="Search order #, customer, email, SP…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-background/40 z-10 grid place-items-center text-sm text-muted-foreground">Loading…</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3 font-medium">Order</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Salesperson</th>
                <th className="text-left p-3 font-medium">Financial</th>
                <th className="text-left p-3 font-medium">Fulfillment</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate(`/orders/${row.id}`)}
                >
                  <td className="p-3 font-medium">{row.order_number || row.id.slice(0, 8)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row.customer_id) navigate(`/customers/${row.customer_id}`);
                      }}
                    >
                      {row.customer_name || "—"}
                    </button>
                    <p className="text-xs text-muted-foreground">{row.email || ""}</p>
                  </td>
                  <td className="p-3">{row.ownership_label || "—"}</td>
                  <td className="p-3 capitalize text-muted-foreground">{row.financial_status || "—"}</td>
                  <td className="p-3 capitalize text-muted-foreground">{row.fulfillment_status || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.shopify_created_at ? new Date(row.shopify_created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums font-medium">
                    {formatMoney(row.current_total ?? row.total ?? 0, row.currency_code)}
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    No orders found.
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
