import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isPreview, supabase } from "@/integrations/supabase/client";
import { PREVIEW_KPIS, PREVIEW_QUEUE_ROWS } from "@/lib/ui-preview";
import { UDDASH_APP_SETTINGS } from "@/lib/seed-credentials";
import { daysQuietFromOrders, emailLocalPart, normalizeDaysQuiet } from "@/lib/days-quiet";
import { MARKETING_CAMPAIGN_TEMPLATES } from "@/lib/marketing-campaign-templates";
import { toast } from "sonner";

/** Live days quiet from related-order emails for the current queue page.
 *  Only used when the queue RPC has not already returned live recency. */
async function resolveLiveDaysQuiet(rows: QueueRow[]): Promise<Map<string, number>> {
  const needs = rows.filter((row) => normalizeDaysQuiet(row.customer_recency_days, row.recency_days) == null);
  if (!needs.length) return new Map();

  const byLocal = new Map<string, string[]>();
  for (const row of needs) {
    const local = emailLocalPart(row.customer_email);
    if (!local) continue;
    const list = byLocal.get(local) || [];
    list.push(row.customer_id);
    byLocal.set(local, list);
  }

  const live = new Map<string, number>();
  await Promise.all(
    [...byLocal.entries()].map(async ([local, customerIds]) => {
      const { data } = await supabase
        .from("shopify_orders")
        .select("processed_at, shopify_created_at")
        .ilike("email", `${local}@%`)
        .order("shopify_created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const days = daysQuietFromOrders(data ? [data] : []);
      if (days == null) return;
      for (const id of customerIds) live.set(id, days);
    }),
  );
  return live;
}

function isRpcMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const code = error.code || "";
  const msg = (error.message || "").toLowerCase();
  return code === "PGRST202" || msg.includes("could not find the function");
}

function unwrapRpcRows<T extends Record<string, unknown>>(data: unknown): T[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    if (row && typeof row === "object" && "row_data" in row) {
      return (row as { row_data: T }).row_data;
    }
    return row as T;
  });
}

export type QueueRow = {
  id: string;
  customer_id: string;
  salesperson_user_id: string | null;
  assigned_cge_user_id: string | null;
  segment: string;
  status: string;
  priority: number;
  recency_days: number | null;
  rfm_group: string | null;
  last_outreach_at: string | null;
  scheduled_call_at?: string | null;
  created_at: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  sp_assigned: string | null;
  referred_by?: string | null;
  ownership_label?: string | null;
  total_orders: number | null;
  total_revenue: number | null;
  customer_rfm_group: string | null;
  customer_recency_days: number | null;
};

