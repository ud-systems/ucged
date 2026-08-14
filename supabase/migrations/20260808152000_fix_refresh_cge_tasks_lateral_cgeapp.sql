-- Fix invalid LATERAL reference; allow tasks without salesperson assignment;
-- derive recency from last order when RFM columns are still null.
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
      coalesce(
        c.rfm_recency_days,
        CASE
          WHEN last_ord.last_order_at IS NOT NULL
            THEN GREATEST(0, floor(extract(epoch FROM (now() - last_ord.last_order_at)) / 86400)::int)
          ELSE 9999
        END
      ) AS recency_days,
      c.rfm_group,
      c.total_revenue,
      (
        SELECT a.salesperson_user_id
        FROM public.salesperson_customer_assignments a
        WHERE a.customer_id = c.id
        ORDER BY CASE a.source WHEN 'sp_assigned' THEN 0 ELSE 1 END, a.created_at
        LIMIT 1
      ) AS salesperson_user_id
    FROM public.shopify_customers c
    LEFT JOIN LATERAL (
      SELECT MAX(COALESCE(o.processed_at, o.shopify_created_at, o.created_at)) AS last_order_at
      FROM public.shopify_orders o
      WHERE o.customer_id = c.id
        AND coalesce(o.test_order, false) = false
    ) last_ord ON true
  ),
  classified AS (
    SELECT
      e.*,
      CASE
        WHEN e.total_orders = 0 THEN 'never_purchased'
        WHEN coalesce(e.rfm_group, '') = 'Can Not Lose Them'
          OR (coalesce(e.total_revenue, 0) >= 1000 AND e.recency_days >= 90)
          THEN 'vip_inactive'
        WHEN e.total_orders = 1 AND e.recency_days >= 90 THEN 'one_time_lapsed'
        WHEN e.total_orders >= 2 AND e.recency_days >= 90 THEN 'lapsed_repeat'
        ELSE NULL
      END AS segment
    FROM eligible e
  ),
  filtered AS (
    SELECT *
    FROM classified
    WHERE segment IS NOT NULL
      AND (
        segment = 'never_purchased'
        OR recency_days >= 90
      )
  ),
  with_cge AS (
    SELECT
      f.*,
      (
        SELECT link.cge_user_id
        FROM public.cge_salesperson_assignments link
        WHERE link.salesperson_user_id = f.salesperson_user_id
        ORDER BY link.created_at
        LIMIT 1
      ) AS assigned_cge_user_id,
      CASE f.segment
        WHEN 'vip_inactive' THEN 10
        WHEN 'one_time_lapsed' THEN 20
        WHEN 'lapsed_repeat' THEN 30
        ELSE 40
      END AS priority
    FROM filtered f
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

  UPDATE public.cge_followup_tasks t
  SET
    status = 'recovered',
    recovered_at = coalesce(t.recovered_at, now()),
    recovered_order_id = sub.order_id,
    updated_at = now()
  FROM (
    SELECT DISTINCT ON (task.id)
      task.id AS task_id,
      ord.id AS order_id
    FROM public.cge_followup_tasks task
    INNER JOIN public.shopify_orders ord ON ord.customer_id = task.customer_id
    WHERE task.status IN ('open', 'in_progress', 'snoozed')
      AND coalesce(ord.test_order, false) = false
      AND COALESCE(ord.processed_at, ord.shopify_created_at, ord.created_at) >= task.created_at
    ORDER BY task.id, COALESCE(ord.processed_at, ord.shopify_created_at, ord.created_at) DESC
  ) sub
  WHERE t.id = sub.task_id;

  RETURN v_count;
END;
$$;
