-- CGE Webapp: apply all *_cgeapp.sql migrations in order
-- Project: gfgqjuhkbbnrybkbthku


-- ========== 20260323143712_633cf83b-c947-45e6-9922-bddcf7ea39ac_cgeapp.sql ==========
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'salesperson');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  salesperson_name TEXT,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get salesperson name for a user
CREATE OR REPLACE FUNCTION public.get_salesperson_name(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salesperson_name FROM public.user_roles
  WHERE user_id = _user_id AND role = 'salesperson'
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Shopify Customers
CREATE TABLE public.shopify_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_customer_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  store_name TEXT,
  sp_assigned TEXT,
  referred_by TEXT,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  shopify_created_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shopify_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all customers" ON public.shopify_customers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Salespersons see assigned customers" ON public.shopify_customers
  FOR SELECT USING (
    sp_assigned = public.get_salesperson_name(auth.uid())
  );

-- Shopify Orders
CREATE TABLE public.shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id TEXT UNIQUE NOT NULL,
  order_number TEXT,
  customer_id UUID REFERENCES public.shopify_customers(id) ON DELETE SET NULL,
  shopify_customer_id TEXT,
  customer_name TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  financial_status TEXT,
  fulfillment_status TEXT,
  shopify_created_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all orders" ON public.shopify_orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Salespersons see orders of assigned customers" ON public.shopify_orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.shopify_customers
      WHERE sp_assigned = public.get_salesperson_name(auth.uid())
    )
  );

-- Shopify Order Items
CREATE TABLE public.shopify_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.shopify_orders(id) ON DELETE CASCADE NOT NULL,
  product TEXT,
  variant TEXT,
  quantity INTEGER DEFAULT 0,
  price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shopify_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all order items" ON public.shopify_order_items
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Salespersons see their order items" ON public.shopify_order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.shopify_orders o
      JOIN public.shopify_customers c ON o.customer_id = c.id
      WHERE c.sp_assigned = public.get_salesperson_name(auth.uid())
    )
  );

-- Shopify Products
CREATE TABLE public.shopify_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON public.shopify_products
  FOR SELECT TO authenticated USING (true);

-- Shopify Variants
CREATE TABLE public.shopify_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.shopify_products(id) ON DELETE CASCADE NOT NULL,
  shopify_variant_id TEXT UNIQUE NOT NULL,
  title TEXT,
  sku TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  inventory_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shopify_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view variants" ON public.shopify_variants
  FOR SELECT TO authenticated USING (true);

-- Sync Logs
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs" ON public.sync_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_shopify_customers_updated_at
  BEFORE UPDATE ON public.shopify_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopify_orders_updated_at
  BEFORE UPDATE ON public.shopify_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopify_products_updated_at
  BEFORE UPDATE ON public.shopify_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopify_variants_updated_at
  BEFORE UPDATE ON public.shopify_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shopify_customers_sp_assigned ON public.shopify_customers(sp_assigned);
CREATE INDEX idx_shopify_orders_customer_id ON public.shopify_orders(customer_id);
CREATE INDEX idx_shopify_orders_shopify_customer_id ON public.shopify_orders(shopify_customer_id);
CREATE INDEX idx_shopify_variants_product_id ON public.shopify_variants(product_id);
CREATE INDEX idx_sync_logs_sync_type ON public.sync_logs(sync_type);

-- ========== 20260323182842_8200f246-9bc1-403e-ba90-9a0334dd70aa_cgeapp.sql ==========
-- Allow service role to insert/update/delete sync data
-- These policies use 'TO service_role' which bypasses RLS, but we need explicit INSERT policies
-- for the edge function using service role key (which bypasses RLS anyway)
-- However we need INSERT policies for sync_logs from authenticated admins

-- Allow admins to insert sync logs (for the sync button trigger)
CREATE POLICY "Service can manage sync_logs" ON public.sync_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Allow service to manage shopify data (service role bypasses RLS, but explicit for clarity)
CREATE POLICY "Service can manage customers" ON public.shopify_customers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage orders" ON public.shopify_orders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage order items" ON public.shopify_order_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage products" ON public.shopify_products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage variants" ON public.shopify_variants
  FOR ALL USING (true) WITH CHECK (true);

