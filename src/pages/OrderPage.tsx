import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useOrderDetail } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import {
  DataTableShell,
  PageFrame,
  RecordCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/layout";

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOrderDetail(orderId);
  const order = data?.order;
  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <PageFrame>
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </PageFrame>
    );
  }
  if (!order) {
    return (
      <PageFrame>
        <p>Order not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </PageFrame>
    );
  }

  return (
    <PageFrame className="w-full max-w-none">
      <div data-page-header className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          {order.customer_id ? (
            <Link to={`/customers/${order.customer_id}`}>
              <ArrowLeft data-icon="inline-start" /> Customer
            </Link>
          ) : (
            <Link to="/queue">
              <ArrowLeft data-icon="inline-start" /> Queue
            </Link>
          )}
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">{order.order_number || "Order"}</h1>
          <StatusBadge value={order.financial_status} />
          <StatusBadge value={order.fulfillment_status} />
        </div>
        <p className="text-sm text-muted-foreground break-all">
          {order.customer_name || "Customer"} · {order.email || "No email"} ·{" "}
          {order.shopify_created_at ? new Date(order.shopify_created_at).toLocaleString() : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["Total", order.current_total ?? order.total ?? 0],
            ["Original", order.original_total ?? order.total ?? 0],
            ["Subtotal", order.subtotal ?? 0],
            ["Tax", order.total_tax ?? 0],
          ] as const
        ).map(([label, amount]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-heading text-lg sm:text-xl font-semibold tabular-nums truncate">
              {formatMoney(amount, order.currency_code)}
            </p>
          </div>
        ))}
      </div>

      {(order.shipping_address1 || order.shipping_city) && (
        <div className="rounded-2xl border bg-card p-4 text-sm">
          <p className="font-medium mb-1">Shipping</p>
          <p>{order.shipping_name}</p>
          <p className="text-muted-foreground">
            {[order.shipping_address1, order.shipping_address2, order.shipping_city, order.shipping_province, order.shipping_zip, order.shipping_country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}

      {order.order_note && (
        <div className="rounded-2xl border bg-card p-4 text-sm">
          <p className="font-medium mb-1">Note</p>
          <p className="text-muted-foreground">{order.order_note}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 md:gap-0">
        <div className="flex flex-col gap-3 md:hidden">
          {items.map((item) => (
            <RecordCard key={item.id}>
              <p className="font-medium truncate">{item.product}</p>
              <p className="text-xs text-muted-foreground truncate">{item.variant || "—"} · {item.sku || "No SKU"}</p>
              <div className="flex justify-between mt-2 text-sm">
                <span>Qty {item.quantity}</span>
                <span className="tabular-nums font-medium">{formatMoney(item.price, order.currency_code)}</span>
              </div>
            </RecordCard>
          ))}
          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No line items on file for this order.</p>
          )}
        </div>
        <DataTableShell className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden lg:table-cell">Variant</TableHead>
                <TableHead className="hidden lg:table-cell">SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-stagger-item>
                  <TableCell className="font-medium max-w-[16rem] truncate">{item.product}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{item.variant || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{item.sku || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(item.price, order.currency_code)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-6 text-center text-muted-foreground">
                    No line items on file for this order.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </PageFrame>
  );
}
