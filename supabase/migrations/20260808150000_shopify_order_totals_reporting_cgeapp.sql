-- Columns required by shopify-sync / webhook order upserts (from uddash money + reporting fields)

ALTER TABLE public.shopify_orders
  ADD COLUMN IF NOT EXISTS original_total NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS current_total NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS reporting_line_items_gross NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS reporting_total_discounts NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS reporting_total_shipping NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS reporting_total_refunded NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS reporting_original_total_discounts NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS taxes_included BOOLEAN;

COMMENT ON COLUMN public.shopify_orders.original_total IS 'Best-effort original order total before refunds settle';
COMMENT ON COLUMN public.shopify_orders.current_total IS 'Shopify currentTotalPriceSet amount';
COMMENT ON COLUMN public.shopify_orders.reporting_line_items_gross IS 'Gross line items for reporting breakdown';
COMMENT ON COLUMN public.shopify_orders.reporting_total_discounts IS 'Total discounts for reporting breakdown';
COMMENT ON COLUMN public.shopify_orders.reporting_total_shipping IS 'Shipping total for reporting breakdown';
COMMENT ON COLUMN public.shopify_orders.reporting_total_refunded IS 'Refunded total for reporting breakdown';
COMMENT ON COLUMN public.shopify_orders.taxes_included IS 'Shopify taxesIncluded flag';