export function useCgeQueue(params: {
  viewerUserId?: string;
  segment?: string;
  search?: string;
  tab?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const {
    viewerUserId,
    segment = "all",
    search = "",
    tab = "all",
    page = 1,
    pageSize = 25,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: ["cge-queue", viewerUserId, segment, search, tab, page, pageSize, isPreview],
    enabled: enabled && Boolean(viewerUserId),
    queryFn: async () => {
      if (isPreview) {
        let rows = [...PREVIEW_QUEUE_ROWS] as QueueRow[];
        if (segment !== "all") rows = rows.filter((r) => r.segment === segment);
        if (tab === "assigned_to_me") rows = rows.filter((r) => r.assigned_cge_user_id === viewerUserId);
        if (tab === "overdue") rows = rows.filter((r) => !r.last_outreach_at);
        if (tab === "vip") rows = rows.filter((r) => r.segment === "vip_inactive");
        const q = search.trim().toLowerCase();
        if (q) {
          rows = rows.filter(
            (r) =>
              r.customer_name.toLowerCase().includes(q) ||
              (r.customer_email || "").toLowerCase().includes(q) ||
              (r.customer_phone || "").includes(q),
          );
        }
        const total = rows.length;
        const start = (page - 1) * pageSize;
        return { rows: rows.slice(start, start + pageSize), total };
      }
      const { data, error } = await supabase.rpc("get_cge_queue_page", {
        _viewer_user_id: viewerUserId!,
        _segment: segment,
        _search: search || null,
        _tab: tab,
        _page: page,
        _page_size: pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as { row_data: QueueRow; total_count: number }[];
      const total = Number(rows[0]?.total_count ?? 0);
      const mapped = rows.map((r) => r.row_data);
      const liveByCustomer = await resolveLiveDaysQuiet(mapped);
      return {
        rows: mapped.map((row) => {
          // Prefer live last related order, then customer RFM, then task snapshot.
          // Never surface the 9999 "no orders" sentinel.
          const quiet =
            liveByCustomer.get(row.customer_id) ??
            normalizeDaysQuiet(row.customer_recency_days, row.recency_days);
          return {
            ...row,
            recency_days: quiet,
            customer_recency_days: quiet,
          };
        }),
        total,
      };
    },
  });
}

export function useCgeDashboardKpis(viewerUserId?: string) {
  return useQuery({
    queryKey: ["cge-kpis", viewerUserId, isPreview],
    enabled: Boolean(viewerUserId),
    queryFn: async () => {
      if (isPreview) return { ...PREVIEW_KPIS };
      const { data, error } = await supabase.rpc("get_cge_dashboard_kpis", {
        _viewer_user_id: viewerUserId!,
      });
      if (error) throw error;
      const row = (data?.[0] ?? {}) as Record<string, number>;
      return {
        open_tasks: Number(row.open_tasks ?? 0),
        vip_inactive: Number(row.vip_inactive ?? 0),
        one_time_lapsed: Number(row.one_time_lapsed ?? 0),
        lapsed_repeat: Number(row.lapsed_repeat ?? 0),
        never_purchased: Number(row.never_purchased ?? 0),
        recovered_orders: Number(row.recovered_orders ?? 0),
        outreach_count: Number(row.outreach_count ?? 0),
      };
    },
  });
}

export type PerformanceSummary = {
  outreach_count: number;
  customers_touched: number;
  emails_sent: number;
  recoveries: number;
  closed_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  active_cges: number;
  points: number;
  streak: number | null;
  is_admin_view: boolean;
};

export type LeaderboardRow = {
  cge_user_id: string;
  display_name: string;
  outreach_count: number;
  customers_touched: number;
  emails_sent: number;
  recoveries: number;
  streak: number;
  points: number;
  rank: number;
};

export type TimeseriesPoint = {
  day: string;
  outreach_count: number;
  recoveries: number;
};

export type PerformanceActivity = {
  id: string;
  customer_id: string;
  cge_user_id: string;
  channel: string;
  outcome: string | null;
  created_at: string;
  customer_name: string | null;
  cge_name: string | null;
};

export type PerformanceDrilldown = {
  cge_user_id: string;
  display_name: string;
  outreach_total: number;
  outreach: {
    id: string;
    customer_id: string;
    channel: string;
    outcome: string | null;
    notes: string | null;
    created_at: string;
    customer_name: string | null;
    customer_email: string | null;
  }[];
  recoveries: {
    id: string;
    customer_id: string;
    segment: string;
    recovered_at: string;
    recovered_order_id: string | null;
    customer_name: string | null;
    order_number: string | null;
  }[];
};

function previewSummary(isAdmin: boolean): PerformanceSummary {
  return {
    outreach_count: 42,
    customers_touched: 18,
    emails_sent: 12,
    recoveries: 5,
    closed_tasks: 3,
    open_tasks: PREVIEW_KPIS.open_tasks,
    overdue_tasks: 4,
    active_cges: isAdmin ? 3 : 1,
    points: 42 + 3 * 18 + 10 * 5 + 2 * 12,
    streak: 4,
    is_admin_view: isAdmin,
  };
}

export function useCgePerformanceSummary(params: {
  viewerUserId?: string;
  from?: string;
  to?: string;
  isAdmin?: boolean;
}) {
  const { viewerUserId, from, to, isAdmin = false } = params;
  return useQuery({
    queryKey: ["cge-perf-summary", viewerUserId, from, to, isPreview],
    enabled: Boolean(viewerUserId && from && to),
    queryFn: async () => {
      if (isPreview) return previewSummary(isAdmin);
      const { data, error } = await supabase.rpc("get_cge_performance_summary", {
        _viewer_user_id: viewerUserId!,
        _from: from!,
        _to: to!,
      });
      if (error) throw error;
      const row = (data ?? {}) as Record<string, unknown>;
      return {
        outreach_count: Number(row.outreach_count ?? 0),
        customers_touched: Number(row.customers_touched ?? 0),
        emails_sent: Number(row.emails_sent ?? 0),
        recoveries: Number(row.recoveries ?? 0),
        closed_tasks: Number(row.closed_tasks ?? 0),
        open_tasks: Number(row.open_tasks ?? 0),
        overdue_tasks: Number(row.overdue_tasks ?? 0),
        active_cges: Number(row.active_cges ?? 0),
        points: Number(row.points ?? 0),
        streak: row.streak == null ? null : Number(row.streak),
        is_admin_view: Boolean(row.is_admin_view),
      } as PerformanceSummary;
    },
  });
}

export function useCgePerformanceLeaderboard(params: {
  viewerUserId?: string;
  from?: string;
  to?: string;
  enabled?: boolean;
}) {
  const { viewerUserId, from, to, enabled = true } = params;
  return useQuery({
    queryKey: ["cge-perf-leaderboard", viewerUserId, from, to, isPreview],
    enabled: enabled && Boolean(viewerUserId && from && to),
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            cge_user_id: "preview-cge-user",
            display_name: "Aiden Hudson",
            outreach_count: 28,
            customers_touched: 12,
            emails_sent: 8,
            recoveries: 3,
            streak: 5,
            points: 28 + 36 + 30 + 16,
            rank: 1,
          },
          {
            cge_user_id: "preview-cge-2",
            display_name: "Sam Rivera",
            outreach_count: 20,
            customers_touched: 9,
            emails_sent: 4,
            recoveries: 2,
            streak: 2,
            points: 20 + 27 + 20 + 8,
            rank: 2,
          },
          {
            cge_user_id: "preview-cge-3",
            display_name: "Jordan Lee",
            outreach_count: 14,
            customers_touched: 6,
            emails_sent: 2,
            recoveries: 1,
            streak: 1,
            points: 14 + 18 + 10 + 4,
            rank: 3,
          },
        ] as LeaderboardRow[];
      }
      const { data, error } = await supabase.rpc("get_cge_performance_leaderboard", {
        _viewer_user_id: viewerUserId!,
        _from: from!,
        _to: to!,
      });
      if (error) throw error;
      return ((data ?? []) as { row_data: LeaderboardRow }[]).map((r) => r.row_data);
    },
  });
}

export function useCgePerformanceTimeseries(params: {
  viewerUserId?: string;
  from?: string;
  to?: string;
}) {
  const { viewerUserId, from, to } = params;
  return useQuery({
    queryKey: ["cge-perf-timeseries", viewerUserId, from, to, isPreview],
    enabled: Boolean(viewerUserId && from && to),
    queryFn: async () => {
      if (isPreview) {
        const days: TimeseriesPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push({
            day: d.toISOString().slice(0, 10),
            outreach_count: 3 + ((7 - i) % 5),
            recoveries: i % 3 === 0 ? 1 : 0,
          });
        }
        return days;
      }
      const { data, error } = await supabase.rpc("get_cge_performance_timeseries", {
        _viewer_user_id: viewerUserId!,
        _from: from!,
        _to: to!,
      });
      if (error) throw error;
      return ((data ?? []) as { row_data: TimeseriesPoint }[]).map((r) => r.row_data);
    },
  });
}

export function useCgePerformanceActivity(params: {
  viewerUserId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { viewerUserId, from, to, limit = 20 } = params;
  return useQuery({
    queryKey: ["cge-perf-activity", viewerUserId, from, to, limit, isPreview],
    enabled: Boolean(viewerUserId && from && to),
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "a1",
            customer_id: "preview-customer",
            cge_user_id: "preview-cge-user",
            channel: "whatsapp",
            outcome: "replied",
            created_at: new Date().toISOString(),
            customer_name: "Preview Customer",
            cge_name: "Aiden Hudson",
          },
        ] as PerformanceActivity[];
      }
      const { data, error } = await supabase.rpc("get_cge_performance_activity", {
        _viewer_user_id: viewerUserId!,
        _from: from!,
        _to: to!,
        _limit: limit,
      });
      if (error) throw error;
      return ((data ?? []) as { row_data: PerformanceActivity }[]).map((r) => r.row_data);
    },
  });
}

