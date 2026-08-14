-- 1) Link orphan orders to customers by Shopify customer id
UPDATE public.shopify_orders o
SET customer_id = c.id
FROM public.shopify_customers c
WHERE o.customer_id IS NULL
  AND o.shopify_customer_id IS NOT NULL
  AND c.shopify_customer_id = o.shopify_customer_id;

-- 2) CGE can read order line items for visible customers
DROP POLICY IF EXISTS cge_order_items_select ON public.shopify_order_items;
CREATE POLICY cge_order_items_select ON public.shopify_order_items
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.shopify_orders o
        WHERE o.id = shopify_order_items.order_id
          AND o.customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
      )
    )
  );

-- 3) Fuzzy-ish normalize for matching Shopify labels ↔ salesperson_name
CREATE OR REPLACE FUNCTION public.normalize_sp_label_cgeapp(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    regexp_replace(lower(trim(coalesce(raw, ''))), '[^a-z0-9]+', '', 'g'),
    ''
  );
$$;

-- 4) Backfill salesperson_customer_assignments + prefer referred_by when SP is Unassigned
CREATE OR REPLACE FUNCTION public.backfill_salesperson_assignments_cgeapp()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.salesperson_customer_assignments (customer_id, salesperson_user_id, source)
  SELECT c.id, ur.user_id, 'sp_assigned'
  FROM public.shopify_customers c
  INNER JOIN public.user_roles ur
    ON ur.role = 'salesperson'
   AND public.normalize_sp_label_cgeapp(ur.salesperson_name) = public.normalize_sp_label_cgeapp(c.sp_assigned)
  WHERE public.normalize_sp_label_cgeapp(c.sp_assigned) IS NOT NULL
    AND public.normalize_sp_label_cgeapp(c.sp_assigned) <> 'unassigned'
  ON CONFLICT (customer_id, salesperson_user_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.salesperson_customer_assignments (customer_id, salesperson_user_id, source)
  SELECT c.id, ur.user_id, 'referred_by'
  FROM public.shopify_customers c
  INNER JOIN public.user_roles ur
    ON ur.role = 'salesperson'
   AND public.normalize_sp_label_cgeapp(ur.salesperson_name) = public.normalize_sp_label_cgeapp(c.referred_by)
  WHERE public.normalize_sp_label_cgeapp(c.referred_by) IS NOT NULL
    AND public.normalize_sp_label_cgeapp(c.referred_by) <> 'unassigned'
    AND NOT EXISTS (
      SELECT 1 FROM public.salesperson_customer_assignments a WHERE a.customer_id = c.id
    )
  ON CONFLICT (customer_id, salesperson_user_id) DO NOTHING;

  -- Mirror ownership onto sp_assigned for UI (prefer assignment match, else referred_by)
  UPDATE public.shopify_customers c
  SET sp_assigned = ur.salesperson_name
  FROM public.salesperson_customer_assignments a
  INNER JOIN public.user_roles ur
    ON ur.user_id = a.salesperson_user_id
   AND ur.role = 'salesperson'
  WHERE a.customer_id = c.id
    AND (
      c.sp_assigned IS NULL
      OR btrim(c.sp_assigned) = ''
      OR lower(btrim(c.sp_assigned)) = 'unassigned'
    );

  UPDATE public.shopify_customers c
  SET sp_assigned = c.referred_by
  WHERE (c.sp_assigned IS NULL OR btrim(c.sp_assigned) = '' OR lower(btrim(c.sp_assigned)) = 'unassigned')
    AND c.referred_by IS NOT NULL
    AND btrim(c.referred_by) <> ''
    AND lower(btrim(c.referred_by)) <> 'unassigned';

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_salesperson_assignments_cgeapp() TO authenticated, service_role;

-- 5) Queue page: include referred_by + ownership_label
CREATE OR REPLACE FUNCTION public.get_cge_queue_page(
  _viewer_user_id UUID,
  _segment TEXT DEFAULT 'all',
  _search TEXT DEFAULT NULL,
  _tab TEXT DEFAULT 'all',
  _page INTEGER DEFAULT 1,
  _page_size INTEGER DEFAULT 25
)
RETURNS TABLE (row_data JSONB, total_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_offset INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_admin := public.has_role(_viewer_user_id, 'admin');
  v_offset := (GREATEST(coalesce(_page, 1), 1) - 1) * GREATEST(coalesce(_page_size, 25), 1);

  RETURN QUERY
  WITH scoped AS (
    SELECT t.*
    FROM public.cge_followup_tasks t
    WHERE t.status IN ('open', 'in_progress', 'snoozed')
      AND (
        v_is_admin
        OR t.assigned_cge_user_id = _viewer_user_id
        OR t.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
      )
      AND (coalesce(_segment, 'all') = 'all' OR t.segment = _segment)
      AND (
        coalesce(_tab, 'all') = 'all'
        OR (_tab = 'assigned_to_me' AND t.assigned_cge_user_id = _viewer_user_id)
        OR (_tab = 'overdue' AND t.last_outreach_at IS NULL AND t.created_at < now() - interval '2 days')
        OR (_tab = 'vip' AND t.segment = 'vip_inactive')
      )
  ),
  joined AS (
    SELECT
      s.*,
      c.name AS customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      c.sp_assigned,
      c.referred_by,
      CASE
        WHEN c.sp_assigned IS NOT NULL
          AND btrim(c.sp_assigned) <> ''
          AND lower(btrim(c.sp_assigned)) <> 'unassigned'
          THEN c.sp_assigned
        WHEN c.referred_by IS NOT NULL AND btrim(c.referred_by) <> ''
          THEN c.referred_by
        ELSE 'Unassigned'
      END AS ownership_label,
      c.total_orders,
      c.total_revenue,
      c.rfm_group AS customer_rfm_group,
      c.rfm_recency_days AS customer_recency_days
    FROM scoped s
    INNER JOIN public.shopify_customers c ON c.id = s.customer_id
    WHERE (
      coalesce(trim(_search), '') = ''
      OR c.name ILIKE '%' || trim(_search) || '%'
      OR c.email ILIKE '%' || trim(_search) || '%'
      OR c.phone ILIKE '%' || trim(_search) || '%'
      OR c.sp_assigned ILIKE '%' || trim(_search) || '%'
      OR c.referred_by ILIKE '%' || trim(_search) || '%'
    )
  ),
  counted AS (
    SELECT count(*)::bigint AS cnt FROM joined
  )
  SELECT to_jsonb(j), (SELECT cnt FROM counted)
  FROM (
    SELECT * FROM joined
    ORDER BY priority ASC, recency_days DESC NULLS LAST, created_at ASC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ) j;
END;
$$;
