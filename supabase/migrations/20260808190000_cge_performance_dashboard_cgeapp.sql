-- Gamified CGE performance dashboard RPCs (admin team board + CGE self view)

INSERT INTO public.app_settings (key, value)
VALUES
  ('cge_xp_target_outreach_per_day', '15'),
  ('cge_xp_target_recoveries_per_week', '5')
ON CONFLICT (key) DO NOTHING;

-- Helper: CGE display name from user_roles / auth metadata unavailable → email fallback via user_roles.salesperson_name
CREATE OR REPLACE FUNCTION public.cge_user_display_name(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(btrim(ur.salesperson_name), ''),
    left(_user_id::text, 8)
  )
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id AND ur.role = 'cge'
  LIMIT 1;
$$;

-- Streak: consecutive calendar days (ending today or yesterday) with ≥1 outreach
CREATE OR REPLACE FUNCTION public.cge_outreach_streak(_user_id UUID, _as_of DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE;
  streak INTEGER := 0;
  has_day BOOLEAN;
BEGIN
  d := _as_of;
  -- If no activity today, start from yesterday (streak still counts)
  SELECT EXISTS (
    SELECT 1 FROM public.cge_outreach_events e
    WHERE e.cge_user_id = _user_id AND (e.created_at AT TIME ZONE 'UTC')::date = d
  ) INTO has_day;
  IF NOT has_day THEN
    d := _as_of - 1;
  END IF;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.cge_outreach_events e
      WHERE e.cge_user_id = _user_id AND (e.created_at AT TIME ZONE 'UTC')::date = d
    ) INTO has_day;
    EXIT WHEN NOT has_day;
    streak := streak + 1;
    d := d - 1;
    EXIT WHEN streak > 365;
  END LOOP;

  RETURN streak;
