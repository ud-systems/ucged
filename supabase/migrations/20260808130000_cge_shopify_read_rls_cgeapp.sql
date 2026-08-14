-- Allow CGE users to read Shopify customers/orders in their assigned salesperson scope

CREATE POLICY cge_customers_select ON public.shopify_customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    )
  );

CREATE POLICY cge_orders_select ON public.shopify_orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    )
  );
