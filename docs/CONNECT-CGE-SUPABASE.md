# Connect CGE Supabase (`gfgqjuhkbbnrybkbthku`)

Your local `.env` is ready. The logged-in Supabase CLI/MCP account **cannot** manage this project (403 privilege), so schema + function deploy must be done with the **owner** of this project.

## 1. Apply migrations (required first)

1. Open [SQL Editor](https://supabase.com/dashboard/project/gfgqjuhkbbnrybkbthku/sql/new) while logged into the account that owns this project.
2. Paste and run the full file:  
   [`supabase/all_cgeapp_migrations.sql`](../supabase/all_cgeapp_migrations.sql)
3. Confirm it completes without errors.

## 2. Seed Shopify + DataPulse settings

From `cge-webapp/` (uses `.env` + `.credentials.local.json`):

```bash
node scripts/seed-app-settings-to-cge.mjs
```

## 3. Deploy Edge Functions

Log the CLI into the **same** Supabase account that owns `gfgqjuhkbbnrybkbthku`, then:

```bash
set SUPABASE_PROJECT_REF=gfgqjuhkbbnrybkbthku
npm run deploy:functions:shopify
npm run deploy:functions:cge
```

Set function secrets in Dashboard → Edge Functions → Secrets:

- `SHOPIFY_CRON_SECRET` (same value as `shopify_cron_secret` in settings)
- `CGE_CRON_SECRET`
- `RESEND_API_KEY` (when ready)
- `RESEND_FROM_EMAIL` (optional)

## 4. Register additional Shopify webhooks

```bash
set SUPABASE_PROJECT_REF=gfgqjuhkbbnrybkbthku
set SHOPIFY_STORE_DOMAIN=c906ff-0a.myshopify.com
set SHOPIFY_ACCESS_TOKEN=...
node scripts/register-cge-webhooks.mjs
```

Do **not** remove uddash webhook URLs.

## 5. Restart the app

```bash
npm run dev
```

Preview mode turns off automatically when `.env` has real `VITE_SUPABASE_*` values. Create an Auth user in the CGE project and insert an `admin` row in `user_roles`.