export function useCgePerformanceDrilldown(params: {
  viewerUserId?: string;
  cgeUserId?: string | null;
  from?: string;
  to?: string;
  page?: number;
  enabled?: boolean;
}) {
  const { viewerUserId, cgeUserId, from, to, page = 1, enabled = true } = params;
  return useQuery({
    queryKey: ["cge-perf-drilldown", viewerUserId, cgeUserId, from, to, page, isPreview],
    enabled: enabled && Boolean(viewerUserId && cgeUserId && from && to),
    queryFn: async () => {
      if (isPreview) {
        return {
          cge_user_id: cgeUserId!,
          display_name: "Aiden Hudson",
          outreach_total: 28,
          outreach: [
            {
              id: "ev-1",
              customer_id: "preview-customer",
              channel: "call",
              outcome: "replied",
              notes: "Discussed restock",
              created_at: new Date().toISOString(),
              customer_name: "Preview Customer",
              customer_email: "preview@example.com",
            },
          ],
          recoveries: [
            {
              id: "t1",
              customer_id: "preview-customer",
              segment: "vip_inactive",
              recovered_at: new Date().toISOString(),
              recovered_order_id: "ord-1",
              customer_name: "Preview Customer",
              order_number: "#1042",
            },
          ],
        } as PerformanceDrilldown;
      }
      const { data, error } = await supabase.rpc("get_cge_performance_drilldown", {
        _viewer_user_id: viewerUserId!,
        _cge_user_id: cgeUserId!,
        _from: from!,
        _to: to!,
        _page: page,
        _page_size: 25,
      });
      if (error) throw error;
      return data as PerformanceDrilldown;
    },
  });
}

export function useRefreshCgeTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isPreview) return;
      const { error } = await supabase.rpc("refresh_cge_followup_tasks_cgeapp");
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cge-queue"] });
      void qc.invalidateQueries({ queryKey: ["cge-kpis"] });
    },
  });
}

export function useCustomerOrders(customerId?: string, limit = 50) {
  return useQuery({
    queryKey: ["customer-orders", customerId, limit, isPreview],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "ord-1",
            order_number: "#1042",
            total: 189,
            current_total: 189,
            currency_code: "AED",
            financial_status: "paid",
            fulfillment_status: "fulfilled",
            shopify_created_at: new Date(Date.now() - 86400000 * 100).toISOString(),
            processed_at: null,
            from_related_account: false,
          },
        ];
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc("get_cge_customer_orders", {
        _customer_id: customerId!,
        _limit: limit,
      });

      // RPC-first: empty array is a valid "no orders" result.
      if (!rpcError) {
        return unwrapRpcRows<Record<string, unknown>>(rpcData);
      }
      // Only fall back when the function itself is missing (migration not applied).
      if (!isRpcMissing(rpcError)) {
        throw rpcError;
      }

      // Fallback if RPC not applied yet
      const { data: customer, error: custErr } = await supabase
        .from("shopify_customers")
        .select("id, email, phone, shopify_customer_id")
        .eq("id", customerId!)
        .maybeSingle();
      if (custErr) throw custErr;

      const email = (customer?.email || "").trim().toLowerCase();
      const emailLocal = email.includes("@") ? email.split("@")[0] : "";
      const phoneDigits = (customer?.phone || "").replace(/\D/g, "");

      const filters: string[] = [`id.eq.${customerId}`];
      if (customer?.shopify_customer_id) {
        filters.push(`shopify_customer_id.eq.${customer.shopify_customer_id}`);
      }
      if (email) filters.push(`email.ilike.${email}`);
      if (emailLocal.length >= 4) filters.push(`email.ilike.${emailLocal}@%`);
      if (phoneDigits.length >= 8) filters.push(`phone.ilike.%${phoneDigits.slice(-10)}%`);

      const { data: related } = await supabase
        .from("shopify_customers")
        .select("id")
        .or(filters.join(","));
      const relatedIds = [...new Set((related || []).map((r) => r.id).concat(customerId!))];

      const selectCols =
        "id, order_number, total, current_total, original_total, financial_status, fulfillment_status, shopify_created_at, processed_at, currency_code, customer_id, shopify_customer_id, email";

      const { data: byCustomer, error } = await supabase
        .from("shopify_orders")
        .select(selectCols)
        .in("customer_id", relatedIds)
        .order("shopify_created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      let rows = (byCustomer || []).map((o) => ({
        ...o,
        from_related_account: o.customer_id !== customerId,
      }));

      if (rows.length < limit && (emailLocal.length >= 4 || customer?.shopify_customer_id)) {
        const seen = new Set(rows.map((r) => r.id));
        const orParts: string[] = [];
        if (customer?.shopify_customer_id) {
          orParts.push(`shopify_customer_id.eq.${customer.shopify_customer_id}`);
        }
        if (emailLocal.length >= 4) orParts.push(`email.ilike.${emailLocal}@%`);
        if (orParts.length) {
          const { data: extra } = await supabase
            .from("shopify_orders")
            .select(selectCols)
            .or(orParts.join(","))
            .order("shopify_created_at", { ascending: false })
            .limit(limit);
          for (const o of extra || []) {
            if (seen.has(o.id)) continue;
            seen.add(o.id);
            rows.push({ ...o, from_related_account: o.customer_id !== customerId });
          }
          rows.sort((a, b) => {
            const ta = a.shopify_created_at ? new Date(a.shopify_created_at).getTime() : 0;
            const tb = b.shopify_created_at ? new Date(b.shopify_created_at).getTime() : 0;
            return tb - ta;
          });
          rows = rows.slice(0, limit);
        }
      }

      return rows;
    },
  });
}

export type CustomerBundle = {
  customer: Record<string, unknown> | null;
  open_task: Record<string, unknown> | null;
  orders: Record<string, unknown>[];
  days_quiet: number | null;
};

