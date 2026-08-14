# DNS backup — uniquedistribution.com

**Captured:** 2026-08-14 (from GoDaddy DNS UI before Resend CGE records)  
**Provider:** GoDaddy (`ns45.domaincontrol.com` / `ns46.domaincontrol.com`)  
**Purpose:** Snapshot to revert if Resend / inbound subdomain changes cause issues.

> Do **not** delete or edit these existing rows when adding Resend. Only **add** new hosts (`send`, `resend._domainkey`, `inbound`, etc.).

---

## Baseline records (as provided)

| Type | Name | Data | TTL | Notes |
|------|------|------|-----|--------|
| A | `@` | `23.227.38.32` | 1 Hour | Shopify |
| NS | `@` | `ns45.domaincontrol.com.` | 1 Hour | GoDaddy |
| NS | `@` | `ns46.domaincontrol.com.` | 1 Hour | GoDaddy |
| SOA | `@` | Primary NS: `ns45.domaincontrol.com.` | — | System |
| MX | `@` | `uniquedistribution-com.mail.protection.outlook.com.` (Priority **0**) | 1 Hour | **Outlook — keep** |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` | 1 Hour | **Outlook SPF — keep** |
| TXT | `@` | `apple-domain-verification=9P2vEVpwrrzbApkJ` | 1 Hour | Apple |
| TXT | `@` | `brevo-code:507ecb8114d20deba206079e6ea14083` | 1 Hour | Brevo |
| TXT | `@` | `google-site-verification=Y7iP1hupY9Jn3mqgbNgJvF_z6id3bSY4Bnxac5m0h1c` | 1 Hour | Google |
| TXT | `@` | `MS=ms75699393` | 1 Hour | Microsoft |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | 1 Hour | DMARC |
| TXT | `mail._domainkey` | `k=rsa;p=MIGfMA…` *(full key truncated in screenshot — restore from GoDaddy if needed)* | 1 Hour | Outlook DKIM |
| CNAME | `8xq._domainkey` | `dkim1.b9601c10082.p739.email.myshopify.com.` | 1 Hour | Shopify DKIM |
| CNAME | `8xq2._domainkey` | `dkim2.b9601c10082.p739.email.myshopify.com.` | 1 Hour | Shopify DKIM |
| CNAME | `8xq3._domainkey` | `dkim3.b9601c10082.p739.email.myshopify.com.` | 1 Hour | Shopify DKIM |
| CNAME | `account` | `shops.myshopify.com.` | 1 Hour | Shopify |
| CNAME | `autodiscover` | `autodiscover.outlook.com.` | 1 Hour | Outlook |
| CNAME | `be3af50c-0a43-430e-b7c5-c17790b0f7da` | `dns-verification.shopify.com.` | 1 Hour | Shopify verify |
| CNAME | `mailer8xq` | `b9601c10082.p739.email.myshopify.com.` | 1 Hour | Shopify mailer |
| CNAME | `www` | `c906ff-0a.myshopify.com.` | 1 Hour | Shopify www |
| CNAME | `_domainconnect` | `_domainconnect.gd.domaincontrol.com.` | 1 Hour | GoDaddy |

UI reported **21 records** total; table above matches what was visible in the two screenshots. If a row was off-screen, re-export from GoDaddy and append here.

---

## Planned Resend additions (new only — not in baseline)

### Sending — Resend domain `uniquedistribution.com`

| Type | Name | Data | Purpose |
|------|------|------|---------|
| TXT | `resend._domainkey` | From Resend (`p=MIGf…`) | DKIM |
| MX | `send` | Resend `feedback-smtp.…amazonses.com` · Priority **10** | Return-path |
| TXT | `send` | Resend `v=spf1 include:… ~all` | SPF for `send.` |

Receiving on this domain: **OFF**.

### Receiving — Resend domain `inbound.uniquedistribution.com`

| Type | Name | Data | Purpose |
|------|------|------|---------|
| MX | `inbound` | From Resend (receiving) | CGE reply routing |
| TXT | `resend._domainkey.inbound` | From Resend *(if shown)* | Domain verify / DKIM |

Receiving: **ON**. Sending on this subdomain: optional / can be OFF.

---

## Revert checklist

If something breaks after Resend DNS:

1. **Do not** change Outlook `MX @` or root SPF unless you edited them by mistake — restore from the baseline table above.
2. **Delete only** the Resend-added hosts if you want to roll back Resend:
   - `resend._domainkey`
   - `send` (MX + TXT)
   - `inbound` (MX)
   - `resend._domainkey.inbound` (if added)
3. Leave Shopify / Outlook / verification TXT/CNAMEs alone.
4. In CGE Settings, clear **Inbound reply domain** if inbound is removed.
5. In Resend, you can leave domains unverified or delete them; app sends will fail until DNS is restored and verified again.

---

## Related CGE settings (after DNS works)

- Supabase secret: `RESEND_API_KEY`
- App setting: `resend_from_email` (e.g. brand address `@uniquedistribution.com`)
- App setting: `cge_mail_inbound_domain` = `inbound.uniquedistribution.com`
- Mail identities: per-CGE `@uniquedistribution.com` send-as addresses
- Webhook: Resend → `…/functions/v1/cge-mail-inbound`

---

## Gaps / follow-up

- Full `mail._domainkey` TXT value was truncated in the screenshot. If you ever need a perfect byte-for-byte restore of that key, copy it once from GoDaddy into this file (or a private vault) while it is still intact.
- After adding Resend records, paste a second dated section below (“Post-Resend snapshot”) so you have before/after.
