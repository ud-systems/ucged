-- Resolve customer orders including related Shopify customer accounts
-- (duplicate profiles with typo emails / shared phone) so CGE can show spend history.

CREATE OR REPLACE FUNCTION public.get_cge_customer_orders(
  _customer_id UUID,
  _limit INTEGER DEFAULT 50
)
RETURNS TABLE (row_data JSONB)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_email_local TEXT;
  v_phone_digits TEXT;
  v_shopify_customer_id TEXT;
BEGIN
  IF _customer_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND _customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    )
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT
    nullif(lower(btrim(c.email)), ''),
    nullif(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), ''),
    c.shopify_customer_id
  INTO v_email, v_phone_digits, v_shopify_customer_id
  FROM public.shopify_customers c
  WHERE c.id = _customer_id;

  IF v_email IS NOT NULL AND position('@' in v_email) > 1 THEN
    v_email_local := split_part(v_email, '@', 1);
  END IF;

  RETURN QUERY
  WITH related AS (
    SELECT c.id
    FROM public.shopify_customers c
    WHERE c.id = _customer_id
       OR (
         v_shopify_customer_id IS NOT NULL
         AND c.shopify_customer_id = v_shopify_customer_id
       )
       OR (
         v_phone_digits IS NOT NULL
         AND length(v_phone_digits) >= 8
         AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = v_phone_digits
       )
       OR (
         v_email IS NOT NULL
         AND lower(btrim(coalesce(c.email, ''))) = v_email
       )
       OR (
         v_email_local IS NOT NULL
         AND length(v_email_local) >= 4
         AND lower(btrim(coalesce(c.email, ''))) LIKE (v_email_local || '@%')
       )
  ),
  scoped AS (
    SELECT DISTINCT ON (o.id)
      o.id,
      o.order_number,
      o.total,
      o.current_total,
      o.original_total,
      o.financial_status,
      o.fulfillment_status,
      o.shopify_created_at,
      o.processed_at,
      o.currency_code,
      o.customer_id,
      o.shopify_customer_id,
      o.email,
      (o.customer_id IS DISTINCT FROM _customer_id) AS from_related_account
    FROM public.shopify_orders o
    WHERE o.customer_id IN (SELECT id FROM related)
       OR (
         v_shopify_customer_id IS NOT NULL
         AND o.shopify_customer_id = v_shopify_customer_id
       )
       OR (
         v_email IS NOT NULL
         AND lower(btrim(coalesce(o.email, ''))) = v_email
       )
       OR (
         v_email_local IS NOT NULL
         AND length(v_email_local) >= 4
         AND lower(btrim(coalesce(o.email, ''))) LIKE (v_email_local || '@%')
       )
    ORDER BY o.id, o.shopify_created_at DESC NULLS LAST
  )
  SELECT to_jsonb(s)
  FROM (
    SELECT *
    FROM scoped
    ORDER BY shopify_created_at DESC NULLS LAST
    LIMIT GREATEST(coalesce(_limit, 50), 1)
  ) s;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_customer_orders(UUID, INTEGER)
  TO authenticated, service_role;

-- Allow CGEs to read orders that belong to related duplicate accounts of customers in scope
DROP POLICY IF EXISTS cge_orders_select ON public.shopify_orders;
CREATE POLICY cge_orders_select ON public.shopify_orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND (
        customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM public.shopify_customers c
          WHERE c.id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
            AND (
              (
                c.shopify_customer_id IS NOT NULL
                AND shopify_orders.shopify_customer_id = c.shopify_customer_id
              )
              OR (
                position('@' IN lower(btrim(coalesce(c.email, '')))) > 1
                AND length(split_part(lower(btrim(c.email)), '@', 1)) >= 4
                AND lower(btrim(coalesce(shopify_orders.email, '')))
                  LIKE (split_part(lower(btrim(c.email)), '@', 1) || '@%')
              )
              OR (
                length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 8
                AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
                  = regexp_replace(coalesce(
                      (SELECT sc.phone FROM public.shopify_customers sc WHERE sc.id = shopify_orders.customer_id),
                      ''
                    ), '\D', '', 'g')
              )
            )
        )
      )
    )
  );

-- Allow CGEs to resolve related duplicate customer rows for order matching
DROP POLICY IF EXISTS cge_customers_select ON public.shopify_customers;
CREATE POLICY cge_customers_select ON public.shopify_customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND (
        id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM public.shopify_customers scoped
          WHERE scoped.id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
            AND (
              (
                length(regexp_replace(coalesce(scoped.phone, ''), '\D', '', 'g')) >= 8
                AND regexp_replace(coalesce(shopify_customers.phone, ''), '\D', '', 'g')
                  = regexp_replace(coalesce(scoped.phone, ''), '\D', '', 'g')
              )
              OR (
                position('@' IN lower(btrim(coalesce(scoped.email, '')))) > 1
                AND length(split_part(lower(btrim(scoped.email)), '@', 1)) >= 4
                AND lower(btrim(coalesce(shopify_customers.email, '')))
                  LIKE (split_part(lower(btrim(scoped.email)), '@', 1) || '@%')
              )
            )
        )
      )
    )
  );

-- Keep orphan order FK backfill available (idempotent)
UPDATE public.shopify_orders o
SET customer_id = c.id
FROM public.shopify_customers c
WHERE o.customer_id IS NULL
  AND o.shopify_customer_id IS NOT NULL
  AND c.shopify_customer_id = o.shopify_customer_id;