/** Single RPC for customer page: profile + open task + related orders + days quiet. */
export function useCustomerBundle(customerId?: string, ordersLimit = 500) {
  return useQuery({
    queryKey: ["customer-bundle", customerId, ordersLimit, isPreview],
    enabled: Boolean(customerId),
    queryFn: async (): Promise<CustomerBundle> => {
      if (isPreview) {
        return {
          customer: {
            id: customerId!,
            name: "Preview Customer",
            email: "preview@example.com",
            phone: "+971500000000",
            sp_assigned: "Neil Gill",
            referred_by: "Neil Gill",
            total_orders: 3,
            total_revenue: 1200,
            spend_currency: "AED",
            rfm_group: "At Risk",
            rfm_recency_days: 120,
          },
          open_task: { id: "task-1", segment: "vip_inactive", status: "open" },
          orders: [
            {
              id: "ord-1",
              order_number: "#1042",
              total: 189,
              current_total: 189,
              currency_code: "AED",
              financial_status: "paid",
              fulfillment_status: "fulfilled",
              shopify_created_at: new Date(Date.now() - 86400000 * 100).toISOString(),
              from_related_account: false,
            },
          ],
          days_quiet: 100,
        };
      }

      const { data, error } = await supabase.rpc("get_cge_customer_bundle", {
        _customer_id: customerId!,
        _orders_limit: ordersLimit,
      });

      if (!error && data && typeof data === "object") {
        const bundle = data as {
          customer?: Record<string, unknown> | null;
          open_task?: Record<string, unknown> | null;
          orders?: Record<string, unknown>[] | null;
          days_quiet?: number | null;
        };
        return {
          customer: bundle.customer ?? null,
          open_task: bundle.open_task ?? null,
          orders: Array.isArray(bundle.orders) ? bundle.orders : [],
          days_quiet: typeof bundle.days_quiet === "number" ? bundle.days_quiet : normalizeDaysQuiet(bundle.days_quiet),
        };
      }

      if (error && !isRpcMissing(error)) throw error;

      // Fallback: parallel table reads if bundle RPC missing
      const [detail, orders, task] = await Promise.all([
        supabase
          .from("shopify_customers")
          .select(
            "id, name, email, phone, sp_assigned, referred_by, total_orders, total_revenue, spend_currency, rfm_group, rfm_recency_days, tags, customer_note",
          )
          .eq("id", customerId!)
          .maybeSingle(),
        supabase.rpc("get_cge_customer_orders", { _customer_id: customerId!, _limit: ordersLimit }),
        supabase
          .from("cge_followup_tasks")
          .select("id, segment, status, assigned_cge_user_id, priority, recency_days, scheduled_call_at")
          .eq("customer_id", customerId!)
          .in("status", ["open", "in_progress", "snoozed"])
          .order("priority", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (detail.error) throw detail.error;
      if (task.error) throw task.error;

      let orderRows: Record<string, unknown>[] = [];
      if (!orders.error) {
        orderRows = unwrapRpcRows(orders.data);
      } else if (!isRpcMissing(orders.error)) {
        throw orders.error;
      }

      return {
        customer: (detail.data as Record<string, unknown> | null) ?? null,
        open_task: (task.data as Record<string, unknown> | null) ?? null,
        orders: orderRows,
        days_quiet: daysQuietFromOrders(
          orderRows as Array<{ processed_at?: string | null; shopify_created_at?: string | null }>,
          (detail.data as { rfm_recency_days?: number | null } | null)?.rfm_recency_days,
        ),
      };
    },
  });
}

export function useCustomerDetail(customerId?: string) {
  return useQuery({
    queryKey: ["customer-detail", customerId, isPreview],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (isPreview) {
        return {
          id: customerId!,
          name: "Preview Customer",
          email: "preview@example.com",
          phone: "+971500000000",
          sp_assigned: "Neil Gill",
          referred_by: "Neil Gill",
          total_orders: 3,
          total_revenue: 1200,
          spend_currency: "AED",
          rfm_group: "At Risk",
          rfm_recency_days: 120,
        };
      }
      const { data, error } = await supabase
        .from("shopify_customers")
        .select(
          "id, name, email, phone, sp_assigned, referred_by, total_orders, total_revenue, spend_currency, rfm_group, rfm_recency_days, tags, customer_note",
        )
        .eq("id", customerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerOpenTask(customerId?: string) {
  return useQuery({
    queryKey: ["customer-open-task", customerId, isPreview],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (isPreview) return { id: "task-1", segment: "vip_inactive", status: "open" };
      const { data, error } = await supabase
        .from("cge_followup_tasks")
        .select("id, segment, status, assigned_cge_user_id, priority, recency_days, scheduled_call_at")
        .eq("customer_id", customerId!)
        .in("status", ["open", "in_progress", "snoozed"])
        .order("priority", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOrderDetail(orderId?: string) {
  return useQuery({
    queryKey: ["order-detail", orderId, isPreview],
    enabled: Boolean(orderId),
    queryFn: async () => {
      if (isPreview) {
        return {
          order: {
            id: orderId!,
            order_number: "#1042",
            customer_id: "preview-customer",
            customer_name: "Preview Customer",
            email: "preview@example.com",
            total: 189,
            current_total: 189,
            original_total: 189,
            subtotal: 170,
            total_tax: 19,
            financial_status: "paid",
            fulfillment_status: "fulfilled",
            currency_code: "AED",
            shopify_created_at: new Date().toISOString(),
            order_note: null,
            shipping_name: null,
            shipping_address1: null,
            shipping_address2: null,
            shipping_city: null,
            shipping_province: null,
            shipping_country: null,
            shipping_zip: null,
          },
          items: [
            { id: "li-1", product: "Sample Product", variant: "Default", sku: "SKU-1", quantity: 1, price: 189 },
          ],
        };
      }
      const { data: order, error } = await supabase
        .from("shopify_orders")
        .select(
          "id, order_number, customer_id, customer_name, email, total, current_total, original_total, subtotal, total_tax, financial_status, fulfillment_status, currency_code, shopify_created_at, order_note, shipping_name, shipping_address1, shipping_address2, shipping_city, shipping_province, shipping_country, shipping_zip, tags",
        )
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;
      if (!order) return { order: null, items: [] };
      const { data: items, error: itemsErr } = await supabase
        .from("shopify_order_items")
        .select("id, product, variant, sku, quantity, price")
        .eq("order_id", orderId!);
      if (itemsErr) throw itemsErr;
      return { order, items: items ?? [] };
    },
  });
}

export function useOutreachEvents(customerId?: string) {
  return useQuery({
    queryKey: ["outreach", customerId, isPreview],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "ev-1",
            customer_id: customerId,
            channel: "whatsapp",
            outcome: "replied",
            notes: "Asked about restock timing.",
            created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
          },
        ];
      }
      const { data, error } = await supabase
        .from("cge_outreach_events")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLogOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      task_id?: string | null;
      customer_id: string;
      cge_user_id: string;
      channel: "call" | "whatsapp" | "sms" | "email";
      outcome?: string | null;
      notes?: string | null;
    }) => {
      if (isPreview) {
        toast.message("Preview mode — outreach not persisted");
        return;
      }
      const { error } = await supabase.from("cge_outreach_events").insert({
        task_id: payload.task_id ?? null,
        customer_id: payload.customer_id,
        cge_user_id: payload.cge_user_id,
        channel: payload.channel,
        outcome: payload.outcome ?? null,
        notes: payload.notes ?? null,
      });
      if (error) throw error;
      if (payload.task_id) {
        await supabase
          .from("cge_followup_tasks")
          .update({ last_outreach_at: new Date().toISOString(), status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", payload.task_id);
      }
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["outreach", vars.customer_id] });
      void qc.invalidateQueries({ queryKey: ["cge-queue"] });
      void qc.invalidateQueries({ queryKey: ["cge-kpis"] });
      void qc.invalidateQueries({ queryKey: ["cge-followups"] });
    },
  });
}

export function useScheduleCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      customer_id: string;
      cge_user_id: string;
      scheduled_call_at: string;
      notes?: string | null;
    }) => {
      if (isPreview) {
        toast.message("Preview mode — call not scheduled");
        return;
      }
      const when = new Date(payload.scheduled_call_at);
      if (Number.isNaN(when.getTime())) throw new Error("Invalid schedule time");
      if (when.getTime() <= Date.now()) throw new Error("Pick a future date and time");

      const { error: taskErr } = await supabase
        .from("cge_followup_tasks")
        .update({
          scheduled_call_at: when.toISOString(),
          status: "snoozed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.task_id);
      if (taskErr) throw taskErr;

      const noteParts = [
        `Scheduled call for ${when.toLocaleString()}`,
        payload.notes?.trim() || null,
      ].filter(Boolean);

      const { error: outreachErr } = await supabase.from("cge_outreach_events").insert({
        task_id: payload.task_id,
        customer_id: payload.customer_id,
        cge_user_id: payload.cge_user_id,
        channel: "call",
        outcome: "booked_call",
        notes: noteParts.join(" — "),
      });
      if (outreachErr) throw outreachErr;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["outreach", vars.customer_id] });
      void qc.invalidateQueries({ queryKey: ["cge-queue"] });
      void qc.invalidateQueries({ queryKey: ["cge-followups"] });
      void qc.invalidateQueries({ queryKey: ["cge-kpis"] });
      void qc.invalidateQueries({ queryKey: ["customer-open-task", vars.customer_id] });
    },
  });
}

export function useClearScheduledCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { task_id: string; customer_id: string }) => {
      if (isPreview) {
        toast.message("Preview mode — schedule not cleared");
        return;
      }
      const { error } = await supabase
        .from("cge_followup_tasks")
        .update({
          scheduled_call_at: null,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.task_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["cge-queue"] });
      void qc.invalidateQueries({ queryKey: ["cge-followups"] });
      void qc.invalidateQueries({ queryKey: ["customer-open-task", vars.customer_id] });
    },
  });
}

