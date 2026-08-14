-- CGE app schema (enum value added in prior migration)

-- CGE app: role, ownership links, follow-up queues, outreach, soft email bookkeeping

CREATE TABLE IF NOT EXISTS public.cge_salesperson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cge_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salesperson_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cge_user_id, salesperson_user_id)
);

CREATE INDEX IF NOT EXISTS idx_cge_sp_assign_cge ON public.cge_salesperson_assignments (cge_user_id);
CREATE INDEX IF NOT EXISTS idx_cge_sp_assign_sp ON public.cge_salesperson_assignments (salesperson_user_id);

CREATE TABLE IF NOT EXISTS public.cge_followup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  salesperson_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_cge_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  segment TEXT NOT NULL CHECK (segment IN ('one_time_lapsed', 'lapsed_repeat', 'vip_inactive', 'never_purchased')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'recovered', 'closed', 'snoozed')),
  priority INTEGER NOT NULL DEFAULT 100,
  recency_days INTEGER,
  rfm_group TEXT,
  last_outreach_at TIMESTAMPTZ,
  recovered_order_id UUID REFERENCES public.shopify_orders(id) ON DELETE SET NULL,
  recovered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, segment)
);

CREATE INDEX IF NOT EXISTS idx_cge_tasks_status ON public.cge_followup_tasks (status);
CREATE INDEX IF NOT EXISTS idx_cge_tasks_cge ON public.cge_followup_tasks (assigned_cge_user_id);
CREATE INDEX IF NOT EXISTS idx_cge_tasks_segment ON public.cge_followup_tasks (segment);
CREATE INDEX IF NOT EXISTS idx_cge_tasks_priority ON public.cge_followup_tasks (priority ASC, recency_days DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.cge_outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.cge_followup_tasks(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  cge_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('call', 'whatsapp', 'sms', 'email')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  outcome TEXT CHECK (outcome IN ('no_answer', 'replied', 'booked_call', 'order_placed', 'unsubscribed', 'wrong_number', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cge_outreach_customer ON public.cge_outreach_events (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cge_outreach_cge ON public.cge_outreach_events (cge_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cge_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  segment TEXT NOT NULL CHECK (segment IN ('one_time', 'repeat_cooling', 'vip', 'never_purchased')),
  day_offset INTEGER NOT NULL CHECK (day_offset IN (60, 75)),
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cge_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  day_offset INTEGER NOT NULL CHECK (day_offset IN (60, 75)),
  segment TEXT NOT NULL,
  resend_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cge_email_sends_customer ON public.cge_email_sends (customer_id, day_offset);

ALTER TABLE public.shopify_customers
  ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN NOT NULL DEFAULT false;

-- Seed soft-email templates
INSERT INTO public.cge_email_templates (template_key, segment, day_offset, subject, html_body, text_body)
VALUES
  ('one_time_60', 'one_time', 60, 'Still finding what you need?', '<p>Hi {{name}},</p><p>Thanks for your first order. If you need help picking what comes next, we are here.</p>', 'Hi {{name}}, Thanks for your first order. Need help picking what comes next?'),
  ('one_time_75', 'one_time', 75, 'A few favourites customers reorder', '<p>Hi {{name}},</p><p>Here are popular next picks from customers like you. Reply anytime and we will help.</p>', 'Hi {{name}}, Popular next picks from customers like you. Reply anytime.'),
  ('repeat_cooling_60', 'repeat_cooling', 60, 'Based on what you bought before', '<p>Hi {{name}},</p><p>Thought you might like a gentle reminder of items that pair with your past orders.</p>', 'Hi {{name}}, A gentle reminder of items that pair with your past orders.'),
  ('repeat_cooling_75', 'repeat_cooling', 75, 'Ready to restock?', '<p>Hi {{name}},</p><p>If it is time to restock, we can point you to the right products quickly.</p>', 'Hi {{name}}, If it is time to restock, we can help quickly.'),
  ('vip_60', 'vip', 60, 'A personal note from our team', '<p>Hi {{name}},</p><p>We value your business. If you need anything — new arrivals or personal help — just reply.</p>', 'Hi {{name}}, We value your business. Reply if you need personal help.'),
  ('vip_75', 'vip', 75, 'Priority help whenever you need it', '<p>Hi {{name}},</p><p>As a valued customer you have priority support. Tell us what you are looking for.</p>', 'Hi {{name}}, Priority support is available — tell us what you need.'),
  ('never_purchased_60', 'never_purchased', 60, 'Welcome — here if you need a hand', '<p>Hi {{name}},</p><p>Welcome. If you want recommendations for a first order, reply and we will help.</p>', 'Hi {{name}}, Welcome. Reply for first-order recommendations.'),
  ('never_purchased_75', 'never_purchased', 75, 'Quick help getting started', '<p>Hi {{name}},</p><p>Still browsing? We can suggest bestsellers and answer questions.</p>', 'Hi {{name}}, Still browsing? We can suggest bestsellers.')
ON CONFLICT (template_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_cge(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'cge'
  );
$$;

CREATE OR REPLACE FUNCTION public.cge_visible_customer_ids(_cge_user_id UUID)
RETURNS TABLE (customer_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT a.customer_id
  FROM public.salesperson_customer_assignments a
  INNER JOIN public.cge_salesperson_assignments link
    ON link.salesperson_user_id = a.salesperson_user_id
  WHERE link.cge_user_id = _cge_user_id
  UNION
  SELECT DISTINCT a.customer_id
  FROM public.salesperson_customer_assignments a
  WHERE a.salesperson_user_id = _cge_user_id;
$$;

CREATE OR REPLACE FUNCTION public.refresh_cge_followup_tasks_cgeapp()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH eligible AS (
    SELECT
      c.id AS customer_id,
      coalesce(c.total_orders, 0) AS total_orders,
      coalesce(c.rfm_recency_days, 9999) AS recency_days,
      c.rfm_group,
      c.total_revenue,
      (
        SELECT a.salesperson_user_id
        FROM public.salesperson_customer_assignments a
        WHERE a.customer_id = c.id
        ORDER BY CASE a.source WHEN 'sp_assigned' THEN 0 ELSE 1 END, a.created_at
        LIMIT 1
      ) AS salesperson_user_id,
      CASE
        WHEN coalesce(c.total_orders, 0) = 0 THEN 'never_purchased'
        WHEN coalesce(c.rfm_group, '') = 'Can Not Lose Them'
          OR (coalesce(c.total_revenue, 0) >= 1000 AND coalesce(c.rfm_recency_days, 0) >= 90)
          THEN 'vip_inactive'
        WHEN coalesce(c.total_orders, 0) = 1 AND coalesce(c.rfm_recency_days, 0) >= 90 THEN 'one_time_lapsed'
        WHEN coalesce(c.total_orders, 0) >= 2 AND coalesce(c.rfm_recency_days, 0) >= 90 THEN 'lapsed_repeat'
        ELSE NULL
      END AS segment
    FROM public.shopify_customers c
    WHERE EXISTS (
      SELECT 1 FROM public.salesperson_customer_assignments a WHERE a.customer_id = c.id
    )
  ),
  classified AS (
    SELECT *
    FROM eligible
    WHERE segment IS NOT NULL
      AND (
        segment = 'never_purchased'
        OR recency_days >= 90
      )
  ),
  with_cge AS (
    SELECT
      cl.*,
      (
        SELECT link.cge_user_id
        FROM public.cge_salesperson_assignments link
        WHERE link.salesperson_user_id = cl.salesperson_user_id
        ORDER BY link.created_at
        LIMIT 1
      ) AS assigned_cge_user_id,
      CASE cl.segment
        WHEN 'vip_inactive' THEN 10
        WHEN 'one_time_lapsed' THEN 20
        WHEN 'lapsed_repeat' THEN 30
        ELSE 40
      END AS priority
    FROM classified cl
  )
  INSERT INTO public.cge_followup_tasks (
    customer_id, salesperson_user_id, assigned_cge_user_id, segment, status,
    priority, recency_days, rfm_group, updated_at
  )
  SELECT
    w.customer_id, w.salesperson_user_id, w.assigned_cge_user_id, w.segment, 'open',
    w.priority, w.recency_days, w.rfm_group, now()
  FROM with_cge w
  ON CONFLICT (customer_id, segment) DO UPDATE SET
    salesperson_user_id = EXCLUDED.salesperson_user_id,
    assigned_cge_user_id = COALESCE(public.cge_followup_tasks.assigned_cge_user_id, EXCLUDED.assigned_cge_user_id),
    priority = EXCLUDED.priority,
    recency_days = EXCLUDED.recency_days,
    rfm_group = EXCLUDED.rfm_group,
    updated_at = now(),
    status = CASE
      WHEN public.cge_followup_tasks.status IN ('recovered', 'closed') THEN public.cge_followup_tasks.status
      ELSE public.cge_followup_tasks.status
    END;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mark recovered when a paid/non-test order lands after the task was opened
  UPDATE public.cge_followup_tasks t
  SET
    status = 'recovered',
    recovered_at = coalesce(t.recovered_at, now()),
    recovered_order_id = o.id,
    updated_at = now()
  FROM LATERAL (
    SELECT ord.id
    FROM public.shopify_orders ord
    WHERE ord.customer_id = t.customer_id
      AND coalesce(ord.test_order, false) = false
      AND COALESCE(ord.processed_at, ord.shopify_created_at, ord.created_at) >= t.created_at
    ORDER BY COALESCE(ord.processed_at, ord.shopify_created_at, ord.created_at) DESC
    LIMIT 1
  ) o
  WHERE t.status IN ('open', 'in_progress', 'snoozed');

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_soft_prevention_emails_cgeapp()
RETURNS TABLE (
  customer_id UUID,
  email TEXT,
  name TEXT,
  day_offset INTEGER,
  segment TEXT,
  template_key TEXT,
  idempotency_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      c.id AS customer_id,
      c.email,
      c.name,
      coalesce(c.rfm_recency_days, 9999) AS recency_days,
      coalesce(c.total_orders, 0) AS total_orders,
      c.rfm_group,
      c.total_revenue,
      c.email_unsubscribed,
      CASE
        WHEN coalesce(c.total_orders, 0) = 0 THEN 'never_purchased'
        WHEN coalesce(c.rfm_group, '') = 'Can Not Lose Them'
          OR coalesce(c.total_revenue, 0) >= 1000 THEN 'vip'
        WHEN coalesce(c.total_orders, 0) = 1 THEN 'one_time'
        ELSE 'repeat_cooling'
      END AS soft_segment,
      CASE
        WHEN coalesce(c.rfm_recency_days, 0) BETWEEN 60 AND 74 THEN 60
        WHEN coalesce(c.rfm_recency_days, 0) BETWEEN 75 AND 89 THEN 75
        ELSE NULL
      END AS day_offset
    FROM public.shopify_customers c
    WHERE c.email IS NOT NULL
      AND btrim(c.email) <> ''
      AND coalesce(c.email_unsubscribed, false) = false
      AND EXISTS (
        SELECT 1 FROM public.salesperson_customer_assignments a WHERE a.customer_id = c.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.cge_followup_tasks t
        WHERE t.customer_id = c.id AND t.status IN ('open', 'in_progress')
      )
  ),
  candidates AS (
    SELECT
      b.*,
      (b.soft_segment || '_' || b.day_offset::text) AS template_key,
      ('soft/' || b.customer_id::text || '/' || b.day_offset::text) AS idempotency_key
    FROM base b
    WHERE b.day_offset IS NOT NULL
  )
  SELECT
    c.customer_id,
    c.email,
    c.name,
    c.day_offset,
    c.soft_segment AS segment,
    c.template_key,
    c.idempotency_key
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cge_email_sends s
    WHERE s.idempotency_key = c.idempotency_key
      AND s.status IN ('sent', 'queued')
  );
END;
$$;

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
    )
  ),
  counted AS (
    SELECT count(*)::bigint AS total_count FROM joined
  )
  SELECT to_jsonb(j), (SELECT total_count FROM counted)
  FROM (
    SELECT * FROM joined
    ORDER BY priority ASC, recency_days DESC NULLS LAST, created_at ASC
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ) j;
END;
$$;

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
  WITH tasks AS (
    SELECT t.*
    FROM public.cge_followup_tasks t
    WHERE v_is_admin
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
      WHERE (v_is_admin OR e.cge_user_id = _viewer_user_id)
        AND (_from_iso IS NULL OR e.created_at >= _from_iso)
        AND (_to_iso IS NULL OR e.created_at <= _to_iso)
    )::bigint;
END;
$$;

ALTER TABLE public.cge_salesperson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_followup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_outreach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY cge_sp_assign_admin_all ON public.cge_salesperson_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cge_sp_assign_self_select ON public.cge_salesperson_assignments
  FOR SELECT TO authenticated
  USING (cge_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY cge_tasks_select ON public.cge_followup_tasks
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR assigned_cge_user_id = auth.uid()
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

CREATE POLICY cge_tasks_update ON public.cge_followup_tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR assigned_cge_user_id = auth.uid()
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

CREATE POLICY cge_outreach_select ON public.cge_outreach_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR cge_user_id = auth.uid()
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

CREATE POLICY cge_outreach_insert ON public.cge_outreach_events
  FOR INSERT TO authenticated
  WITH CHECK (
    cge_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY cge_templates_admin ON public.cge_email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cge_templates_read ON public.cge_email_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY cge_email_sends_admin ON public.cge_email_sends
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY cge_email_sends_read ON public.cge_email_sends
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
  );

GRANT EXECUTE ON FUNCTION public.is_cge(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cge_visible_customer_ids(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_cge_followup_tasks_cgeapp() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_soft_prevention_emails_cgeapp() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cge_queue_page(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cge_dashboard_kpis(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
