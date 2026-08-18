import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Mail, Phone, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useCustomerOpenTask, useOrderDetail } from "@/hooks/use-cge-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import { smsHref, whatsappHref } from "@/lib/phone";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CustomerCallSheet } from "@/components/CustomerCallSheet";
import { CustomerEmailComposeSheet } from "@/components/CustomerEmailComposeSheet";
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
  const customerPhone = data?.customer_phone ?? null;
  const { data: openTask } = useCustomerOpenTask(order?.customer_id ?? undefined);
  const [callOpen, setCallOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

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
      <div data-page-header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 min-w-0">
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

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            className="justify-between rounded-xl border-0 bg-neutral-800 text-white hover:bg-neutral-900"
            disabled={!order.customer_id}
            onClick={() => setCallOpen(true)}
          >
            Call
            <Phone data-icon="inline-end" />
          </Button>
          <Button
            type="button"
            className="justify-between rounded-xl border-0 bg-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
            disabled={!order.customer_id || !order.email}
            onClick={() => setEmailOpen(true)}
          >
            Email
            <Mail data-icon="inline-end" />
          </Button>
          <Button
            type="button"
            className="justify-between rounded-xl border-0 bg-[#25D366] text-white hover:bg-[#1EBE5A]"
            onClick={() => {
              const href = whatsappHref(customerPhone);
              if (!href) {
                toast.error("No phone number on file");
                return;
              }
              window.open(href, "_blank", "noopener,noreferrer");
            }}
          >
            WhatsApp
            <WhatsAppIcon data-icon="inline-end" />
          </Button>
          <Button
            type="button"
            className="justify-between rounded-xl border-0 bg-neutral-500 text-white hover:bg-neutral-600"
            onClick={() => {
              const href = smsHref(customerPhone);
              if (!href) {
                toast.error("No phone number on file");
                return;
              }
              window.location.href = href;
            }}
          >
            SMS
            <Smartphone data-icon="inline-end" />
          </Button>
        </div>
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

      {order.customer_id && (
        <>
          <CustomerCallSheet
            open={callOpen}
            onOpenChange={setCallOpen}
            customerId={order.customer_id}
            taskId={openTask?.id}
            customerName={order.customer_name}
            phone={customerPhone || ""}
            scheduledCallAt={openTask?.scheduled_call_at}
          />
          <CustomerEmailComposeSheet
            open={emailOpen}
            onOpenChange={setEmailOpen}
            customerId={order.customer_id}
            taskId={openTask?.id}
            customerName={order.customer_name}
            customerEmail={order.email}
          />
        </>
      )}
    </PageFrame>
  );
}