export function useCgeSalespersonLinks() {
  return useQuery({
    queryKey: ["cge-sp-links", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [
          { id: "link-1", cge_user_id: "preview-cge-user", salesperson_user_id: "sp-1", created_at: new Date().toISOString() },
          { id: "link-2", cge_user_id: "preview-cge-user", salesperson_user_id: "sp-2", created_at: new Date().toISOString() },
        ];
      }
      const { data, error } = await supabase
        .from("cge_salesperson_assignments")
        .select("id, cge_user_id, salesperson_user_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSalespeopleOptions() {
  return useQuery({
    queryKey: ["salespeople-options", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [
          { user_id: "sp-1", label: "Rob Lister" },
          { user_id: "sp-2", label: "Sam Patel" },
        ];
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, salesperson_name, role")
        .eq("role", "salesperson");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        user_id: r.user_id as string,
        label: (r.salesperson_name as string) || r.user_id,
      }));
    },
  });
}

export function useCgeUsersOptions() {
  return useQuery({
    queryKey: ["cge-users-options", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [{ user_id: "preview-cge-user", label: "Aiden Hudson" }];
      }
      const { data, error } = await supabase.from("user_roles").select("user_id, salesperson_name, role").eq("role", "cge");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        user_id: r.user_id as string,
        label: (r.salesperson_name as string) || r.user_id,
      }));
    },
  });
}

export function useTriggerShopifySync() {
  return useMutation({
    mutationFn: async (module?: string) => {
      if (isPreview) {
        toast.message("Preview mode — sync requires Supabase");
        return { preview: true, module };
      }
      const { data, error } = await supabase.functions.invoke("shopify-sync", {
        body: module ? { module } : {},
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return {
          ...UDDASH_APP_SETTINGS,
          resend_from_email: UDDASH_APP_SETTINGS.resend_from_email || "",
        };
      }
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value ?? "";
      return map;
    },
  });
}

export function useSaveAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      if (isPreview) {
        toast.message("Preview mode — settings not saved");
        return;
      }
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["app-settings"] }),
  });
}