-- ========== 20260323182852_72a2e55d-4c0b-4df9-9616-1849522edd96_cgeapp.sql ==========
-- Drop overly permissive policies and restrict writes to service_role only
DROP POLICY "Service can manage sync_logs" ON public.sync_logs;
DROP POLICY "Service can manage customers" ON public.shopify_customers;
DROP POLICY "Service can manage orders" ON public.shopify_orders;
DROP POLICY "Service can manage order items" ON public.shopify_order_items;
DROP POLICY "Service can manage products" ON public.shopify_products;
DROP POLICY "Service can manage variants" ON public.shopify_variants;

-- Service role bypasses RLS automatically, so no explicit policies needed for writes.
-- The edge function uses service role key which bypasses RLS.
-- No additional policies needed.

-- ========== 20260323185156_f4f4f3f5-0d6a-470a-988e-5924290b5673_cgeapp.sql ==========

CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
  ON public.app_settings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));


-- ========== 20260324120000_shopify_extended_fields_cgeapp.sql ==========
-- Richer mapping from Shopify Admin API → local tables (see shopify-sync edge function)

ALTER TABLE public.shopify_customers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS address1 text,
  ADD COLUMN IF NOT EXISTS address2 text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS customer_note text,
  ADD COLUMN IF NOT EXISTS tags text,
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS account_state text,
  ADD COLUMN IF NOT EXISTS spend_currency text;

COMMENT ON COLUMN public.shopify_customers.account_state IS 'Shopify Customer.state (e.g. ENABLED, INVITED)';

ALTER TABLE public.shopify_orders
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS currency_code text,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS total_tax numeric,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_note text,
  ADD COLUMN IF NOT EXISTS tags text,
  ADD COLUMN IF NOT EXISTS test_order boolean DEFAULT false;

ALTER TABLE public.shopify_order_items
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS shopify_line_item_id text,
  ADD COLUMN IF NOT EXISTS shopify_variant_gid text;

ALTER TABLE public.shopify_products
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS tags text;


-- ========== 20260324133000_sync_checkpoints_cgeapp.sql ==========
CREATE TABLE IF NOT EXISTS public.sync_checkpoints (
  sync_type text PRIMARY KEY,
  cursor text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_completed_at timestamptz
);

ALTER TABLE public.sync_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync checkpoints"
ON public.sync_checkpoints
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));


-- ========== 20260324150000_collections_purchase_orders_cgeapp.sql ==========
-- Collections + purchase orders support

CREATE TABLE IF NOT EXISTS public.shopify_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_collection_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  collection_type TEXT DEFAULT 'custom',
  products_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shopify_collections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shopify_collections' AND policyname = 'Authenticated users can view collections'
  ) THEN
    CREATE POLICY "Authenticated users can view collections" ON public.shopify_collections
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_name TEXT,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  po_date TIMESTAMPTZ,
  expected_date TIMESTAMPTZ,
  notes TEXT,
  source TEXT DEFAULT 'shopify_tagged_order',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'purchase_orders' AND policyname = 'Authenticated users can view purchase orders'
  ) THEN
    CREATE POLICY "Authenticated users can view purchase orders" ON public.purchase_orders
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shopify_collections_updated_at ON public.shopify_collections(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date ON public.purchase_orders(po_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shopify_collections_updated_at') THEN
    CREATE TRIGGER update_shopify_collections_updated_at
      BEFORE UPDATE ON public.shopify_collections
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_purchase_orders_updated_at') THEN
    CREATE TRIGGER update_purchase_orders_updated_at
      BEFORE UPDATE ON public.purchase_orders
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- ========== 20260325120000_salesperson_assignments_rls_cgeapp.sql ==========
-- Salesperson ↔ customer assignments (identity-based) + tightened RLS

CREATE TABLE IF NOT EXISTS public.salesperson_customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.shopify_customers(id) ON DELETE CASCADE,
  salesperson_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, salesperson_user_id)
);

CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_salesperson
  ON public.salesperson_customer_assignments(salesperson_user_id);

