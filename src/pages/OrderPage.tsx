import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useOrderDetail } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOrderDetail(orderId);
  const order = data?.order;
  const items = data?.items ?? [];

  if (isLoading) {
    return <div className="p-6 lg:p-8 text-muted-foreground">Loading order…</div>;
  }
  if (!order) {
    return (
      <div className="p-6 lg:p-8 space-y-3">
        <p>Order not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 w-full max-w-none">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          {order.customer_id ? (
            <Link to={`/customers/${order.customer_id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Customer
            </Link>
          ) : (
            <Link to="/queue">
              <ArrowLeft className="h-4 w-4 mr-1" /> Queue
            </Link>
          )}
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold">{order.order_number || "Order"}</h1>
          <Badge variant="outline" className="capitalize">
            {order.financial_status || "—"}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {order.fulfillment_status || "—"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {order.customer_name || "Customer"} · {order.email || "No email"} ·{" "}
          {order.shopify_created_at ? new Date(order.shopify_created_at).toLocaleString() : "—"}
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {(
          [
            ["Total", order.current_total ?? order.total ?? 0],
            ["Original", order.original_total ?? order.total ?? 0],
            ["Subtotal", order.subtotal ?? 0],
            ["Tax", order.total_tax ?? 0],
          ] as const
        ).map(([label, amount]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">
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

      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Variant</th>
              <th className="text-left p-3">SKU</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.product}</td>
                <td className="p-3 text-muted-foreground">{item.variant || "—"}</td>
                <td className="p-3 text-muted-foreground">{item.sku || "—"}</td>
                <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                <td className="p-3 text-right tabular-nums">
                  {formatMoney(item.price, order.currency_code)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No line items on file for this order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