export type EmailTemplate = {
  id: string;
  template_key: string;
  name?: string | null;
  template_kind?: string | null;
  segment?: string | null;
  day_offset?: number | null;
  subject: string;
  html_body?: string;
  text_body?: string | null;
  variables?: unknown;
  active?: boolean;
};

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["cge-email-templates", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "t1",
            template_key: "one_time_60",
            name: "One-time day 60",
            template_kind: "soft",
            segment: "one_time",
            day_offset: 60,
            subject: "Still finding what you need?",
            html_body: "<p>Hi {{name}}</p>",
            text_body: "Hi {{name}}",
            active: true,
          },
          {
            id: "t2",
            template_key: "vip_60",
            name: "VIP day 60",
            template_kind: "soft",
            segment: "vip",
            day_offset: 60,
            subject: "A personal note from our team",
            html_body: "<p>Hi {{name}}</p>",
            active: true,
          },
          ...MARKETING_CAMPAIGN_TEMPLATES.slice(0, 8).map((t, i) => ({
            ...t,
            id: `mkt-preview-${i}`,
          })),
        ] as EmailTemplate[];
      }
      const { data, error } = await supabase
        .from("cge_email_templates")
        .select("*")
        .order("template_kind")
        .order("segment")
        .order("day_offset");
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
  });
}

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<EmailTemplate> & { template_key: string; subject: string; html_body: string }) => {
      if (isPreview) {
        toast.message("Preview mode — template not saved");
        return;
      }
      const row = {
        ...payload,
        name: payload.name || payload.template_key,
        template_kind: payload.template_kind || "marketing",
        updated_at: new Date().toISOString(),
      };
      if (payload.id) {
        const { error } = await supabase.from("cge_email_templates").update(row).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cge_email_templates").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cge-email-templates"] }),
  });
}

/** Upsert the Unique Distribution wholesale marketing pack (by template_key). */
export function useImportMarketingTemplatePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isPreview) {
        toast.message("Preview mode — pack not imported to Supabase");
        return { count: MARKETING_CAMPAIGN_TEMPLATES.length };
      }
      let count = 0;
      for (const t of MARKETING_CAMPAIGN_TEMPLATES) {
        const row = {
          template_key: t.template_key,
          name: t.name,
          template_kind: t.template_kind,
          segment: t.segment,
          day_offset: t.day_offset,
          subject: t.subject,
          html_body: t.html_body,
          text_body: t.text_body,
          active: t.active,
          variables: t.variables,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("cge_email_templates").upsert(row, { onConflict: "template_key" });
        if (error) throw error;
        count += 1;
      }
      return { count };
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["cge-email-templates"] });
      toast.success(`Imported ${res?.count ?? 0} wholesale campaign templates`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });
}

export type FollowUpRow = {
  id: string;
  customer_id: string;
  segment: string;
  status: string;
  priority: number;
  recency_days: number | null;
  last_outreach_at: string | null;
  scheduled_call_at?: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  ownership_label?: string | null;
  outreach_count?: number;
  last_outreach_channel?: string | null;
};

