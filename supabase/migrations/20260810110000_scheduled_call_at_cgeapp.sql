-- Internal CGE callback scheduling on follow-up tasks

ALTER TABLE public.cge_followup_tasks
  ADD COLUMN IF NOT EXISTS scheduled_call_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cge_tasks_scheduled_call
  ON public.cge_followup_tasks (assigned_cge_user_id, scheduled_call_at)
  WHERE scheduled_call_at IS NOT NULL;

-- Followups page explicitly lists task columns — include scheduled_call_at
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
      s.segment,
      s.status,
      s.priority,
      s.recency_days,
      s.rfm_group,
      s.last_outreach_at,
      s.scheduled_call_at,
      s.assigned_cge_user_id,
      s.created_at,
      s.updated_at,
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
  )
  SELECT to_jsonb(j), (SELECT cnt FROM counted)
  FROM (
    SELECT * FROM joined
    ORDER BY
      CASE WHEN status IN ('open', 'in_progress', 'snoozed') THEN 0 ELSE 1 END,
      priority ASC,
      last_outreach_at DESC NULLS LAST,
      created_at DESC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ) j;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_followups_page(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;
