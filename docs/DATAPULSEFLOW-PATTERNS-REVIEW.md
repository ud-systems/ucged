# DataPulse / DataPulseFlow patterns review

Reviewed from workspace sources for the **new separate SaaS** (not a CGE fork).

| Source | Path | What it is |
|--------|------|------------|
| **Vendor control plane** | [`Datapulse/`](../../Datapulse/) | DataPulseFlow marketing + billing portal (Vite SPA) |
| Integration kit | [`cge-webapp/DataPulseFlow-integration-kit/`](../DataPulseFlow-integration-kit/) | Shopify sync schema, Edge Functions, deploy docs |
| Reference app | [`uddash-main/`](../../uddash-main/) | Unique Distribution sales portal on DataPulseFlow |
| CGE consumer | [`cge-webapp`](../) | Follow-up CRM reusing kit + license settings |

---

## Vendor repo (`Datapulse/`) — what it actually is

**Stack:** Vite 8 + React 19 + TypeScript + TanStack Query + shadcn/Radix + Tailwind + Supabase Auth/DB/Edge Functions. Hosted as SPA (Vercel/Netlify rewrites).

**Product shape:** Billing + client portal + marketing site for **two sold suites** (Shopify data-ops branding + Real Estate branding). Deliverable = access code + ZIP from Storage — **not** a multi-tenant CRM and **not** an email/SMS campaign engine.

### Tenancy (critical)

| Present | Absent |
|---------|--------|
| **User-scoped** rows (`user_id`) | `organizations` / `org_id` / workspaces |
| Roles: `admin` \| `client` via `user_roles` + `has_role()` | Invites, seats, org-level roles |
| Product split via signup metadata (`signup_product = 'realestate'`) + parallel tables | Team multi-tenancy |

**Do not fork this as org tenancy.** Copy the **RLS + SECURITY DEFINER `has_role` + signup trigger provisioning** idiom; redesign around `orgs` / `org_members`.

### Licensing / entitlements

- Time-boxed **access codes** (`client_access_codes`, `DPF-XXXX-…`), trial on signup, extend on payment.
- Enterprise = lifetime; dashboard locks when code invalid (`isSystemLocked`).
- Plan prices overridable in `admin_settings`; Stripe price IDs hardcoded in `src/config/plans.ts` / `realestatePlans.ts`.
- Soft toggles in `admin_settings` (email scenarios, `active_payment_method`) — not LaunchDarkly modules.

**For new SaaS:** Stripe subscription + `usage_periods` quotas replace access-code gating for CRM features. Keep DataPulseFlow kit validate-access-code only if commercially required for **Shopify sync**.

### Billing

| Provider | Pattern | Notes |
|----------|---------|--------|
| **Stripe** | Checkout + Customer Portal + live `check-subscription` | **No Stripe webhook** in repo — avoid shipping that gap |
| **PayPal** | Checkout / capture / activate | IDs stuffed into `stripe_*` columns (avoid) |
| **Paystack** | Checkout + **HMAC webhook** + shared fulfillment | Best renewal discipline — copy this pattern for Stripe webhooks |

Shared fulfillment module: `supabase/functions/_shared/paystack-subscription-fulfillment.ts`.

### Messaging

- **Transactional Resend** only (`send-email`, `email_send_log`, scenario toggles).
- **No** campaigns, audiences, SMS, or Twilio.

### Sync

Marketing claims Shopify webhooks; **this repo does not implement the connector runtime**. Real sync lives in the **integration kit** + licensee apps (uddash/CGE).

### Key tables / RPCs / functions

**Tables:** `profiles`, `user_roles`, `admin_settings`, `subscriptions`, `client_access_codes`, `invoices`, `invoice_items`, parallel `realestate_*`, `demo_requests`, `email_send_log`, `api_credentials` (unused in UI).

**RPCs:** `has_role`, `handle_new_user`, `generate_client_access_code`, `mark_overdue_invoices`.

**Edge (billing):** `create-checkout`, `check-subscription`, `customer-portal`, PayPal twins, Paystack + `paystack-webhook`, `validate-access-code`, `send-email`, `check-notifications`.

---

## Patterns to reuse in the new SaaS

1. **Supabase Auth + `has_role` SECURITY DEFINER + RLS** — extend to `org_members.role`.
2. **Signup trigger provisioning** — create default org + owner membership + trial `usage_periods` in one place.
3. **`admin_settings` KV** for branding / non-secret config (secrets stay in env/Vault — do **not** store Stripe secret in client-writable settings).
4. **Edge payment functions + webhook-verified fulfillment** (Paystack style → Stripe `customer.subscription.*` / `invoice.paid`).
5. **Email scenario toggles + send log** for transactional mail.
6. **Vite/React/shadcn/TanStack Query** SPA shell (same as Datapulse + CGE).
7. **Auth redirect safety** helpers (`isSafeInternalRedirect`).

### Anti-patterns to avoid

1. User-only tenancy (no orgs) for a team CRM.
2. Duplicating entire Admin/Dashboard/edge stacks per product line.
3. Stripe without webhooks.
4. Reusing `stripe_*` columns for other providers.
5. Sharing one Stripe price ID across unrelated products.
6. Payment secrets in `admin_settings`.
7. `verify_jwt = false` on sensitive functions without compensating controls.
8. Access-code licensing as the only CRM gate.
9. Giant god-page components (Datapulse Dashboard/Admin).

---

## Kit + uddash (licensee side)

Still apply:

- Layered ownership: kit = Shopify backbone; app = CRM UX; Stripe = commercial control plane.
- Fail-closed license check for sync if DataPulseFlow agreement requires it.
- Six webhook topics + GraphQL sync modules from the kit, credentials **per org**.

---

## Recommendation

| Need | From Datapulse vendor | From kit / CGE | Build new |
|------|----------------------|----------------|-----------|
| SPA stack, auth/RLS idiom, settings, payment function shape | Yes | — | — |
| Orgs, invites, unlimited CGEs, org RLS | — | — | Required |
| Stripe webhooks + plan entitlements + quotas | Partial (fix Paystack) | — | Redesign |
| Campaign email + SMS + inbound threads | — | CGE email patterns | Core product |
| Shopify sync | Marketing only | Kit | Embed with `org_id` |

**Bottom line:** Datapulse is a **billing + portal + marketing** control plane with user-level RLS. Steal stack and payment/auth patterns; treat org tenancy, seats-unlimited CGEs, campaigns, Twilio, and Stripe event sync as greenfield in `cge-saas`.
