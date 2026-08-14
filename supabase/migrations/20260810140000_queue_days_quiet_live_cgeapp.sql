-- Live "days quiet" from related orders (never return the 9999 sentinel).
-- Queue/followups compute this ONLY for the current page (not all matching rows).

CREATE OR REPLACE FUNCTION public.cge_customer_days_quiet(_customer_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cust AS (
    SELECT
      c.id,
      c.shopify_customer_id,
      c.rfm_recency_days,
      CASE
        WHEN position('@' IN lower(btrim(coalesce(c.email, '')))) > 1
          THEN split_part(lower(btrim(c.email)), '@', 1)
        ELSE NULL
      END AS email_local,
      nullif(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), '') AS phone_digits
    FROM public.shopify_customers c
    WHERE c.id = _customer_id
  ),
  last_order AS (
    SELECT max(COALESCE(o.processed_at, o.shopify_created_at, o.created_at)) AS order_ts
    FROM public.shopify_orders o
    CROSS JOIN cust tc
    WHERE coalesce(o.test_order, false) = false
      AND (
        o.customer_id = tc.id
        OR (
          o.shopify_customer_id IS NOT NULL
          AND tc.shopify_customer_id IS NOT NULL
          AND o.shopify_customer_id = tc.shopify_customer_id
        )
        OR (
          tc.email_local IS NOT NULL
          AND length(tc.email_local) >= 4
          AND lower(btrim(coalesce(o.email, ''))) LIKE (tc.email_local || '@%')
        )
        OR EXISTS (
          SELECT 1
          FROM public.shopify_customers sibling
          WHERE sibling.id = o.customer_id
            AND sibling.id IS DISTINCT FROM tc.id
            AND (
              (
                tc.email_local IS NOT NULL
                AND length(tc.email_local) >= 4
                AND lower(btrim(coalesce(sibling.email, ''))) LIKE (tc.email_local || '@%')
              )
              OR (
                tc.phone_digits IS NOT NULL
                AND length(tc.phone_digits) >= 8
                AND regexp_replace(coalesce(sibling.phone, ''), '\D', '', 'g') = tc.phone_digits
              )
            )
        )
      )
  )
  SELECT CASE
    WHEN (SELECT order_ts FROM last_order) IS NOT NULL THEN
      GREATEST(
        0,
        floor(extract(epoch FROM (now() - (SELECT order_ts FROM last_order))) / 86400)::int
      )
    WHEN (SELECT rfm_recency_days FROM cust) IS NOT NULL
      AND (SELECT rfm_recency_days FROM cust) < 9999 THEN
      (SELECT rfm_recency_days FROM cust)
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.cge_customer_days_quiet(UUID)
  TO authenticated, service_role;

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
      CASE
        WHEN c.rfm_recency_days IS NOT NULL AND c.rfm_recency_days < 9999 THEN c.rfm_recency_days
        WHEN s.recency_days IS NOT NULL AND s.recency_days < 9999 THEN s.recency_days
        ELSE NULL
      END AS sort_recency
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
  ),
  page AS (
    SELECT *
    FROM joined
    ORDER BY priority ASC, sort_recency DESC NULLS LAST, created_at ASC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ),
  enriched AS (
    SELECT
      p.*,
      public.cge_customer_days_quiet(p.customer_id) AS days_quiet_live
    FROM page p
  )
  SELECT
    (to_jsonb(e) - 'days_quiet_live' - 'sort_recency' - 'recency_days' - 'customer_recency_days')
      || jsonb_build_object(
        'recency_days', e.days_quiet_live,
        'customer_recency_days', e.days_quiet_live
      ),
    (SELECT cnt FROM counted)
  FROM enriched e;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_queue_page(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_cge_followups_page(
  _viewer_user_id UUID,
  _segment TEXT DEFAULT 'all',
  _status TEXT DEFAULT 'all',
  _search TEXT DEFAULT NULL,
  _assigned_to_me BOOLEAN DEFAULT false,
  _has_outreach TEXT DEFAULT 'all',
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
    WHERE (
        v_is_admin
        OR t.assigned_cge_user_id = _viewer_user_id
        OR t.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
      )
      AND (coalesce(_segment, 'all') = 'all' OR t.segment = _segment)
      AND (
        coalesce(_status, 'all') = 'all'
        OR t.status = _status
      )
      AND (
        NOT coalesce(_assigned_to_me, false)
        OR t.assigned_cge_user_id = _viewer_user_id
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
      (
        SELECT count(*)::int
        FROM public.cge_outreach_events e
        WHERE e.customer_id = s.customer_id
      ) AS outreach_count,
      (
        SELECT e.channel
        FROM public.cge_outreach_events e
        WHERE e.customer_id = s.customer_id
        ORDER BY e.created_at DESC
        LIMIT 1
      ) AS last_outreach_channel
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
    AND (
      coalesce(_has_outreach, 'all') = 'all'
      OR (_has_outreach = 'yes' AND EXISTS (
        SELECT 1 FROM public.cge_outreach_events e WHERE e.customer_id = s.customer_id
      ))
      OR (_has_outreach = 'no' AND NOT EXISTS (
        SELECT 1 FROM public.cge_outreach_events e WHERE e.customer_id = s.customer_id
      ))
    )
  ),
  counted AS (
    SELECT count(*)::bigint AS cnt FROM joined
  ),
  page AS (
    SELECT *
    FROM joined
    ORDER BY
      CASE WHEN status IN ('open', 'in_progress', 'snoozed') THEN 0 ELSE 1 END,
      priority ASC,
      last_outreach_at DESC NULLS LAST,
      created_at DESC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ),
  enriched AS (
    SELECT
      p.*,
      public.cge_customer_days_quiet(p.customer_id) AS days_quiet_live
    FROM page p
  )
  SELECT
    (to_jsonb(e) - 'days_quiet_live' - 'recency_days')
      || jsonb_build_object('recency_days', e.days_quiet_live),
    (SELECT cnt FROM counted)
  FROM enriched e;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_followups_page(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;

-- Customer page bundle: one RPC for profile + open task + related orders + days quiet.
CREATE OR REPLACE FUNCTION public.get_cge_customer_bundle(
  _customer_id UUID,
  _orders_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_customer JSONB;
  v_task JSONB;
  v_orders JSONB;
  v_days INTEGER;
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

  SELECT to_jsonb(c) - 'raw_payload'
  INTO v_customer
  FROM public.shopify_customers c
  WHERE c.id = _customer_id;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object(
      'customer', NULL,
      'open_task', NULL,
      'orders', '[]'::jsonb,
      'days_quiet', NULL
    );
  END IF;

  SELECT to_jsonb(t)
  INTO v_task
  FROM public.cge_followup_tasks t
  WHERE t.customer_id = _customer_id
    AND t.status IN ('open', 'in_progress', 'snoozed')
  ORDER BY t.priority ASC, t.created_at ASC
  LIMIT 1;

  SELECT coalesce(jsonb_agg(r.row_data ORDER BY (r.row_data->>'shopify_created_at') DESC NULLS LAST), '[]'::jsonb)
  INTO v_orders
  FROM public.get_cge_customer_orders(_customer_id, GREATEST(coalesce(_orders_limit, 100), 1)) r;

  v_days := public.cge_customer_days_quiet(_customer_id);

  RETURN jsonb_build_object(
    'customer', v_customer,
    'open_task', v_task,
    'orders', coalesce(v_orders, '[]'::jsonb),
    'days_quiet', to_jsonb(v_days)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_customer_bundle(UUID, INTEGER)
  TO authenticated, service_role;