export function useCgeFollowups(params: {
  viewerUserId?: string;
  segment?: string;
  status?: string;
  search?: string;
  assignedToMe?: boolean;
  hasOutreach?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    viewerUserId,
    segment = "all",
    status = "all",
    search = "",
    assignedToMe = false,
    hasOutreach = "all",
    page = 1,
    pageSize = 25,
  } = params;

  return useQuery({
    queryKey: ["cge-followups", viewerUserId, segment, status, search, assignedToMe, hasOutreach, page, pageSize, isPreview],
    enabled: Boolean(viewerUserId),
    queryFn: async () => {
      if (isPreview) {
        let rows = [...PREVIEW_QUEUE_ROWS] as FollowUpRow[];
        const q = search.trim().toLowerCase();
        if (q) {
          rows = rows.filter(
            (r) =>
              r.customer_name.toLowerCase().includes(q) ||
              (r.customer_email || "").toLowerCase().includes(q) ||
              (r.customer_phone || "").includes(q),
          );
        }
        return { rows: rows.slice(0, pageSize), total: rows.length };
      }
      const { data, error } = await supabase.rpc("get_cge_followups_page", {
        _viewer_user_id: viewerUserId!,
        _segment: segment,
        _status: status,
        _search: search || null,
        _assigned_to_me: assignedToMe,
        _has_outreach: hasOutreach,
        _page: page,
        _page_size: pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as { row_data: FollowUpRow; total_count: number }[];
      return { rows: rows.map((r) => r.row_data), total: Number(rows[0]?.total_count ?? 0) };
    },
  });
}

export type OrdersBrowseRow = {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  email: string | null;
  total: number | null;
  current_total: number | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  shopify_created_at: string | null;
  ownership_label?: string | null;
  currency_code?: string | null;
};

export function useCgeOrdersBrowse(params: {
  viewerUserId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { viewerUserId, search = "", page = 1, pageSize = 25 } = params;
  return useQuery({
    queryKey: ["cge-orders-browse", viewerUserId, search, page, pageSize, isPreview],
    enabled: Boolean(viewerUserId),
    queryFn: async () => {
      if (isPreview) {
        return {
          rows: [
            {
              id: "ord-1",
              order_number: "#1042",
              customer_id: "preview-customer",
              customer_name: "Preview Customer",
              email: "preview@example.com",
              total: 189,
              current_total: 189,
              financial_status: "paid",
              fulfillment_status: "fulfilled",
              shopify_created_at: new Date().toISOString(),
              ownership_label: "Neil Gill",
              currency_code: "AED",
            },
          ] as OrdersBrowseRow[],
          total: 1,
        };
      }
      const { data, error } = await supabase.rpc("get_cge_orders_page", {
        _viewer_user_id: viewerUserId!,
        _search: search || null,
        _page: page,
        _page_size: pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as { row_data: OrdersBrowseRow; total_count: number }[];
      return { rows: rows.map((r) => r.row_data), total: Number(rows[0]?.total_count ?? 0) };
    },
  });
}

export function useGrokDraft() {
  return useMutation({
    mutationFn: async (payload: {
      customer_id?: string;
      channel: "call" | "whatsapp" | "sms" | "email";
      intent?: string;
      tone?: string;
      mode?: "customer" | "template";
      subject?: string;
      html_body?: string;
    }) => {
      if (isPreview) {
        return {
          subject: payload.subject || (payload.channel === "email" ? "Checking in" : null),
          body: payload.html_body || "Hi — preview AI draft for this customer.",
          bullets: ["Warm open", "Offer help", "Ask permission"],
          warnings: ["Preview mode"],
        };
      }
      const { getAccessTokenForEdgeFunctions, parseEdgeFunctionErrorPayload } = await import("@/lib/supabase-edge-auth");
      const token = await getAccessTokenForEdgeFunctions();
      const { data, error } = await supabase.functions.invoke("cge-grok-draft", {
        body: payload,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const msg = parseEdgeFunctionErrorPayload(data, error);
      if (msg) throw new Error(msg);
      return data as { subject?: string | null; body: string; bullets?: string[]; warnings?: string[] };
    },
  });
}

export type Campaign = {
  id: string;
  name: string;
  status: string;
  template_id: string | null;
  subject_override: string | null;
  from_email: string | null;
  scheduled_at: string | null;
  audience: Record<string, unknown>;
  stats: Record<string, unknown>;
  created_at: string;
  error_message?: string | null;
};

export function useCampaigns() {
  return useQuery({
    queryKey: ["cge-campaigns", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "camp-1",
            name: "VIP win-back",
            status: "draft",
            template_id: "t3",
            subject_override: null,
            from_email: null,
            scheduled_at: null,
            audience: { preset: "queue_segment", segment: "vip_inactive" },
            stats: {},
            created_at: new Date().toISOString(),
          },
        ] as Campaign[];
      }
      const { data, error } = await supabase.from("cge_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });
}

export function useCampaign(campaignId?: string) {
  return useQuery({
    queryKey: ["cge-campaign", campaignId, isPreview],
    enabled: Boolean(campaignId),
    queryFn: async () => {
      if (isPreview) {
        return {
          campaign: {
            id: campaignId!,
            name: "VIP win-back",
            status: "draft",
            template_id: "t3",
            subject_override: null,
            from_email: null,
            scheduled_at: null,
            audience: { preset: "queue_segment", segment: "vip_inactive" },
            stats: {},
            created_at: new Date().toISOString(),
          } as Campaign,
          recipients: [] as { id: string; email: string; status: string; error_message?: string | null }[],
        };
      }
      const { data: campaign, error } = await supabase.from("cge_campaigns").select("*").eq("id", campaignId!).maybeSingle();
      if (error) throw error;
      const { data: recipients, error: rErr } = await supabase
        .from("cge_campaign_recipients")
        .select("id, email, status, error_message, sent_at, customer_id")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (rErr) throw rErr;
      return { campaign: campaign as Campaign | null, recipients: recipients ?? [] };
    },
  });
}

export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Campaign> & { name: string; created_by?: string }) => {
      if (isPreview) {
        toast.message("Preview mode — campaign not saved");
        return { id: "camp-preview" };
      }
      if (payload.id) {
        const { id, created_by: _cb, ...rest } = payload;
        const { data, error } = await supabase
          .from("cge_campaigns")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("cge_campaigns")
        .insert({
          name: payload.name,
          status: payload.status || "draft",
          template_id: payload.template_id ?? null,
          subject_override: payload.subject_override ?? null,
          from_email: payload.from_email ?? null,
          scheduled_at: payload.scheduled_at ?? null,
          audience: payload.audience ?? { preset: "queue_segment", segment: "vip_inactive" },
          created_by: payload.created_by ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cge-campaigns"] });
      void qc.invalidateQueries({ queryKey: ["cge-campaign"] });
    },
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (isPreview) {
        toast.message("Preview mode — send skipped");
        return;
      }
      const { getAccessTokenForEdgeFunctions, parseEdgeFunctionErrorPayload } = await import("@/lib/supabase-edge-auth");
      const token = await getAccessTokenForEdgeFunctions();
      const { data, error } = await supabase.functions.invoke("cge-campaign-send", {
        body: { campaign_id: campaignId, batch_size: 50 },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const msg = parseEdgeFunctionErrorPayload(data, error);
      if (msg) throw new Error(msg);
      return data;
    },
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ["cge-campaign", id] });
      void qc.invalidateQueries({ queryKey: ["cge-campaigns"] });
    },
  });
}

export function useEmailSuppressions() {
  return useQuery({
    queryKey: ["cge-suppressions", isPreview],
    queryFn: async () => {
      if (isPreview) return [{ id: "s1", email: "bounce@example.com", reason: "hard_bounce", source: "manual" }];
      const { data, error } = await supabase
        .from("cge_email_suppressions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type MailIdentity = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  active: boolean;
};

export function useMailIdentities() {
  return useQuery({
    queryKey: ["cge-mail-identities", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "mi-1",
            user_id: "preview-cge-user",
            email: "aiden@unique.example",
            display_name: "Aiden Hudson",
            active: true,
          },
        ] as MailIdentity[];
      }
      const { data, error } = await supabase
        .from("cge_mail_identities")
        .select("id, user_id, email, display_name, active")
        .order("email");
      if (error) throw error;
      return (data ?? []) as MailIdentity[];
    },
  });
}

export function useMyMailIdentity(userId?: string) {
  return useQuery({
    queryKey: ["cge-my-mail-identity", userId, isPreview],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (isPreview) {
        return {
          id: "mi-1",
          user_id: userId!,
          email: "aiden@unique.example",
          display_name: "Aiden Hudson",
          active: true,
        } as MailIdentity;
      }
      const { data, error } = await supabase
        .from("cge_mail_identities")
        .select("id, user_id, email, display_name, active")
        .eq("user_id", userId!)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data as MailIdentity | null;
    },
  });
}

export function useSaveMailIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      user_id: string;
      email: string;
      display_name: string;
      active?: boolean;
    }) => {
      if (isPreview) {
        toast.message("Preview mode — mail identity not saved");
        return;
      }
      const row = {
        user_id: payload.user_id,
        email: payload.email.trim().toLowerCase(),
        display_name: payload.display_name.trim(),
        active: payload.active !== false,
        updated_at: new Date().toISOString(),
      };
      if (payload.id) {
        const { error } = await supabase.from("cge_mail_identities").update(row).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cge_mail_identities").upsert(row, { onConflict: "user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cge-mail-identities"] });
      void qc.invalidateQueries({ queryKey: ["cge-my-mail-identity"] });
    },
  });
}

export type EmailThread = {
  id: string;
  customer_id: string;
  subject: string;
  assigned_user_id: string | null;
  status: string;
  last_message_at: string | null;
  unread_inbound: boolean;
};

export type EmailMessage = {
  id: string;
  thread_id: string;
  customer_id: string;
  direction: "outbound" | "inbound";
  from_email: string;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  created_at: string;
  created_by: string | null;
};

export function useCustomerEmailThreads(customerId?: string) {
  return useQuery({
    queryKey: ["cge-email-threads", customerId, isPreview],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "th-1",
            customer_id: customerId!,
            subject: "Checking in",
            assigned_user_id: "preview-cge-user",
            status: "open",
            last_message_at: new Date().toISOString(),
            unread_inbound: false,
          },
        ] as EmailThread[];
      }
      const { data, error } = await supabase
        .from("cge_email_threads")
        .select("id, customer_id, subject, assigned_user_id, status, last_message_at, unread_inbound")
        .eq("customer_id", customerId!)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as EmailThread[];
    },
  });
}

