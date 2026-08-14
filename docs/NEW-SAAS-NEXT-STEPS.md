# New SaaS — next steps

UI/UX gate is **open**. Vendor DataPulse repo reviewed. Scaffold lives in [`cge-saas/`](../../cge-saas/).

## Done

| Item | Status |
|------|--------|
| Pricing + workflows | [`SAAS-PRICING-AND-WORKFLOW.md`](./SAAS-PRICING-AND-WORKFLOW.md) |
| Datapulse + kit patterns | [`DATAPULSEFLOW-PATTERNS-REVIEW.md`](./DATAPULSEFLOW-PATTERNS-REVIEW.md) |
| Architecture | [`NEW-SAAS-ARCHITECTURE.md`](./NEW-SAAS-ARCHITECTURE.md) |
| UI reference + Neue Haas Grotesk landing | `cge-saas` marketing page |

## Checklist

- [x] UI/UX reference received  
- [x] DataPulse vendor codebase reviewed  
- [ ] Final product name agreed (scaffold uses **cge.**)  
- [ ] Stripe test mode keys + GBP price IDs  
- [ ] Twilio trial / UK number decision  
- [ ] Resend domain for SaaS brand  
- [ ] Licensed Neue Haas Grotesk files in `cge-saas/public/fonts` (CDN preview for now)  
- [ ] DataPulseFlow multi-tenant licensing clarified if kit embedded  

## Next build sprint

1. Supabase project for `cge-saas` + `orgs` / `org_members` / RLS  
2. Stripe Checkout + **webhook** + usage periods  
3. Auth pages wired to Supabase  
4. Port queue/campaigns behavior from CGE (new code, not a fork)  
5. Twilio SMS path  

Do **not** turn `cge-webapp` into the multi-tenant commercial product.
