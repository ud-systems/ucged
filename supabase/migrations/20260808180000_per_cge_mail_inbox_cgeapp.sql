-- Per-CGE in-system email: identities, threads, messages, offboarding

INSERT INTO public.app_settings (key, value)
VALUES
  ('cge_mail_inbound_domain', coalesce((SELECT value FROM public.app_settings WHERE key = 'cge_mail_inbound_domain'), '')),
  ('cge_mail_inbound_secret', coalesce((SELECT value FROM public.app_settings WHERE key = 'cge_mail_inbound_secret'), gen_random_uuid()::text))
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mail identities (send-as)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cge_mail_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_cge_mail_identities_active
  ON public.cge_mail_identities (active) WHERE active = true;

-- ---------------------------------------------------------------------------
-- Threads + messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cge_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'snoozed')),
  last_message_at TIMESTAMPTZ,
  unread_inbound BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cge_email_threads_customer
  ON public.cge_email_threads (customer_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cge_email_threads_assigned
  ON public.cge_email_threads (assigned_user_id, unread_inbound) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.cge_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.cge_email_threads(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  resend_id TEXT,
  message_id_header TEXT,
  in_reply_to TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  outreach_event_id UUID REFERENCES public.cge_outreach_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cge_email_messages_thread
  ON public.cge_email_messages (thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_cge_email_messages_resend
  ON public.cge_email_messages (resend_id) WHERE resend_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cge_email_messages_message_id
  ON public.cge_email_messages (message_id_header) WHERE message_id_header IS NOT NULL;

ALTER TABLE public.cge_mail_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cge_email_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cge_mail_identities_admin ON public.cge_mail_identities;
CREATE POLICY cge_mail_identities_admin ON public.cge_mail_identities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS cge_mail_identities_self_read ON public.cge_mail_identities;
CREATE POLICY cge_mail_identities_self_read ON public.cge_mail_identities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS cge_email_threads_select ON public.cge_email_threads;
CREATE POLICY cge_email_threads_select ON public.cge_email_threads
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
  );

DROP POLICY IF EXISTS cge_email_threads_write ON public.cge_email_threads;
CREATE POLICY cge_email_threads_write ON public.cge_email_threads
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
    )
  );

DROP POLICY IF EXISTS cge_email_messages_select ON public.cge_email_messages;
CREATE POLICY cge_email_messages_select ON public.cge_email_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
  );

DROP POLICY IF EXISTS cge_email_messages_insert ON public.cge_email_messages;
CREATE POLICY cge_email_messages_insert ON public.cge_email_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(auth.uid()) vc)
    )
  );

-- ---------------------------------------------------------------------------
-- Inbox page RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cge_mail_inbox_page(
  _viewer_user_id UUID,
  _unread_only BOOLEAN DEFAULT false,
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
      t.*,
      c.name AS customer_name,
      c.email AS customer_email
    FROM public.cge_email_threads t
    INNER JOIN public.shopify_customers c ON c.id = t.customer_id
    WHERE t.status = 'open'
      AND (
        v_is_admin
        OR t.customer_id IN (SELECT vc.customer_id FROM public.cge_visible_customer_ids(_viewer_user_id) vc)
      )
      AND (NOT coalesce(_unread_only, false) OR t.unread_inbound = true)
  ),
  counted AS (SELECT count(*)::bigint AS cnt FROM scoped)
  SELECT to_jsonb(j), (SELECT cnt FROM counted)
  FROM (
    SELECT * FROM scoped
    ORDER BY unread_inbound DESC, last_message_at DESC NULLS LAST
    OFFSET v_offset
    LIMIT GREATEST(coalesce(_page_size, 25), 1)
  ) j;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cge_mail_inbox_page(UUID, BOOLEAN, INTEGER, INTEGER)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Offboard CGE: deactivate identity + reassign tasks/threads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.offboard_cge_user_cgeapp(
  _user_id UUID,
  _successor_user_id UUID DEFAULT NULL,
  _disable_auth BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tasks INTEGER := 0;
  v_threads INTEGER := 0;
  v_identities INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  IF _successor_user_id IS NOT NULL AND _successor_user_id = _user_id THEN
    RAISE EXCEPTION 'successor must be different';
  END IF;

  UPDATE public.cge_mail_identities
  SET active = false, updated_at = now()
  WHERE user_id = _user_id AND active = true;
  GET DIAGNOSTICS v_identities = ROW_COUNT;

  IF _successor_user_id IS NOT NULL THEN
    UPDATE public.cge_followup_tasks
    SET assigned_cge_user_id = _successor_user_id, updated_at = now()
    WHERE assigned_cge_user_id = _user_id
      AND status IN ('open', 'in_progress', 'snoozed');
    GET DIAGNOSTICS v_tasks = ROW_COUNT;

    UPDATE public.cge_email_threads
    SET assigned_user_id = _successor_user_id, updated_at = now()
    WHERE assigned_user_id = _user_id
      AND status = 'open';
    GET DIAGNOSTICS v_threads = ROW_COUNT;
  ELSE
    UPDATE public.cge_followup_tasks
    SET assigned_cge_user_id = NULL, updated_at = now()
    WHERE assigned_cge_user_id = _user_id
      AND status IN ('open', 'in_progress', 'snoozed');
    GET DIAGNOSTICS v_tasks = ROW_COUNT;

    UPDATE public.cge_email_threads
    SET assigned_user_id = NULL, updated_at = now()
    WHERE assigned_user_id = _user_id
      AND status = 'open';
    GET DIAGNOSTICS v_threads = ROW_COUNT;
  END IF;

  -- Remove CGE role (keep auth user unless admin-users disable is used separately)
  DELETE FROM public.cge_salesperson_assignments WHERE cge_user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'cge';

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'successor_user_id', _successor_user_id,
    'tasks_reassigned', v_tasks,
    'threads_reassigned', v_threads,
    'identities_deactivated', v_identities,
    'disable_auth_requested', coalesce(_disable_auth, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.offboard_cge_user_cgeapp(UUID, UUID, BOOLEAN)
  TO authenticated, service_role;