CREATE INDEX IF NOT EXISTS idx_salesperson_assignments_customer
  ON public.salesperson_customer_assignments(customer_id);

ALTER TABLE public.salesperson_customer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to salesperson_customer_assignments"
  ON public.salesperson_customer_assignments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Salespersons can view own customer assignments"
  ON public.salesperson_customer_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesperson')
    AND salesperson_user_id = auth.uid()
  );

-- Backfill from existing string fields (case-insensitive trim)
INSERT INTO public.salesperson_customer_assignments (customer_id, salesperson_user_id, source)
SELECT c.id, ur.user_id, 'sp_assigned'
FROM public.shopify_customers c
INNER JOIN public.user_roles ur
  ON ur.role = 'salesperson'
 AND lower(trim(coalesce(ur.salesperson_name, ''))) = lower(trim(coalesce(c.sp_assigned, '')))
WHERE coalesce(trim(c.sp_assigned), '') NOT IN ('', 'Unassigned', 'unassigned')
  AND coalesce(trim(ur.salesperson_name), '') <> ''
ON CONFLICT (customer_id, salesperson_user_id) DO NOTHING;

INSERT INTO public.salesperson_customer_assignments (customer_id, salesperson_user_id, source)
SELECT c.id, ur.user_id, 'referred_by'
FROM public.shopify_customers c
INNER JOIN public.user_roles ur
  ON ur.role = 'salesperson'
 AND lower(trim(coalesce(ur.salesperson_name, ''))) = lower(trim(coalesce(c.referred_by, '')))
WHERE coalesce(trim(c.referred_by), '') <> ''
  AND coalesce(trim(ur.salesperson_name), '') <> ''
ON CONFLICT (customer_id, salesperson_user_id) DO NOTHING;

-- Customers: scope salesperson by assignment rows (not fragile name equality on sp_assigned alone)
DROP POLICY IF EXISTS "Salespersons see assigned customers" ON public.shopify_customers;

CREATE POLICY "Salespersons see assigned customers"
  ON public.shopify_customers
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesperson')
    AND EXISTS (
      SELECT 1 FROM public.salesperson_customer_assignments a
      WHERE a.customer_id = shopify_customers.id
        AND a.salesperson_user_id = auth.uid()
    )
  );

-- Orders: salesperson sees rows visible via parent table RLS when using subquery pattern
DROP POLICY IF EXISTS "Salespersons see orders of assigned customers" ON public.shopify_orders;

CREATE POLICY "Salespersons see orders of assigned customers"
  ON public.shopify_orders
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesperson')
    AND EXISTS (
      SELECT 1 FROM public.salesperson_customer_assignments a
      INNER JOIN public.shopify_customers cust ON cust.id = a.customer_id
      WHERE a.salesperson_user_id = auth.uid()
        AND (
          shopify_orders.customer_id = cust.id
          OR (
            shopify_orders.customer_id IS NULL
            AND shopify_orders.shopify_customer_id IS NOT NULL
            AND shopify_orders.shopify_customer_id = cust.shopify_customer_id
          )
        )
    )
  );

-- Order items: visibility follows parent order (shopify_orders RLS applies in subquery)
DROP POLICY IF EXISTS "Salespersons see their order items" ON public.shopify_order_items;

CREATE POLICY "Salespersons see their order items"
  ON public.shopify_order_items
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesperson')
    AND EXISTS (
      SELECT 1 FROM public.shopify_orders o
      WHERE o.id = shopify_order_items.order_id
    )
  );

-- Purchase orders: link to originating Shopify order for row-level scope
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS shopify_order_id UUID REFERENCES public.shopify_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_shopify_order_id
  ON public.purchase_orders(shopify_order_id);

UPDATE public.purchase_orders po
SET shopify_order_id = o.id
FROM public.shopify_orders o
WHERE po.shopify_order_id IS NULL
  AND po.po_number IS NOT NULL
  AND o.order_number IS NOT NULL
  AND (
    po.po_number = 'PO-' || o.order_number
    OR po.po_number = 'PO-' || trim(both '#' from o.order_number)
  );

DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON public.purchase_orders;

