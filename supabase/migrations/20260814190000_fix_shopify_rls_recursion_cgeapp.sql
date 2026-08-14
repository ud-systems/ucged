-- shopify_orders SELECT 500: cge_orders_select reads shopify_customers, and
-- cge_customers_select reads shopify_customers again → infinite RLS recursion.
-- Move related-account matching into SECURITY DEFINER helpers (bypass RLS).

CREATE OR REPLACE FUNCTION public.cge_customer_in_related_scope(_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shopify_customers target
    INNER JOIN public.shopify_customers scoped
      ON scoped.id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    WHERE target.id = _customer_id
      AND (
        (
          length(regexp_replace(coalesce(scoped.phone, ''), '\D', '', 'g')) >= 8
          AND regexp_replace(coalesce(target.phone, ''), '\D', '', 'g')
            = regexp_replace(coalesce(scoped.phone, ''), '\D', '', 'g')
        )
        OR (
          position('@' IN lower(btrim(coalesce(scoped.email, '')))) > 1
          AND length(split_part(lower(btrim(scoped.email)), '@', 1)) >= 4
          AND lower(btrim(coalesce(target.email, '')))
            LIKE (split_part(lower(btrim(scoped.email)), '@', 1) || '@%')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.cge_order_in_related_scope(
  _customer_id UUID,
  _shopify_customer_id TEXT,
  _email TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shopify_customers c
    WHERE c.id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
      AND (
        (
          c.shopify_customer_id IS NOT NULL
          AND _shopify_customer_id = c.shopify_customer_id
        )
        OR (
          position('@' IN lower(btrim(coalesce(c.email, '')))) > 1
          AND length(split_part(lower(btrim(c.email)), '@', 1)) >= 4
          AND lower(btrim(coalesce(_email, '')))
            LIKE (split_part(lower(btrim(c.email)), '@', 1) || '@%')
        )
        OR (
          length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 8
          AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
            = regexp_replace(coalesce(
                (SELECT sc.phone FROM public.shopify_customers sc WHERE sc.id = _customer_id),
                ''
              ), '\D', '', 'g')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.cge_customer_in_related_scope(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cge_order_in_related_scope(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cge_customer_in_related_scope(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cge_order_in_related_scope(UUID, TEXT, TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS cge_orders_select ON public.shopify_orders;
CREATE POLICY cge_orders_select ON public.shopify_orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND (
        customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR public.cge_order_in_related_scope(customer_id, shopify_customer_id, email)
      )
    )
  );

DROP POLICY IF EXISTS cge_customers_select ON public.shopify_customers;
CREATE POLICY cge_customers_select ON public.shopify_customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND (
        id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR public.cge_customer_in_related_scope(id)
      )
    )
  );