END;
$$;

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_performance_summary(
  _viewer_user_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_admin := public.has_role(_viewer_user_id, 'admin');
  IF NOT v_is_admin AND NOT public.is_cge(_viewer_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  WITH scoped_cges AS (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'cge'
      AND (v_is_admin OR ur.user_id = _viewer_user_id)
  ),
  outreach AS (
    SELECT e.*
    FROM public.cge_outreach_events e
    WHERE e.created_at >= _from AND e.created_at < _to
      AND e.cge_user_id IN (SELECT user_id FROM scoped_cges)
  ),
  emails AS (
    SELECT m.*
    FROM public.cge_email_messages m
    WHERE m.direction = 'outbound'
      AND m.created_at >= _from AND m.created_at < _to
      AND m.created_by IN (SELECT user_id FROM scoped_cges)
  ),
  recoveries AS (
    SELECT t.*
    FROM public.cge_followup_tasks t
    WHERE t.status = 'recovered'
      AND t.recovered_at IS NOT NULL
      AND t.recovered_at >= _from AND t.recovered_at < _to
      AND t.assigned_cge_user_id IN (SELECT user_id FROM scoped_cges)
  ),
  open_tasks AS (
    SELECT count(*)::int AS cnt
    FROM public.cge_followup_tasks t
    WHERE t.status IN ('open', 'in_progress', 'snoozed')
      AND (
        v_is_admin
        OR t.assigned_cge_user_id = _viewer_user_id
        OR t.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
      )
  ),
  overdue AS (
    SELECT count(*)::int AS cnt
    FROM public.cge_followup_tasks t
    WHERE t.status IN ('open', 'in_progress', 'snoozed')
      AND t.last_outreach_at IS NULL
      AND t.created_at < now() - interval '2 days'
      AND (
        v_is_admin
        OR t.assigned_cge_user_id = _viewer_user_id
        OR t.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
      )
  )
  SELECT jsonb_build_object(
    'outreach_count', (SELECT count(*)::int FROM outreach),
    'customers_touched', (SELECT count(DISTINCT customer_id)::int FROM outreach),
    'emails_sent', (SELECT count(*)::int FROM emails),
    'recoveries', (SELECT count(*)::int FROM recoveries),
    'closed_tasks', (
      SELECT count(*)::int FROM public.cge_followup_tasks t
      WHERE t.status = 'closed'
        AND t.updated_at >= _from AND t.updated_at < _to
        AND (v_is_admin OR t.assigned_cge_user_id = _viewer_user_id)
    ),
    'open_tasks', (SELECT cnt FROM open_tasks),
    'overdue_tasks', (SELECT cnt FROM overdue),
    'active_cges', (SELECT count(*)::int FROM scoped_cges),
    'points', (
      (SELECT count(*)::int FROM outreach)
      + 3 * (SELECT count(DISTINCT customer_id)::int FROM outreach)
      + 10 * (SELECT count(*)::int FROM recoveries)
      + 2 * (SELECT count(*)::int FROM emails)
    ),
    'streak', CASE WHEN v_is_admin THEN NULL ELSE public.cge_outreach_streak(_viewer_user_id) END,
    'is_admin_view', v_is_admin
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_performance_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Leaderboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_performance_leaderboard(
  _viewer_user_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS TABLE (row_data JSONB)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_admin := public.has_role(_viewer_user_id, 'admin');
  IF NOT v_is_admin AND NOT public.is_cge(_viewer_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH scoped_cges AS (
    SELECT ur.user_id,
           coalesce(nullif(btrim(ur.salesperson_name), ''), left(ur.user_id::text, 8)) AS display_name
    FROM public.user_roles ur
    WHERE ur.role = 'cge'
      AND (v_is_admin OR ur.user_id = _viewer_user_id)
  ),
  metrics AS (
    SELECT
      c.user_id,
      c.display_name,
      coalesce((
        SELECT count(*)::int FROM public.cge_outreach_events e
        WHERE e.cge_user_id = c.user_id AND e.created_at >= _from AND e.created_at < _to
      ), 0) AS outreach_count,
      coalesce((
        SELECT count(DISTINCT e.customer_id)::int FROM public.cge_outreach_events e
        WHERE e.cge_user_id = c.user_id AND e.created_at >= _from AND e.created_at < _to
      ), 0) AS customers_touched,
      coalesce((
        SELECT count(*)::int FROM public.cge_email_messages m
        WHERE m.created_by = c.user_id AND m.direction = 'outbound'
          AND m.created_at >= _from AND m.created_at < _to
      ), 0) AS emails_sent,
      coalesce((
        SELECT count(*)::int FROM public.cge_followup_tasks t
        WHERE t.status = 'recovered'
          AND t.recovered_at >= _from AND t.recovered_at < _to
          AND t.assigned_cge_user_id = c.user_id
      ), 0) AS recoveries,
      public.cge_outreach_streak(c.user_id) AS streak
    FROM scoped_cges c
  ),
  scored AS (
    SELECT
      m.*,
      (m.outreach_count + 3 * m.customers_touched + 10 * m.recoveries + 2 * m.emails_sent) AS points
    FROM metrics m
  ),
  ranked AS (
    SELECT
      s.*,
      rank() OVER (ORDER BY s.points DESC, s.recoveries DESC, s.outreach_count DESC) AS rank
    FROM scored s
  )
  SELECT (to_jsonb(r) - 'user_id') || jsonb_build_object('cge_user_id', r.user_id)
  FROM ranked r
  ORDER BY r.rank ASC, r.display_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_performance_leaderboard(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Drilldown (outreach page + recoveries list)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_performance_drilldown(
  _viewer_user_id UUID,
  _cge_user_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ,
  _page INTEGER DEFAULT 1,
  _page_size INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_offset INTEGER;
  v_outreach JSONB;
  v_recoveries JSONB;
  v_total BIGINT;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL OR _cge_user_id IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_admin := public.has_role(_viewer_user_id, 'admin');
  IF NOT v_is_admin AND _viewer_user_id <> _cge_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_offset := (GREATEST(coalesce(_page, 1), 1) - 1) * GREATEST(coalesce(_page_size, 25), 1);

  SELECT count(*) INTO v_total
  FROM public.cge_outreach_events e
  WHERE e.cge_user_id = _cge_user_id
    AND e.created_at >= _from AND e.created_at < _to;

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_outreach
  FROM (
    SELECT
      e.id,
      e.customer_id,
      e.channel,
      e.outcome,
      e.notes,
      e.created_at,
      c.name AS customer_name,
      c.email AS customer_email
    FROM public.cge_outreach_events e
    LEFT JOIN public.shopify_customers c ON c.id = e.customer_id
    WHERE e.cge_user_id = _cge_user_id
      AND e.created_at >= _from AND e.created_at < _to
    ORDER BY e.created_at DESC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ) x;

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.recovered_at DESC), '[]'::jsonb)
  INTO v_recoveries
  FROM (
    SELECT
      t.id,
      t.customer_id,
      t.segment,
      t.recovered_at,
      t.recovered_order_id,
      c.name AS customer_name,
      o.order_number
    FROM public.cge_followup_tasks t
    LEFT JOIN public.shopify_customers c ON c.id = t.customer_id
    LEFT JOIN public.shopify_orders o ON o.id = t.recovered_order_id
    WHERE t.status = 'recovered'
      AND t.assigned_cge_user_id = _cge_user_id
      AND t.recovered_at >= _from AND t.recovered_at < _to
    ORDER BY t.recovered_at DESC
    LIMIT 50
  ) x;

  RETURN jsonb_build_object(
    'cge_user_id', _cge_user_id,
    'display_name', public.cge_user_display_name(_cge_user_id),
    'outreach_total', v_total,
    'outreach', v_outreach,
    'recoveries', v_recoveries
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_performance_drilldown(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Timeseries (daily buckets)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_performance_timeseries(
  _viewer_user_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS TABLE (row_data JSONB)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_admin := public.has_role(_viewer_user_id, 'admin');
  IF NOT v_is_admin AND NOT public.is_cge(_viewer_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      date_trunc('day', _from AT TIME ZONE 'UTC'),
      date_trunc('day', (_to - interval '1 second') AT TIME ZONE 'UTC'),
      interval '1 day'
    )::date AS day
  ),
  scoped AS (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'cge'
      AND (v_is_admin OR ur.user_id = _viewer_user_id)
  ),
  outreach_by_day AS (
    SELECT (e.created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS outreach_count
    FROM public.cge_outreach_events e
    WHERE e.created_at >= _from AND e.created_at < _to
      AND e.cge_user_id IN (SELECT user_id FROM scoped)
    GROUP BY 1
  ),
  recoveries_by_day AS (
    SELECT (t.recovered_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS recoveries
    FROM public.cge_followup_tasks t
    WHERE t.status = 'recovered'
      AND t.recovered_at >= _from AND t.recovered_at < _to
      AND t.assigned_cge_user_id IN (SELECT user_id FROM scoped)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'day', d.day,
    'outreach_count', coalesce(o.outreach_count, 0),
    'recoveries', coalesce(r.recoveries, 0)
  )
  FROM days d
  LEFT JOIN outreach_by_day o ON o.day = d.day
  LEFT JOIN recoveries_by_day r ON r.day = d.day
  ORDER BY d.day ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_performance_timeseries(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-- Recent activity feed (shared helper via summary-adjacent)
CREATE OR REPLACE FUNCTION public.get_cge_performance_activity(
  _viewer_user_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ,
  _limit INTEGER DEFAULT 20
)
RETURNS TABLE (row_data JSONB)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF _viewer_user_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF auth.uid() <> _viewer_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_is_admin := public.has_role(_viewer_user_id, 'admin');

  RETURN QUERY
  SELECT to_jsonb(x)
  FROM (
    SELECT
      e.id,
      e.customer_id,
      e.cge_user_id,
      e.channel,
      e.outcome,
      e.created_at,
      c.name AS customer_name,
      coalesce(nullif(btrim(ur.salesperson_name), ''), left(e.cge_user_id::text, 8)) AS cge_name
    FROM public.cge_outreach_events e
    LEFT JOIN public.shopify_customers c ON c.id = e.customer_id
    LEFT JOIN public.user_roles ur ON ur.user_id = e.cge_user_id AND ur.role = 'cge'
    WHERE e.created_at >= _from AND e.created_at < _to
      AND (
        v_is_admin
        OR e.cge_user_id = _viewer_user_id
      )
    ORDER BY e.created_at DESC
    LIMIT GREATEST(coalesce(_limit, 20), 1)
  ) x;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_performance_activity(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)
  TO authenticated, service_role;