CREATE POLICY "Admins can view all purchase orders"
  ON public.purchase_orders
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Salespersons view purchase orders for accessible orders"
  ON public.purchase_orders
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'salesperson')
    AND shopify_order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shopify_orders o
      WHERE o.id = purchase_orders.shopify_order_id
    )
  );


-- ========== 20260325140000_shopify_webhooks_realtime_cgeapp.sql ==========
-- Shopify webhooks: idempotency + processing audit log

CREATE TABLE IF NOT EXISTS public.shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_received_at
  ON public.shopify_webhook_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_topic
  ON public.shopify_webhook_events(topic);

ALTER TABLE public.shopify_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shopify_webhook_events'
      AND policyname = 'Admins can view webhook events'
  ) THEN
    CREATE POLICY "Admins can view webhook events"
      ON public.shopify_webhook_events
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;


-- ========== 20260325150000_recompute_sp_assigned_from_assignments_cgeapp.sql ==========
-- Keep `shopify_customers.sp_assigned` aligned with `salesperson_customer_assignments`
-- so UI filters ("Assigned/Unassigned") reflect the identity-based assignment model.

-- Reset to unassigned first.
UPDATE public.shopify_customers
SET sp_assigned = 'Unassigned';

-- Prefer assignments created from `sp_assigned` metafield over `referred_by` when both exist.
WITH ranked AS (
  SELECT
    a.customer_id,
    ur.salesperson_name,
    ROW_NUMBER() OVER (
      PARTITION BY a.customer_id
      ORDER BY
        CASE WHEN a.source = 'sp_assigned' THEN 1 ELSE 2 END,
        a.created_at DESC
    ) AS rn
  FROM public.salesperson_customer_assignments a
  INNER JOIN public.user_roles ur
    ON ur.user_id = a.salesperson_user_id
  WHERE ur.role = 'salesperson'
    AND ur.salesperson_name IS NOT NULL
    AND btrim(ur.salesperson_name) <> ''
)
UPDATE public.shopify_customers c
SET sp_assigned = r.salesperson_name
FROM ranked r
WHERE r.rn = 1
  AND r.customer_id = c.id;



-- ========== 20260326100000_shopify_reconcile_scheduler_cgeapp.sql ==========
-- Scheduled reconciliation for Shopify sync.
-- Runs every 15 minutes, but only triggers sync when `sync_frequency` says it is due.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

INSERT INTO public.app_settings (key, value)
SELECT 'shopify_cron_secret', gen_random_uuid()::text
WHERE NOT EXISTS (
  SELECT 1
  FROM public.app_settings
  WHERE key = 'shopify_cron_secret'
);

CREATE OR REPLACE FUNCTION public.run_shopify_reconcile_if_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_frequency text := 'manual';
  v_secret text := '';
  v_interval interval := null;
  v_last_started timestamptz := null;
BEGIN
  SELECT value INTO v_frequency
  FROM public.app_settings
  WHERE key = 'sync_frequency';

  v_frequency := COALESCE(NULLIF(trim(v_frequency), ''), 'manual');
  IF v_frequency = 'manual' THEN
    RETURN;
  END IF;

  IF v_frequency = '15min' THEN
    v_interval := interval '15 minutes';
  ELSIF v_frequency = '30min' THEN
    v_interval := interval '30 minutes';
  ELSIF v_frequency = '1hour' THEN
    v_interval := interval '1 hour';
  ELSIF v_frequency = '6hour' THEN
    v_interval := interval '6 hours';
  ELSIF v_frequency = '12hour' THEN
    v_interval := interval '12 hours';
  ELSIF v_frequency = 'daily' THEN
    v_interval := interval '1 day';
  ELSE
    RETURN;
  END IF;

  SELECT max(started_at) INTO v_last_started
  FROM public.sync_logs
  WHERE sync_type IN ('customers', 'orders', 'products', 'collections', 'purchase_orders');

  IF v_last_started IS NOT NULL AND (now() - v_last_started) < v_interval THEN
    RETURN;
  END IF;

  SELECT value INTO v_secret
  FROM public.app_settings
  WHERE key = 'shopify_cron_secret';

  v_secret := COALESCE(trim(v_secret), '');
  IF v_secret = '' THEN
    RETURN;
  END IF;

  -- Replace gfgqjuhkbbnrybkbthku with your Supabase project ref before applying.
  PERFORM net.http_post(
    url := 'https://gfgqjuhkbbnrybkbthku.supabase.co/functions/v1/shopify-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-shopify-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

DO $$
DECLARE
  j record;
BEGIN
  FOR j IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'shopify_reconcile_every_15m'
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'shopify_reconcile_every_15m',
  '*/15 * * * *',
  $$SELECT public.run_shopify_reconcile_if_due();$$
);


