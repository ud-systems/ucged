-- Supervisors see the full CGE queue / follow-ups / customers / orders, like admin.
-- Settings, campaigns, and user management stay admin-only.

-- ---------------------------------------------------------------------------
-- Queue
-- ---------------------------------------------------------------------------
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
  v_is_team_viewer BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.is_cge_team_viewer(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_team_viewer := public.is_cge_team_viewer(_viewer_user_id);
  v_offset := (GREATEST(coalesce(_page, 1), 1) - 1) * GREATEST(coalesce(_page_size, 25), 1);

  RETURN QUERY
  WITH scoped AS (
    SELECT t.*
    FROM public.cge_followup_tasks t
    WHERE t.status IN ('open', 'in_progress', 'snoozed')
      AND (
        v_is_team_viewer
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
      s.id,
      s.customer_id,
      s.salesperson_user_id,
      s.assigned_cge_user_id,
      s.segment,
      s.status,
      s.priority,
      s.rfm_group,
      s.last_outreach_at,
      s.recovered_order_id,
      s.recovered_at,
      s.notes,
      s.created_at,
      s.updated_at,
      s.scheduled_call_at,
      CASE
        WHEN c.rfm_recency_days IS NOT NULL AND c.rfm_recency_days < 9999 THEN c.rfm_recency_days
        WHEN s.recency_days IS NOT NULL AND s.recency_days < 9999 THEN s.recency_days
        ELSE NULL
      END AS recency_days,
      CASE
        WHEN c.rfm_recency_days IS NOT NULL AND c.rfm_recency_days < 9999 THEN c.rfm_recency_days
        WHEN s.recency_days IS NOT NULL AND s.recency_days < 9999 THEN s.recency_days
        ELSE NULL
      END AS customer_recency_days,
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
      c.rfm_group AS customer_rfm_group
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
    ORDER BY priority ASC, recency_days DESC NULLS LAST, created_at ASC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  )
  SELECT
    to_jsonb(p) AS row_data,
    (SELECT cnt FROM counted) AS total_count
  FROM page p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_queue_page(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Follow-ups browse
-- ---------------------------------------------------------------------------
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
  v_is_team_viewer BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.is_cge_team_viewer(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_team_viewer := public.is_cge_team_viewer(_viewer_user_id);
  v_offset := (GREATEST(coalesce(_page, 1), 1) - 1) * GREATEST(coalesce(_page_size, 25), 1);

  RETURN QUERY
  WITH scoped AS (
    SELECT t.*
    FROM public.cge_followup_tasks t
    WHERE (
        v_is_team_viewer
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
      s.id,
      s.customer_id,
      s.salesperson_user_id,
      s.assigned_cge_user_id,
      s.segment,
      s.status,
      s.priority,
      CASE
        WHEN c.rfm_recency_days IS NOT NULL AND c.rfm_recency_days < 9999 THEN c.rfm_recency_days
        WHEN s.recency_days IS NOT NULL AND s.recency_days < 9999 THEN s.recency_days
        ELSE NULL
      END AS recency_days,
      s.rfm_group,
      s.last_outreach_at,
      s.recovered_order_id,
      s.recovered_at,
      s.notes,
      s.created_at,
      s.updated_at,
      s.scheduled_call_at,
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
  )
  SELECT
    to_jsonb(p) AS row_data,
    (SELECT cnt FROM counted) AS total_count
  FROM page p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_followups_page(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Queue KPI strip
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_dashboard_kpis(
  _viewer_user_id UUID,
  _from_iso TIMESTAMPTZ DEFAULT NULL,
  _to_iso TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  open_tasks BIGINT,
  vip_inactive BIGINT,
  one_time_lapsed BIGINT,
  lapsed_repeat BIGINT,
  never_purchased BIGINT,
  recovered_orders BIGINT,
  outreach_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_team_viewer BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.is_cge_team_viewer(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  v_is_team_viewer := public.is_cge_team_viewer(_viewer_user_id);

  RETURN QUERY
  WITH tasks AS (
    SELECT t.*
    FROM public.cge_followup_tasks t
    WHERE v_is_team_viewer
       OR t.assigned_cge_user_id = _viewer_user_id
       OR t.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
  )
  SELECT
    (SELECT count(*) FROM tasks t WHERE t.status IN ('open', 'in_progress', 'snoozed'))::bigint,
    (SELECT count(*) FROM tasks t WHERE t.status IN ('open', 'in_progress', 'snoozed') AND t.segment = 'vip_inactive')::bigint,
    (SELECT count(*) FROM tasks t WHERE t.status IN ('open', 'in_progress', 'snoozed') AND t.segment = 'one_time_lapsed')::bigint,
    (SELECT count(*) FROM tasks t WHERE t.status IN ('open', 'in_progress', 'snoozed') AND t.segment = 'lapsed_repeat')::bigint,
    (SELECT count(*) FROM tasks t WHERE t.status IN ('open', 'in_progress', 'snoozed') AND t.segment = 'never_purchased')::bigint,
    (SELECT count(*) FROM tasks t
      WHERE t.status = 'recovered'
        AND (_from_iso IS NULL OR t.recovered_at >= _from_iso)
        AND (_to_iso IS NULL OR t.recovered_at <= _to_iso)
    )::bigint,
    (SELECT count(*) FROM public.cge_outreach_events e
      WHERE (v_is_team_viewer OR e.cge_user_id = _viewer_user_id)
        AND (_from_iso IS NULL OR e.created_at >= _from_iso)
        AND (_to_iso IS NULL OR e.created_at <= _to_iso)
    )::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_dashboard_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Orders browse
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_orders_page(
  _viewer_user_id UUID,
  _search TEXT DEFAULT NULL,
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
  v_is_team_viewer BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.is_cge_team_viewer(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_team_viewer := public.is_cge_team_viewer(_viewer_user_id);
  v_offset := (GREATEST(coalesce(_page, 1), 1) - 1) * GREATEST(coalesce(_page_size, 25), 1);

  RETURN QUERY
  WITH scoped AS (
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.customer_name,
      o.email,
      o.total,
      o.current_total,
      o.financial_status,
      o.fulfillment_status,
      o.currency_code,
      o.shopify_created_at,
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
      END AS ownership_label
    FROM public.shopify_orders o
    LEFT JOIN public.shopify_customers c ON c.id = o.customer_id
    WHERE (
      v_is_team_viewer
      OR o.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
    )
    AND (
      coalesce(trim(_search), '') = ''
      OR o.order_number ILIKE '%' || trim(_search) || '%'
      OR o.customer_name ILIKE '%' || trim(_search) || '%'
      OR o.email ILIKE '%' || trim(_search) || '%'
      OR c.sp_assigned ILIKE '%' || trim(_search) || '%'
      OR c.referred_by ILIKE '%' || trim(_search) || '%'
    )
  ),
  counted AS (
    SELECT count(*)::bigint AS cnt FROM scoped
  )
  SELECT to_jsonb(j), (SELECT cnt FROM counted)
  FROM (
    SELECT * FROM scoped
    ORDER BY shopify_created_at DESC NULLS LAST
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ) j;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_orders_page(UUID, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Customer sheet: orders + bundle
-- ---------------------------------------------------------------------------
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
    public.is_cge_team_viewer(auth.uid())
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
    public.is_cge_team_viewer(auth.uid())
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

-- ---------------------------------------------------------------------------
-- RLS: supervisors can read (and work) the full CRM set
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS cge_customers_select ON public.shopify_customers;
CREATE POLICY cge_customers_select ON public.shopify_customers
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR (
      public.is_cge(auth.uid())
      AND (
        id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR public.cge_customer_in_related_scope(id)
      )
    )
  );

DROP POLICY IF EXISTS cge_orders_select ON public.shopify_orders;
CREATE POLICY cge_orders_select ON public.shopify_orders
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR (
      public.is_cge(auth.uid())
      AND (
        customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR public.cge_order_in_related_scope(customer_id, shopify_customer_id, email)
      )
    )
  );

DROP POLICY IF EXISTS cge_order_items_select ON public.shopify_order_items;
CREATE POLICY cge_order_items_select ON public.shopify_order_items
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
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

DROP POLICY IF EXISTS cge_tasks_select ON public.cge_followup_tasks;
CREATE POLICY cge_tasks_select ON public.cge_followup_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR assigned_cge_user_id = auth.uid()
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

DROP POLICY IF EXISTS cge_tasks_update ON public.cge_followup_tasks;
CREATE POLICY cge_tasks_update ON public.cge_followup_tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR assigned_cge_user_id = auth.uid()
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

DROP POLICY IF EXISTS cge_outreach_select ON public.cge_outreach_events;
CREATE POLICY cge_outreach_select ON public.cge_outreach_events
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR cge_user_id = auth.uid()
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

DROP POLICY IF EXISTS cge_outreach_insert ON public.cge_outreach_events;
CREATE POLICY cge_outreach_insert ON public.cge_outreach_events
  FOR INSERT TO authenticated
  WITH CHECK (
    cge_user_id = auth.uid()
    OR public.is_cge_team_viewer(auth.uid())
  );

DROP POLICY IF EXISTS cge_email_sends_read ON public.cge_email_sends;
CREATE POLICY cge_email_sends_read ON public.cge_email_sends
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

DROP POLICY IF EXISTS cge_ai_drafts_select ON public.cge_ai_drafts;
CREATE POLICY cge_ai_drafts_select ON public.cge_ai_drafts
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR created_by = auth.uid()
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
    )
  );

DROP POLICY IF EXISTS cge_email_threads_select ON public.cge_email_threads;
CREATE POLICY cge_email_threads_select ON public.cge_email_threads
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
  );

DROP POLICY IF EXISTS cge_email_messages_select ON public.cge_email_messages;
CREATE POLICY cge_email_messages_select ON public.cge_email_messages
  FOR SELECT TO authenticated
  USING (
    public.is_cge_team_viewer(auth.uid())
    OR customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
  );
