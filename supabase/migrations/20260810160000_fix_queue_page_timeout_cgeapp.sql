-- Fix get_cge_queue_page 500: do NOT call cge_customer_days_quiet per row
-- (that took ~12s for page size 25 and exceeded API statement timeout).
-- Return stored RFM / task recency; client enriches missing values.

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

-- Same speed fix for followups browse
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