-- ========== 20260330223000_datapulse_license_settings_cgeapp.sql ==========
-- DataPulseFlow license settings (required for sync and webhook ingestion)
-- https://datapulseflow.com — see docs/OPERATIONS.md
INSERT INTO public.app_settings (key, value)
VALUES
  ('datapulse_access_code', ''),
  ('datapulse_access_expires_at', ''),
  ('datapulse_validation_url', 'https://clitxvzecgtdtracpbnt.supabase.co/functions/v1/validate-access-code')
ON CONFLICT (key) DO NOTHING;


-- ========== 20260330231500_datapulse_license_mode_cgeapp.sql ==========
-- DataPulseFlow license mode: renewable (30-day) or lifetime (enterprise)
INSERT INTO public.app_settings (key, value)
VALUES ('datapulse_license_mode', 'renewable')
ON CONFLICT (key) DO NOTHING;


-- ========== 20260430194000_add_customer_rfm_groups_and_scoped_filter_rpc_cgeapp.sql ==========
-- CGE: persistent RFM metrics/grouping for customers (no sales-portal scoped page RPC)

ALTER TABLE public.shopify_customers
  ADD COLUMN IF NOT EXISTS rfm_recency_days INTEGER,
  ADD COLUMN IF NOT EXISTS rfm_frequency INTEGER,
  ADD COLUMN IF NOT EXISTS rfm_monetary NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS rfm_score TEXT,
  ADD COLUMN IF NOT EXISTS rfm_group TEXT;

CREATE INDEX IF NOT EXISTS idx_shopify_customers_rfm_group
  ON public.shopify_customers (rfm_group);

CREATE INDEX IF NOT EXISTS idx_shopify_customers_rfm_score
  ON public.shopify_customers (rfm_score);

