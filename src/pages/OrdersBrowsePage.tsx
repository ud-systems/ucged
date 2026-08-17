import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCgeOrdersBrowse } from "@/hooks/use-cge-data";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format-money";
import {
  DataTableShell,
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
import { StatusBadge } from "@/components/StatusBadge";
import { useStaggerIn } from "@/hooks/use-stagger-in";

export default function OrdersBrowsePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useCgeOrdersBrowse({
    viewerUserId: user?.id,
    search,
    page,
    pageSize: 25,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 25));

  useStaggerIn(listRef, "[data-stagger-item]", [rows, page, search]);

  return (
    <PageFrame>
      <PageHeader
        title="Orders"
        count={total}
        description="Browse and search orders without opening a customer first."
      />

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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

      <div ref={listRef} className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => (
            <RecordCard key={row.id} onClick={() => navigate(`/orders/${row.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{row.order_number || row.id.slice(0, 8)}</p>
                  <button
                    type="button"
                    className="text-sm text-left hover:underline truncate max-w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (row.customer_id) navigate(`/customers/${row.customer_id}`);
                    }}
                  >
                    {row.customer_name || "—"}
                  </button>
                  <p className="text-xs text-muted-foreground truncate">{row.email || ""}</p>
                </div>
                <p className="font-medium tabular-nums shrink-0">
                  {formatMoney(row.current_total ?? row.total ?? 0, row.currency_code)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <StatusBadge value={row.financial_status} />
                <StatusBadge value={row.fulfillment_status} />
                {row.shopify_created_at ? (
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.shopify_created_at).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </RecordCard>
          ))}
          {!isLoading && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">No orders found.</p>
          )}
        </div>

        <DataTableShell loading={isLoading || isFetching} className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Salesperson</TableHead>
                <TableHead>Financial</TableHead>
                <TableHead className="hidden lg:table-cell">Fulfillment</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-stagger-item
                  className="cursor-pointer"
                  onClick={() => navigate(`/orders/${row.id}`)}
                >
                  <TableCell className="font-medium">{row.order_number || row.id.slice(0, 8)}</TableCell>
                  <TableCell className="min-w-0">
                    <button
                      type="button"
                      className="text-left hover:underline truncate max-w-[14rem]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row.customer_id) navigate(`/customers/${row.customer_id}`);
                      }}
                    >
                      {row.customer_name || "—"}
                    </button>
                    <p className="text-xs text-muted-foreground truncate max-w-[14rem]">{row.email || ""}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-[10rem]">
                    {row.ownership_label || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.financial_status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <StatusBadge value={row.fulfillment_status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {row.shopify_created_at ? new Date(row.shopify_created_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(row.current_total ?? row.total ?? 0, row.currency_code)}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-10 text-center text-muted-foreground">
                    No orders found.
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
