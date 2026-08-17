-- Allow supervisor and salesperson to manage campaigns (full create/send)
-- and to read email suppressions listed on the campaigns page.

DROP POLICY IF EXISTS cge_campaigns_admin ON public.cge_campaigns;
CREATE POLICY cge_campaigns_admin ON public.cge_campaigns
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  );

DROP POLICY IF EXISTS cge_campaign_recipients_admin ON public.cge_campaign_recipients;
CREATE POLICY cge_campaign_recipients_admin ON public.cge_campaign_recipients
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  );

DROP POLICY IF EXISTS cge_campaign_events_admin ON public.cge_campaign_events;
CREATE POLICY cge_campaign_events_admin ON public.cge_campaign_events
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  );

DROP POLICY IF EXISTS cge_suppressions_read ON public.cge_email_suppressions;
CREATE POLICY cge_suppressions_read ON public.cge_email_suppressions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_cge(auth.uid())
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'salesperson')
  );

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
  -- Allow service_role (auth.uid null) for edge/cron; campaign roles when called from client
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'supervisor')
     AND NOT public.has_role(auth.uid(), 'salesperson') THEN
    RAISE EXCEPTION 'admin, supervisor, or salesperson only';
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