CREATE OR REPLACE FUNCTION public.refresh_customer_rfm_metrics(
  _customer_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  WITH target_customers AS (
    SELECT c.id, c.shopify_customer_id
    FROM public.shopify_customers c
    WHERE _customer_ids IS NULL
       OR c.id = ANY(_customer_ids)
  ),
  resolved_orders AS (
    SELECT DISTINCT
      o.id AS order_id,
      tc.id AS customer_id,
      coalesce(o.total, 0)::numeric(14,2) AS order_total,
      COALESCE(o.processed_at, o.shopify_created_at, o.created_at) AS order_ts
    FROM public.shopify_orders o
    INNER JOIN target_customers tc
      ON o.customer_id = tc.id
      OR (
        o.customer_id IS NULL
        AND o.shopify_customer_id IS NOT NULL
        AND tc.shopify_customer_id IS NOT NULL
        AND o.shopify_customer_id = tc.shopify_customer_id
      )
    WHERE coalesce(o.test_order, false) = false
  ),
  agg AS (
    SELECT
      tc.id AS customer_id,
      CASE
        WHEN max(ro.order_ts) IS NULL THEN 9999
        ELSE GREATEST(0, floor(extract(epoch FROM (now() - max(ro.order_ts))) / 86400)::int)
      END AS recency_days,
      count(DISTINCT ro.order_id)::int AS frequency_orders,
      coalesce(sum(ro.order_total), 0)::numeric(14,2) AS monetary_total
    FROM target_customers tc
    LEFT JOIN resolved_orders ro ON ro.customer_id = tc.id
    GROUP BY tc.id
  ),
  scored_raw AS (
    SELECT
      a.customer_id,
      a.recency_days,
      a.frequency_orders,
      a.monetary_total,
      CASE
        WHEN a.frequency_orders = 0 THEN 1
        ELSE 6 - ntile(5) OVER (ORDER BY a.recency_days ASC, a.customer_id)
      END AS r_score,
      CASE
        WHEN a.frequency_orders = 0 THEN 1
        ELSE ntile(5) OVER (ORDER BY a.frequency_orders ASC, a.customer_id)
      END AS f_score,
      CASE
        WHEN a.frequency_orders = 0 OR a.monetary_total <= 0 THEN 1
        ELSE ntile(5) OVER (ORDER BY a.monetary_total ASC, a.customer_id)
      END AS m_score
    FROM agg a
  ),
  scored AS (
    SELECT
      sr.customer_id,
      sr.recency_days,
      sr.frequency_orders,
      sr.monetary_total,
      sr.r_score,
      sr.f_score,
      sr.m_score,
      concat(sr.r_score::text, sr.f_score::text, sr.m_score::text) AS score_3d,
      CASE
        WHEN sr.r_score >= 5 AND sr.f_score >= 4 AND sr.m_score >= 4 THEN 'Champions'
        WHEN sr.r_score >= 4 AND sr.f_score >= 4 THEN 'Loyal Customers'
        WHEN sr.r_score >= 4 AND sr.f_score BETWEEN 2 AND 3 THEN 'Potential Loyalists'
        WHEN sr.r_score >= 4 AND sr.f_score <= 1 THEN 'New Customers'
        WHEN sr.r_score = 3 AND sr.f_score >= 3 THEN 'Promising'
        WHEN sr.r_score = 3 AND sr.f_score <= 2 THEN 'Need Attention'
        WHEN sr.r_score = 2 AND sr.f_score >= 3 THEN 'About To Sleep'
        WHEN sr.r_score <= 2 AND sr.f_score >= 4 AND sr.m_score >= 3 THEN 'Can Not Lose Them'
        WHEN sr.r_score <= 2 AND sr.f_score >= 3 THEN 'At Risk'
        WHEN sr.r_score <= 2 AND sr.f_score = 2 THEN 'Hibernating'
        ELSE 'Lost'
      END AS rfm_group
    FROM scored_raw sr
  )
  UPDATE public.shopify_customers c
  SET
    rfm_recency_days = s.recency_days,
    rfm_frequency = s.frequency_orders,
    rfm_monetary = s.monetary_total,
    rfm_score = s.score_3d,
    rfm_group = s.rfm_group
  FROM scored s
  WHERE s.customer_id = c.id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_customer_rfm_metrics(UUID[])
TO authenticated, service_role;


-- ========== 20260430200500_add_shopify_style_rfm_matrix_rpc_cgeapp.sql ==========
-- CGE: Shopify-style RFM score columns (matrix RPC omitted — uses hierarchy helpers not in CGE)

ALTER TABLE public.shopify_customers
  ADD COLUMN IF NOT EXISTS rfm_recency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS rfm_frequency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS rfm_monetary_score SMALLINT;

CREATE OR REPLACE FUNCTION public.refresh_customer_rfm_metrics(
  _customer_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  WITH target_customers AS (
    SELECT c.id, c.shopify_customer_id
    FROM public.shopify_customers c
    WHERE _customer_ids IS NULL
       OR c.id = ANY(_customer_ids)
  ),
  resolved_orders AS (
    SELECT DISTINCT
      o.id AS order_id,
      tc.id AS customer_id,
      coalesce(o.total, 0)::numeric(14,2) AS order_total,
      COALESCE(o.processed_at, o.shopify_created_at, o.created_at) AS order_ts
    FROM public.shopify_orders o
    INNER JOIN target_customers tc
      ON o.customer_id = tc.id
      OR (
        o.customer_id IS NULL
        AND o.shopify_customer_id IS NOT NULL
        AND tc.shopify_customer_id IS NOT NULL
        AND o.shopify_customer_id = tc.shopify_customer_id
      )
    WHERE coalesce(o.test_order, false) = false
  ),
  agg AS (
    SELECT
      tc.id AS customer_id,
      CASE
        WHEN max(ro.order_ts) IS NULL THEN 9999
        ELSE GREATEST(0, floor(extract(epoch FROM (now() - max(ro.order_ts))) / 86400)::int)
      END AS recency_days,
      count(DISTINCT ro.order_id)::int AS frequency_orders,
      coalesce(sum(ro.order_total), 0)::numeric(14,2) AS monetary_total
    FROM target_customers tc
    LEFT JOIN resolved_orders ro ON ro.customer_id = tc.id
    GROUP BY tc.id
  ),
  scored_raw AS (
    SELECT
      a.customer_id,
      a.recency_days,
      a.frequency_orders,
      a.monetary_total,
      CASE
        WHEN a.frequency_orders = 0 THEN 1
        ELSE 6 - ntile(5) OVER (ORDER BY a.recency_days ASC, a.customer_id)
      END AS r_score,
      CASE
        WHEN a.frequency_orders = 0 THEN 1
        ELSE ntile(5) OVER (ORDER BY a.frequency_orders ASC, a.customer_id)
      END AS f_score,
      CASE
        WHEN a.frequency_orders = 0 OR a.monetary_total <= 0 THEN 1
        ELSE ntile(5) OVER (ORDER BY a.monetary_total ASC, a.customer_id)
      END AS m_score
    FROM agg a
  ),
  scored AS (
    SELECT
      sr.customer_id,
      sr.recency_days,
      sr.frequency_orders,
      sr.monetary_total,
      sr.r_score,
      sr.f_score,
      sr.m_score,
      concat(sr.r_score::text, sr.f_score::text, sr.m_score::text) AS score_3d,
      CASE
        WHEN sr.r_score >= 5 AND sr.f_score >= 4 AND sr.m_score >= 4 THEN 'Champions'
        WHEN sr.r_score >= 4 AND sr.f_score >= 4 THEN 'Loyal Customers'
        WHEN sr.r_score >= 4 AND sr.f_score BETWEEN 2 AND 3 THEN 'Potential Loyalists'
        WHEN sr.r_score >= 4 AND sr.f_score <= 1 THEN 'New Customers'
        WHEN sr.r_score = 3 AND sr.f_score >= 3 THEN 'Promising'
        WHEN sr.r_score = 3 AND sr.f_score <= 2 THEN 'Need Attention'
        WHEN sr.r_score = 2 AND sr.f_score >= 3 THEN 'About To Sleep'
        WHEN sr.r_score <= 2 AND sr.f_score >= 4 AND sr.m_score >= 3 THEN 'Can Not Lose Them'
        WHEN sr.r_score <= 2 AND sr.f_score >= 3 THEN 'At Risk'
        WHEN sr.r_score <= 2 AND sr.f_score = 2 THEN 'Hibernating'
        ELSE 'Lost'
      END AS rfm_group
    FROM scored_raw sr
  )
  UPDATE public.shopify_customers c
  SET
    rfm_recency_days = s.recency_days,
    rfm_frequency = s.frequency_orders,
    rfm_monetary = s.monetary_total,
    rfm_score = s.score_3d,
    rfm_group = s.rfm_group,
    rfm_recency_score = s.r_score,
    rfm_frequency_score = s.f_score,
    rfm_monetary_score = s.m_score
  FROM scored s
  WHERE s.customer_id = c.id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_customer_rfm_metrics(UUID[])
TO authenticated, service_role;


-- ========== 20260529120000_order_shipping_address_notifications_realtime_cgeapp.sql ==========
-- Per-order shipping / delivery address (from Shopify shippingAddress)
ALTER TABLE public.shopify_orders
  ADD COLUMN IF NOT EXISTS shipping_name text,
  ADD COLUMN IF NOT EXISTS shipping_address1 text,
  ADD COLUMN IF NOT EXISTS shipping_address2 text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_province text,
  ADD COLUMN IF NOT EXISTS shipping_country text,
  ADD COLUMN IF NOT EXISTS shipping_zip text;

-- Optional realtime for user_notifications (table not required for CGE v1)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'user_notifications'
     )
  THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;


-- ========== 20260529130000_push_subscriptions_cgeapp.sql ==========
-- Browser / PWA Web Push subscriptions (one row per user + device endpoint)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('vapid_public_key', '', now())
ON CONFLICT (key) DO NOTHING;


-- ========== 20260808120000_cge_role_schema_rls_cgeapp.sql ==========
-- CGE app: role, ownership links, follow-up queues, outreach, soft email bookkeeping

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cge';

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


-- ========== 20260808130000_cge_shopify_read_rls_cgeapp.sql ==========
-- Allow CGE users to read Shopify customers/orders in their assigned salesperson scope

CREATE POLICY cge_customers_select ON public.shopify_customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    )
  );

