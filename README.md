# CGE Webapp (Customer Growth Engine)

Standalone follow-up workspace for inactive Shopify customers. Built next to `uddash-main` but **never modifies** that repo.

## Stack

- Vite + React + TypeScript + shadcn/ui
- Supabase (separate project from uddash)
- DataPulseFlow Shopify sync (same license + same Shopify Custom App)
- Resend for day-60 / day-75 soft prevention emails

## Locked product rules

| Window | Mode |
|--------|------|
| 60 + 75 days quiet | Soft auto emails (Resend, segment templates) |
| 90+ days quiet | Human CGE queue (call / WhatsApp / SMS / email) |

Queues: VIP inactive → one-time lapsed → lapsed repeat → never purchased (assigned).

Ownership: CGE linked to salesperson(s) → customers from Shopify `SP_Assigned` / `referred_by` via `salesperson_customer_assignments`.

## Setup

1. Create a **new** Supabase project (CGE-only).
2. Copy `.env.example` → `.env` with CGE URL + anon key + project ref.
3. Replace `YOUR_CGE_SUPABASE_REF` in:
   - `supabase/migrations/20260326100000_shopify_reconcile_scheduler_cgeapp.sql`
   - `supabase/migrations/20260808140000_cge_soft_email_cron_cgeapp.sql`
4. Apply migrations in filename order (`*_cgeapp.sql`).
5. Deploy functions:
   ```bash
   set SUPABASE_PROJECT_REF=your_cge_ref
   npm run deploy:functions:shopify
   npm run deploy:functions:cge
   ```
6. Set edge secrets: Shopify credentials path via `app_settings`, plus `RESEND_API_KEY`, `CGE_CRON_SECRET`, `SHOPIFY_CRON_SECRET`.
7. In Settings UI, enter the **same** Shopify domain/token and **same** DataPulseFlow license as uddash.
8. Register **additional** Shopify webhooks to  
   `https://<CGE_REF>.supabase.co/functions/v1/shopify-webhook`  
   (do not remove uddash webhook subscriptions).
9. Create users with `user_roles.role = 'admin' | 'cge' | 'salesperson'`, link CGEs on Assignments, sync customers/orders, Refresh tasks.

## Develop

```bash
npm install
npm run dev
```

## Migrations

Every SQL file under `supabase/migrations/` ends with `_cgeapp.sql`.

## UI references

Conceptzilla-style CRM queue (see `References (1–5).webp` / `.mp4` in the parent folder): orange accent, sidebar, KPI strip, tabs, dense table, customer sheet.
