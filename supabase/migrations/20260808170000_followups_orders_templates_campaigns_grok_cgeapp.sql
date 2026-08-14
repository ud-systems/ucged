-- Follow-ups browse, orders browse, template kinds, campaigns, Grok audit, suppressions

-- ---------------------------------------------------------------------------
-- 1) Templates: soft + marketing in one table
-- ---------------------------------------------------------------------------
ALTER TABLE public.cge_email_templates
  ADD COLUMN IF NOT EXISTS template_kind TEXT NOT NULL DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.cge_email_templates
SET name = coalesce(name, template_key)
WHERE name IS NULL;

ALTER TABLE public.cge_email_templates
  ALTER COLUMN segment DROP NOT NULL,
  ALTER COLUMN day_offset DROP NOT NULL;

ALTER TABLE public.cge_email_templates
  DROP CONSTRAINT IF EXISTS cge_email_templates_segment_check;

ALTER TABLE public.cge_email_templates
  DROP CONSTRAINT IF EXISTS cge_email_templates_day_offset_check;

ALTER TABLE public.cge_email_templates
  DROP CONSTRAINT IF EXISTS cge_email_templates_template_kind_check;

ALTER TABLE public.cge_email_templates
  ADD CONSTRAINT cge_email_templates_template_kind_check
  CHECK (template_kind IN ('soft', 'marketing', 'outreach'));

ALTER TABLE public.cge_email_templates
  ADD CONSTRAINT cge_email_templates_soft_fields_check
  CHECK (
    (template_kind = 'soft' AND segment IS NOT NULL AND day_offset IN (60, 75))
    OR (template_kind IN ('marketing', 'outreach'))
  );

-- ---------------------------------------------------------------------------
-- 2) Email suppressions (unsub / bounce / complaint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cge_email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  customer_id UUID REFERENCES public.shopify_customers(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribed', 'hard_bounce', 'complaint', 'manual')),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_cge_suppressions_email ON public.cge_email_suppressions (lower(email));

ALTER TABLE public.cge_email_suppressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cge_suppressions_admin ON public.cge_email_suppressions;
CREATE POLICY cge_suppressions_admin ON public.cge_email_suppressions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS cge_suppressions_read ON public.cge_email_suppressions;
CREATE POLICY cge_suppressions_read ON public.cge_email_suppressions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_cge(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Grok / AI draft audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cge_ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('call', 'whatsapp', 'sms', 'email')),
  intent TEXT,
  tone TEXT,
  prompt_fingerprint TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  bullets JSONB,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cge_ai_drafts_customer ON public.cge_ai_drafts (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cge_ai_drafts_user ON public.cge_ai_drafts (created_by, created_at DESC);

ALTER TABLE public.cge_ai_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cge_ai_drafts_select ON public.cge_ai_drafts;
CREATE POLICY cge_ai_drafts_select ON public.cge_ai_drafts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
    )
  );

DROP POLICY IF EXISTS cge_ai_drafts_insert ON public.cge_ai_drafts;
CREATE POLICY cge_ai_drafts_insert ON public.cge_ai_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.is_cge(auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 4) Marketing campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cge_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'done', 'failed')),
  template_id UUID REFERENCES public.cge_email_templates(id) ON DELETE SET NULL,
  subject_override TEXT,
  from_email TEXT,
  scheduled_at TIMESTAMPTZ,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cge_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.cge_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'skipped', 'delivered', 'bounced', 'complained')),
  error_message TEXT,
  resend_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_cge_campaign_recipients_campaign
  ON public.cge_campaign_recipients (campaign_id, status);

CREATE TABLE IF NOT EXISTS public.cge_campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.cge_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.cge_campaign_recipients(id) ON DELETE SET NULL,
  resend_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cge_campaign_events_campaign
  ON public.cge_campaign_events (campaign_id, created_at DESC);

ALTER TABLE public.cge_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_campaign_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cge_campaigns_admin ON public.cge_campaigns;
CREATE POLICY cge_campaigns_admin ON public.cge_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS cge_campaign_recipients_admin ON public.cge_campaign_recipients;
CREATE POLICY cge_campaign_recipients_admin ON public.cge_campaign_recipients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS cge_campaign_events_admin ON public.cge_campaign_events;
CREATE POLICY cge_campaign_events_admin ON public.cge_campaign_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 5) Follow-ups page RPC (open + closed + recovered history)
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

-- ---------------------------------------------------------------------------
-- 6) Orders browse RPC
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
      v_is_admin
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
-- 7) Expand campaign audience from presets
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expand_cge_campaign_audience(_campaign_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audience JSONB;
  v_preset TEXT;
  v_segment TEXT;
  v_quiet_days INTEGER;
  v_ids UUID[];
  v_inserted INTEGER := 0;
BEGIN
  -- Allow service_role (auth.uid null) for edge/cron; admins when called from client
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT audience INTO v_audience FROM public.cge_campaigns WHERE id = _campaign_id;
  IF v_audience IS NULL THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  v_preset := coalesce(v_audience->>'preset', 'manual');
  v_segment := nullif(v_audience->>'segment', '');
  v_quiet_days := coalesce((v_audience->>'quiet_days')::int, 90);

  IF jsonb_typeof(v_audience->'customer_ids') = 'array' THEN
    SELECT array_agg(value::uuid)
    INTO v_ids
    FROM jsonb_array_elements_text(v_audience->'customer_ids') AS t(value);
  END IF;

  WITH candidates AS (
    SELECT c.id AS customer_id, lower(btrim(c.email)) AS email
    FROM public.shopify_customers c
    WHERE c.email IS NOT NULL
      AND btrim(c.email) <> ''
      AND coalesce(c.email_unsubscribed, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.cge_email_suppressions s
        WHERE lower(s.email) = lower(btrim(c.email))
      )
      AND (
        (v_preset = 'manual' AND (v_ids IS NOT NULL AND c.id = ANY (v_ids)))
        OR (v_preset = 'queue_segment' AND EXISTS (
          SELECT 1 FROM public.cge_followup_tasks t
          WHERE t.customer_id = c.id
            AND t.status IN ('open', 'in_progress', 'snoozed')
            AND (v_segment IS NULL OR t.segment = v_segment)
        ))
        OR (v_preset = 'never_purchased' AND coalesce(c.total_orders, 0) = 0)
        OR (
          v_preset = 'quiet_days'
          AND coalesce(c.rfm_recency_days, 0) >= v_quiet_days
        )
      )
  ),
  upserted AS (
    INSERT INTO public.cge_campaign_recipients (
      campaign_id, customer_id, email, status, idempotency_key
    )
    SELECT
      _campaign_id,
      cand.customer_id,
      cand.email,
      'pending',
      'campaign/' || _campaign_id::text || '/' || cand.customer_id::text
    FROM candidates cand
    ON CONFLICT (campaign_id, customer_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO v_inserted FROM upserted;

  UPDATE public.cge_campaigns
  SET
    stats = coalesce(stats, '{}'::jsonb) || jsonb_build_object('recipient_count', (
      SELECT count(*) FROM public.cge_campaign_recipients r WHERE r.campaign_id = _campaign_id
    )),
    updated_at = now()
  WHERE id = _campaign_id;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expand_cge_campaign_audience(UUID) TO authenticated, service_role;

-- Soft-email enqueue: only soft templates (existing RPC may already filter by key; no change required)
COMMENT ON COLUMN public.cge_email_templates.template_kind IS 'soft = day 60/75 automation; marketing/outreach = campaigns & human reuse';