CREATE POLICY cge_orders_select ON public.shopify_orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    )
  );


-- ========== 20260808140000_cge_soft_email_cron_cgeapp.sql ==========
-- Schedule soft-email runner (replace gfgqjuhkbbnrybkbthku before apply)
-- Requires pg_cron + pg_net. Align CGE_CRON_SECRET edge secret with app_settings.cge_cron_secret.

INSERT INTO public.app_settings (key, value)
VALUES
  ('cge_cron_secret', coalesce((SELECT value FROM public.app_settings WHERE key = 'cge_cron_secret'), gen_random_uuid()::text)),
  ('resend_from_email', coalesce((SELECT value FROM public.app_settings WHERE key = 'resend_from_email'), ''))
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'cge-soft-email-hourly';

    PERFORM cron.schedule(
      'cge-soft-email-hourly',
      '15 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://gfgqjuhkbbnrybkbthku.supabase.co/functions/v1/cge-soft-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cge-cron-secret', coalesce((SELECT value FROM public.app_settings WHERE key = 'cge_cron_secret'), '')
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;

-- Fix shopify_orders SELECT 500 from RLS recursion on related-account policies.
CREATE OR REPLACE FUNCTION public.cge_customer_in_related_scope(_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shopify_customers target
    INNER JOIN public.shopify_customers scoped
      ON scoped.id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
    WHERE target.id = _customer_id
      AND (
        (
          length(regexp_replace(coalesce(scoped.phone, ''), '\D', '', 'g')) >= 8
          AND regexp_replace(coalesce(target.phone, ''), '\D', '', 'g')
            = regexp_replace(coalesce(scoped.phone, ''), '\D', '', 'g')
        )
        OR (
          position('@' IN lower(btrim(coalesce(scoped.email, '')))) > 1
          AND length(split_part(lower(btrim(scoped.email)), '@', 1)) >= 4
          AND lower(btrim(coalesce(target.email, '')))
            LIKE (split_part(lower(btrim(scoped.email)), '@', 1) || '@%')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.cge_order_in_related_scope(
  _customer_id UUID,
  _shopify_customer_id TEXT,
  _email TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shopify_customers c
    WHERE c.id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
      AND (
        (
          c.shopify_customer_id IS NOT NULL
          AND _shopify_customer_id = c.shopify_customer_id
        )
        OR (
          position('@' IN lower(btrim(coalesce(c.email, '')))) > 1
          AND length(split_part(lower(btrim(c.email)), '@', 1)) >= 4
          AND lower(btrim(coalesce(_email, '')))
            LIKE (split_part(lower(btrim(c.email)), '@', 1) || '@%')
        )
        OR (
          length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 8
          AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
            = regexp_replace(coalesce(
                (SELECT sc.phone FROM public.shopify_customers sc WHERE sc.id = _customer_id),
                ''
              ), '\D', '', 'g')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.cge_customer_in_related_scope(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cge_order_in_related_scope(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cge_customer_in_related_scope(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cge_order_in_related_scope(UUID, TEXT, TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS cge_orders_select ON public.shopify_orders;
CREATE POLICY cge_orders_select ON public.shopify_orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND (
        customer_id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR public.cge_order_in_related_scope(customer_id, shopify_customer_id, email)
      )
    )
  );

DROP POLICY IF EXISTS cge_customers_select ON public.shopify_customers;
CREATE POLICY cge_customers_select ON public.shopify_customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.is_cge(auth.uid())
      AND (
        id IN (SELECT customer_id FROM public.cge_visible_customer_ids(auth.uid()))
        OR public.cge_customer_in_related_scope(id)
      )
    )
  );

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';

