# CGE deployment checklist

1. **Never edit `uddash-main/`.**
2. Create separate Supabase project; note project ref.
3. Replace `YOUR_CGE_SUPABASE_REF` / `YOUR_SUPABASE_PROJECT_REF` in CGE migrations:
   - `20260326100000_shopify_reconcile_scheduler_cgeapp.sql`
   - `20260808140000_cge_soft_email_cron_cgeapp.sql`
4. `supabase db push` or apply `supabase/migrations/*_cgeapp.sql` in order.
5. Deploy edge functions (`shopify-*`, `cge-soft-email`) with `--no-verify-jwt`.
6. Secrets: `SHOPIFY_CRON_SECRET`, `CGE_CRON_SECRET`, `RESEND_API_KEY`, optional `RESEND_FROM_EMAIL`.
7. Settings UI: same Shopify store/token + same DataPulseFlow license keys as uddash.
8. Webhooks: run `node scripts/register-cge-webhooks.mjs` to **add** CGE callback; leave uddash URLs intact.
9. Provision `admin`, `salesperson` (with `salesperson_name` matching Shopify metafields), and `cge` roles.
10. Link CGEs → salespersons on Assignments; sync; Refresh tasks on Queue.

## Soft email

- Day 60 / 75 candidates from `enqueue_soft_prevention_emails_cgeapp`
- Sent by `cge-soft-email` with Resend idempotency keys `soft/{customer_id}/{60|75}`
- Hourly cron job `cge-soft-email-hourly` (after pg_cron/pg_net enabled)
