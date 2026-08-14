export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: { key: string; value: string | null; updated_at?: string | null };
        Insert: { key: string; value?: string | null; updated_at?: string | null };
        Update: { key?: string; value?: string | null; updated_at?: string | null };
        Relationships: [];
      };
      user_roles: {
        Row: { id: string; user_id: string; role: string; salesperson_name: string | null };
        Insert: { id?: string; user_id: string; role: string; salesperson_name?: string | null };
        Update: { id?: string; user_id?: string; role?: string; salesperson_name?: string | null };
        Relationships: [];
      };
      shopify_customers: {
        Row: {
          id: string;
          shopify_customer_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          sp_assigned: string | null;
          referred_by: string | null;
          total_orders: number | null;
          total_revenue: number | null;
          rfm_recency_days: number | null;
          rfm_group: string | null;
          email_unsubscribed?: boolean;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      shopify_orders: {
        Row: {
          id: string;
          customer_id: string | null;
          order_number: string | null;
          total: number | null;
          financial_status: string | null;
          shopify_created_at: string | null;
          processed_at: string | null;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      salesperson_customer_assignments: {
        Row: {
          id: string;
          customer_id: string;
          salesperson_user_id: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          salesperson_user_id: string;
          source?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["salesperson_customer_assignments"]["Insert"]>;
        Relationships: [];
      };
      cge_salesperson_assignments: {
        Row: {
          id: string;
          cge_user_id: string;
          salesperson_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cge_user_id: string;
          salesperson_user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cge_salesperson_assignments"]["Insert"]>;
        Relationships: [];
      };
      cge_followup_tasks: {
        Row: {
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
          recovered_order_id: string | null;
          recovered_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      cge_outreach_events: {
        Row: {
          id: string;
          task_id: string | null;
          customer_id: string;
          cge_user_id: string;
          channel: string;
          direction: string;
          outcome: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          customer_id: string;
          cge_user_id: string;
          channel: string;
          direction?: string;
          outcome?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
      cge_email_templates: {
        Row: {
          id: string;
          template_key: string;
          segment: string;
          day_offset: number;
          subject: string;
          html_body: string;
          text_body: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      cge_email_sends: {
        Row: {
          id: string;
          customer_id: string;
          template_key: string;
          day_offset: number;
          segment: string;
          resend_id: string | null;
          idempotency_key: string;
          status: string;
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      sync_logs: {
        Row: {
          id: string;
          sync_type: string;
          status: string;
          records_synced: number | null;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_cge_queue_page: {
        Args: {
          _viewer_user_id: string;
          _segment?: string;
          _search?: string | null;
          _tab?: string;
          _page?: number;
          _page_size?: number;
        };
        Returns: { row_data: Json; total_count: number }[];
      };
      get_cge_dashboard_kpis: {
        Args: {
          _viewer_user_id: string;
          _from_iso?: string | null;
          _to_iso?: string | null;
        };
        Returns: {
          open_tasks: number;
          vip_inactive: number;
          one_time_lapsed: number;
          lapsed_repeat: number;
          never_purchased: number;
          recovered_orders: number;
          outreach_count: number;
        }[];
      };
      refresh_cge_followup_tasks_cgeapp: { Args: Record<string, never>; Returns: number };
      enqueue_soft_prevention_emails_cgeapp: {
        Args: Record<string, never>;
        Returns: {
          customer_id: string;
          email: string;
          name: string;
          day_offset: number;
          segment: string;
          template_key: string;
          idempotency_key: string;
        }[];
      };
      refresh_customer_rfm_metrics: { Args: { _customer_ids?: string[] | null }; Returns: number };
      has_role: { Args: { _user_id: string; _role: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "salesperson" | "cge";
    };
    CompositeTypes: Record<string, never>;
  };
};