export function useEmailMessages(threadId?: string | null) {
  return useQuery({
    queryKey: ["cge-email-messages", threadId, isPreview],
    enabled: Boolean(threadId),
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "msg-1",
            thread_id: threadId!,
            customer_id: "preview-customer",
            direction: "outbound",
            from_email: "aiden@unique.example",
            to_email: "preview@example.com",
            subject: "Checking in",
            body_text: "Hi — hope you are well.",
            body_html: "<p>Hi — hope you are well.</p>",
            created_at: new Date().toISOString(),
            created_by: "preview-cge-user",
          },
        ] as EmailMessage[];
      }
      const { data, error } = await supabase
        .from("cge_email_messages")
        .select(
          "id, thread_id, customer_id, direction, from_email, to_email, subject, body_text, body_html, created_at, created_by",
        )
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmailMessage[];
    },
  });
}

export function useSendCgeMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      subject: string;
      body_text?: string;
      body_html?: string;
      thread_id?: string | null;
      task_id?: string | null;
    }) => {
      if (isPreview) {
        toast.message("Preview mode — email not sent");
        return { ok: true, thread_id: "th-1" };
      }
      const { getAccessTokenForEdgeFunctions, parseEdgeFunctionErrorPayload } = await import("@/lib/supabase-edge-auth");
      const token = await getAccessTokenForEdgeFunctions();
      const { data, error } = await supabase.functions.invoke("cge-mail-send", {
        body: payload,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const msg = parseEdgeFunctionErrorPayload(data, error);
      if (msg) throw new Error(msg);
      return data as { ok: boolean; thread_id: string; from?: string };
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["cge-email-threads", vars.customer_id] });
      void qc.invalidateQueries({ queryKey: ["cge-email-messages"] });
      void qc.invalidateQueries({ queryKey: ["outreach", vars.customer_id] });
      void qc.invalidateQueries({ queryKey: ["cge-mail-inbox"] });
      void qc.invalidateQueries({ queryKey: ["cge-queue"] });
      void qc.invalidateQueries({ queryKey: ["cge-followups"] });
    },
  });
}

export function useMailInbox(params: {
  viewerUserId?: string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { viewerUserId, unreadOnly = false, page = 1, pageSize = 25 } = params;
  return useQuery({
    queryKey: ["cge-mail-inbox", viewerUserId, unreadOnly, page, pageSize, isPreview],
    enabled: Boolean(viewerUserId),
    queryFn: async () => {
      if (isPreview) {
        return {
          rows: [
            {
              id: "th-1",
              customer_id: "preview-customer",
              customer_name: "Preview Customer",
              customer_email: "preview@example.com",
              subject: "Checking in",
              unread_inbound: true,
              last_message_at: new Date().toISOString(),
            },
          ],
          total: 1,
        };
      }
      const { data, error } = await supabase.rpc("get_cge_mail_inbox_page", {
        _viewer_user_id: viewerUserId!,
        _unread_only: unreadOnly,
        _page: page,
        _page_size: pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as { row_data: Record<string, unknown>; total_count: number }[];
      return { rows: rows.map((r) => r.row_data), total: Number(rows[0]?.total_count ?? 0) };
    },
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (isPreview) return;
      const { error } = await supabase
        .from("cge_email_threads")
        .update({ unread_inbound: false, updated_at: new Date().toISOString() })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cge-mail-inbox"] });
      void qc.invalidateQueries({ queryKey: ["cge-email-threads"] });
    },
  });
}

export function useOffboardCge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { user_id: string; successor_user_id?: string | null; ban_auth?: boolean }) => {
      if (isPreview) {
        toast.message("Preview mode — offboard skipped");
        return { ok: true };
      }
      const { data, error } = await supabase.rpc("offboard_cge_user_cgeapp", {
        _user_id: payload.user_id,
        _successor_user_id: payload.successor_user_id ?? null,
        _disable_auth: true,
      });
      if (error) throw error;

      if (payload.ban_auth !== false) {
        const { getAccessTokenForEdgeFunctions, parseEdgeFunctionErrorPayload } = await import("@/lib/supabase-edge-auth");
        const token = await getAccessTokenForEdgeFunctions();
        const { data: banData, error: banErr } = await supabase.functions.invoke("admin-users", {
          body: { action: "ban", user_id: payload.user_id },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const banMsg = parseEdgeFunctionErrorPayload(banData, banErr);
        if (banMsg) throw new Error(banMsg);
      }
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cge-mail-identities"] });
      void qc.invalidateQueries({ queryKey: ["cge-queue"] });
      void qc.invalidateQueries({ queryKey: ["cge-users-options"] });
    },
  });
}

export function useSyncLogs() {
  return useQuery({
    queryKey: ["sync-logs", isPreview],
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "log-1",
            sync_type: "customers",
            status: "success",
            records_synced: 1204,
            started_at: new Date(Date.now() - 3600000).toISOString(),
            error_message: null,
          },
          {
            id: "log-2",
            sync_type: "orders",
            status: "success",
            records_synced: 388,
            started_at: new Date(Date.now() - 3500000).toISOString(),
            error_message: null,
          },
        ];
      }
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: isPreview ? false : 15000,
  });
}
