import { defaultStyledTemplateHtml } from "@/lib/email-template-html";

export type MarketingCampaignTemplateSeed = {
  template_key: string;
  name: string;
  template_kind: "marketing" | "outreach";
  subject: string;
  html_body: string;
  text_body: string;
  active: boolean;
  segment: null;
  day_offset: null;
  variables: string[];
};

const VARS = ["name", "salesperson", "last_order", "email", "logo_url"];

function pack(
  key: string,
  name: string,
  subject: string,
  paragraphs: string[],
  opts: { eyebrow: string; ctaLabel: string; bullets?: string[]; kind?: "marketing" | "outreach" },
): MarketingCampaignTemplateSeed {
  const html_body = defaultStyledTemplateHtml(paragraphs, {
    eyebrow: opts.eyebrow,
    ctaLabel: opts.ctaLabel,
    bullets: opts.bullets,
  });
  const text_body = [
    paragraphs.join(" "),
    ...(opts.bullets || []).map((b) => `• ${b}`),
    `— {{salesperson}}`,
  ].join("\n");
  return {
    template_key: key,
    name,
    template_kind: opts.kind || "marketing",
    subject,
    html_body,
    text_body,
    active: true,
    segment: null,
    day_offset: null,
    variables: VARS,
  };
}

/**
 * Wholesale B2B campaign pack for Unique Distribution (trade accounts / retailers).
 * Copy stays trade-focused: restock, lines, allocation, catalogue — no invented discounts.
 */
export const MARKETING_CAMPAIGN_TEMPLATES: MarketingCampaignTemplateSeed[] = [
  pack(
    "mkt_new_arrivals",
    "New arrivals this week",
    "{{name}} — fresh lines just landed",
    [
      "Hi {{name}},",
      "We’ve booked in new lines this week and wanted trade accounts to see them first.",
      "Reply with the categories you care about and {{salesperson}} will send a short pick-list sized for your shelves.",
    ],
    {
      eyebrow: "New arrivals",
      ctaLabel: "Send me the new lines",
      bullets: ["Fast-moving SKUs highlighted for retailers", "Ask for MOQs and pack sizes", "Allocation noted where stock is tight"],
    },
  ),
  pack(
    "mkt_bestsellers",
    "Monthly bestsellers",
    "What’s moving for accounts like yours, {{name}}",
    [
      "Hi {{name}},",
      "Here’s a snapshot of lines other trade accounts have been reordering lately.",
      "If you want a tailored list against your last order ({{last_order}}), just reply.",
    ],
    {
      eyebrow: "Bestsellers",
      ctaLabel: "Build my reorder list",
      bullets: ["Top reorders by similar accounts", "Steady sellers vs short-run spikes", "Easy swap suggestions if a line is tight"],
    },
  ),
  pack(
    "mkt_restock_nudge",
    "Restock reminder",
    "Time to top up, {{name}}?",
    [
      "Hi {{name}},",
      "Based on typical sell-through, it may be a good window to check shelf levels.",
      "Tell us what you’re low on — or ask {{salesperson}} for a suggested restock against {{last_order}}.",
    ],
    {
      eyebrow: "Restock",
      ctaLabel: "Help me restock",
      bullets: ["Match pack sizes to your turn rate", "Flag substitutes if a SKU is short", "Same-day quotes where we can"],
    },
  ),
  pack(
    "mkt_lapsed_90",
    "Quiet 90+ days — soft reopen",
    "We’ve missed your orders, {{name}}",
    [
      "Hi {{name}},",
      "It’s been a while since {{last_order}}, and we wanted to check in without the hard sell.",
      "If demand shifted, new lines dropped, or you simply need a cleaner shortlist — we’re here.",
    ],
    {
      eyebrow: "Re-engage",
      ctaLabel: "Reopen my account chat",
      bullets: ["Catch up on what’s new since your last order", "No obligation shortlist", "Your account manager is {{salesperson}}"],
    },
  ),
  pack(
    "mkt_lapsed_180",
    "Win-back after a long gap",
    "{{name}}, shall we rebuild your shortlist?",
    [
      "Hi {{name}},",
      "It’s been a longer stretch since we last supplied you. Ranges move quickly in this trade — happy to reset the catalogue for your store format.",
      "Reply with footfall type (high street / convenience / specialty) and we’ll keep recommendations practical.",
    ],
    {
      eyebrow: "Win-back",
      ctaLabel: "Reset my shortlist",
      bullets: ["Current core range overview", "Starter packs for reopening stock", "Talk through lead times and delivery"],
    },
  ),
  pack(
    "mkt_one_time_second",
    "Second-order nudge",
    "Ready for order two, {{name}}?",
    [
      "Hi {{name}},",
      "Thanks again for getting started with us. Most accounts find the second order is where the range really settles.",
      "We can suggest complements to what you took on {{last_order}} — or keep it simple with proven reorders.",
    ],
    {
      eyebrow: "Grow with us",
      ctaLabel: "Suggest my second order",
      bullets: ["Complements to your first basket", "Avoid overstocking slow lines", "Ask about trade account setup tips"],
    },
  ),
  pack(
    "mkt_vip_preview",
    "VIP early look",
    "Early look for you, {{name}}",
    [
      "Hi {{name}},",
      "As a valued account we’re sharing an early view of what’s coming onto the book.",
      "If you want priority notes on allocation, reply and {{salesperson}} will mark your interest.",
    ],
    {
      eyebrow: "Priority account",
      ctaLabel: "Reserve my interest",
      bullets: ["Early visibility on inbound lines", "Allocation conversations before wider release", "Direct line to {{salesperson}}"],
    },
  ),
  pack(
    "mkt_vip_thank_you",
    "VIP thank you",
    "Thank you for the partnership, {{name}}",
    [
      "Hi {{name}},",
      "Just a short note to say we appreciate the volume and consistency you bring.",
      "If there’s anything we can tighten — lead times, substitutions, or a dedicated shortlist — tell us.",
    ],
    {
      eyebrow: "Priority account",
      ctaLabel: "Talk to my account manager",
      kind: "outreach",
    },
  ),
  pack(
    "mkt_volume_opportunity",
    "Volume / case-fill opportunity",
    "{{name}} — worth reviewing case fills?",
    [
      "Hi {{name}},",
      "If sell-through is strong on core lines, consolidating into fuller cases can simplify receiving and keep shelves denser.",
      "Reply with your top movers and we’ll map sensible case quantities — no invented offers, just practical fills.",
    ],
    {
      eyebrow: "Trade planning",
      ctaLabel: "Review my case fills",
      bullets: ["Align pack size to weekly turn", "Reduce split-case friction", "Plan next inbound with {{salesperson}}"],
    },
  ),
  pack(
    "mkt_allocation_alert",
    "Limited allocation heads-up",
    "Heads-up on tight stock, {{name}}",
    [
      "Hi {{name}},",
      "A few lines are on tighter allocation than usual. If they’re important to your mix, flag interest early so we can plan fairly.",
      "This isn’t a discount blast — just a stock-availability note for trade partners.",
    ],
    {
      eyebrow: "Allocation",
      ctaLabel: "Flag lines I need",
      bullets: ["Tell us SKUs or categories that matter", "We’ll confirm what we can cover", "Substitutes offered where needed"],
    },
  ),
  pack(
    "mkt_back_in_stock",
    "Back in stock",
    "Back on the shelf for trade, {{name}}",
    [
      "Hi {{name}},",
      "Lines that were short are moving back into available stock. If you were waiting, now’s a clean window to reorder.",
      "Reply with what you need and we’ll confirm availability against live warehouse levels.",
    ],
    {
      eyebrow: "Stock update",
      ctaLabel: "Confirm availability",
    },
  ),
  pack(
    "mkt_end_of_line",
    "End-of-line / clearance trade",
    "End-of-line opportunities, {{name}}",
    [
      "Hi {{name}},",
      "We’re clearing a handful of end-of-line packs to make room for inbound. Useful if you want value depth on proven formats.",
      "Ask {{salesperson}} for the current end-of-line list — quantities are limited and first-come for trade accounts.",
    ],
    {
      eyebrow: "Clearance trade",
      ctaLabel: "Send end-of-line list",
      bullets: ["Limited remaining cases", "Good for promotions on your shop floor", "Confirm before holding stock"],
    },
  ),
  pack(
    "mkt_bundle_starter",
    "Retailer starter / refresh pack",
    "A practical starter pack for {{name}}",
    [
      "Hi {{name}},",
      "If you’re resetting a fixture or opening a new counter, we can assemble a balanced starter set — core sellers plus a few trial lines.",
      "Share your footprint and average weekly footfall style and we’ll keep it realistic.",
    ],
    {
      eyebrow: "Starter packs",
      ctaLabel: "Build a starter pack",
      bullets: ["Core + trial balance", "Pack sizes suited to small or large format", "Optional refresh for existing fixtures"],
    },
  ),
  pack(
    "mkt_cross_sell",
    "Complements to last order",
    "Lines that sit well next to {{last_order}}",
    [
      "Hi {{name}},",
      "Looking at {{last_order}}, there are a few complementary lines retailers often add on the next drop.",
      "Want a short “next to this” list? Reply and we’ll keep it tight.",
    ],
    {
      eyebrow: "Cross-sell",
      ctaLabel: "Send complements",
      bullets: ["Adjacent categories only", "No catalogue dump", "Grounded in what you already buy"],
    },
  ),
  pack(
    "mkt_catalogue_update",
    "Catalogue / price book update",
    "Updated trade catalogue note for {{name}}",
    [
      "Hi {{name}},",
      "We’ve refreshed parts of the trade catalogue. If your team works from a saved shortlist, it’s worth a quick sync so quotes stay accurate.",
      "{{salesperson}} can walk you through what changed for your usual categories.",
    ],
    {
      eyebrow: "Catalogue",
      ctaLabel: "Sync my shortlist",
    },
  ),
  pack(
    "mkt_trade_offers_ask",
    "This week’s trade offers (ask)",
    "{{name}} — want this week’s trade offers?",
    [
      "Hi {{name}},",
      "We don’t blast invented discounts — but if you’d like whatever trade offers are live this week for your categories, reply and we’ll send the real list.",
      "Tell us your focus (disposables, kits, liquids, accessories, or mixed) so we keep it relevant.",
    ],
    {
      eyebrow: "Trade offers",
      ctaLabel: "Send live offers",
      bullets: ["Only current, confirmed trade terms", "Category-filtered for your store", "Handled by {{salesperson}}"],
    },
  ),
  pack(
    "mkt_seasonal_summer",
    "Summer trade prep",
    "Summer shelf prep for {{name}}",
    [
      "Hi {{name}},",
      "Warmer months usually shift what moves fastest on the counter. Happy to help you prep a summer-weighted shortlist.",
      "Reply with what sold hard last summer — or ask us for a suggested mix.",
    ],
    {
      eyebrow: "Seasonal",
      ctaLabel: "Build summer shortlist",
    },
  ),
  pack(
    "mkt_seasonal_autumn",
    "Autumn range refresh",
    "Autumn refresh ideas for {{name}}",
    [
      "Hi {{name}},",
      "As footfall patterns change into autumn, many accounts tidy slow lines and lean into steadier core SKUs.",
      "We can help you rebalance without overcomplicating the fixture.",
    ],
    {
      eyebrow: "Seasonal",
      ctaLabel: "Plan autumn mix",
    },
  ),
  pack(
    "mkt_seasonal_festive",
    "Festive / holiday trade",
    "Festive trade planning, {{name}}",
    [
      "Hi {{name}},",
      "Holiday peaks are a good moment to lock core stock early and avoid last-minute shortages.",
      "Share your expected uplift and we’ll help plan sensible case covers — no hype, just planning.",
    ],
    {
      eyebrow: "Seasonal",
      ctaLabel: "Plan festive cover",
      bullets: ["Core line cover first", "Gift / impulse add-ons if useful", "Lead-time check with warehouse"],
    },
  ),
  pack(
    "mkt_seasonal_spring",
    "Spring catalogue refresh",
    "Spring lines worth a look, {{name}}",
    [
      "Hi {{name}},",
      "Spring is when we usually rotate trial lines and refresh the book. If you want a clean shortlist for the new season, we’re ready.",
    ],
    {
      eyebrow: "Seasonal",
      ctaLabel: "Show spring picks",
    },
  ),
  pack(
    "mkt_midweek_topup",
    "Midweek top-up",
    "Need a midweek top-up, {{name}}?",
    [
      "Hi {{name}},",
      "If the weekend cleared shelves, we can help with a focused midweek top-up on your usual movers.",
      "A short reply with what’s empty is enough — {{salesperson}} will take it from there.",
    ],
    {
      eyebrow: "Restock",
      ctaLabel: "Place a top-up",
      kind: "outreach",
    },
  ),
  pack(
    "mkt_account_manager_intro",
    "Account manager intro",
    "Your Unique Distribution contact — {{salesperson}}",
    [
      "Hi {{name}},",
      "I’m {{salesperson}} from Unique Distribution, looking after your trade account.",
      "Whenever you need stock checks, substitutions, or a clearer shortlist, reply to this email and I’ll help personally.",
    ],
    {
      eyebrow: "Your account",
      ctaLabel: "Say hello",
      kind: "outreach",
    },
  ),
  pack(
    "mkt_new_account_welcome",
    "New trade account welcome",
    "Welcome to Unique Distribution, {{name}}",
    [
      "Hi {{name}},",
      "Welcome aboard. We’re here to make wholesale ordering straightforward — clear availability, sensible pack sizes, and a named contact.",
      "Reply with what you want to stock first and we’ll guide the opening order.",
    ],
    {
      eyebrow: "Welcome",
      ctaLabel: "Start my opening order",
      bullets: ["How ordering works with us", "What to share for faster quotes", "Your contact: {{salesperson}}"],
    },
  ),
  pack(
    "mkt_never_purchased_nudge",
    "Registered but not ordered",
    "{{name}}, need a hand placing the first order?",
    [
      "Hi {{name}},",
      "You’ve got an account with us but we don’t see a first order yet — totally fine if timing wasn’t right.",
      "If you’re still weighing range or MOQs, reply and we’ll keep recommendations practical for your store type.",
    ],
    {
      eyebrow: "Welcome",
      ctaLabel: "Help me place order one",
    },
  ),
  pack(
    "mkt_trade_show",
    "Trade show / roadshow invite",
    "Come see us, {{name}}",
    [
      "Hi {{name}},",
      "We’ll be meeting trade partners soon and would love to walk the range with you in person.",
      "Reply if you want details on dates, location, and how to book a slot with {{salesperson}}.",
    ],
    {
      eyebrow: "Events",
      ctaLabel: "Send event details",
    },
  ),
  pack(
    "mkt_delivery_window",
    "Delivery / cut-off reminder",
    "Ordering cut-offs for {{name}}",
    [
      "Hi {{name}},",
      "Quick logistics note: if you need stock for a specific delivery window, order earlier in the week when you can.",
      "Ask {{salesperson}} for the current cut-off guidance for your route.",
    ],
    {
      eyebrow: "Logistics",
      ctaLabel: "Confirm my cut-off",
      kind: "outreach",
    },
  ),
  pack(
    "mkt_substitution_help",
    "Smart substitutions",
    "Need substitutes while a line is short, {{name}}?",
    [
      "Hi {{name}},",
      "When a hero SKU is constrained, the right substitute keeps your fixture selling without confusing regulars.",
      "Tell us what’s short and we’ll suggest closest matches by format and price band.",
    ],
    {
      eyebrow: "Stock support",
      ctaLabel: "Suggest substitutes",
    },
  ),
  pack(
    "mkt_slow_mover_tidy",
    "Fixture tidy / slow movers",
    "Tidy the fixture with us, {{name}}",
    [
      "Hi {{name}},",
      "If a few lines have stalled, we can help you rotate toward stronger movers and free shelf space.",
      "Share what’s sticky and we’ll propose a practical swap plan.",
    ],
    {
      eyebrow: "Range health",
      ctaLabel: "Review slow movers",
    },
  ),
  pack(
    "mkt_referral_trade",
    "Introduce a fellow retailer",
    "Know a shop that needs a solid wholesaler, {{name}}?",
    [
      "Hi {{name}},",
      "If another retailer in your network needs a dependable trade partner, we’re happy to introduce ourselves — no awkward pitch from you required.",
      "Reply with a name or ask us to send a short intro they can forward.",
    ],
    {
      eyebrow: "Referrals",
      ctaLabel: "Send an intro pack",
      kind: "outreach",
    },
  ),
  pack(
    "mkt_compliance_trade",
    "Responsible trade reminder",
    "A quick responsible-trade note, {{name}}",
    [
      "Hi {{name}},",
      "As always, supply is for legitimate trade customers only. Please keep age-verification and local retail rules front of mind on your shop floor.",
      "If you need packaging or range guidance that supports compliant retail, {{salesperson}} can help point you to the right resources.",
    ],
    {
      eyebrow: "Trade standards",
      ctaLabel: "Ask about compliance support",
      kind: "outreach",
    },
  ),
  pack(
    "mkt_quarterly_review",
    "Quarterly account review",
    "Shall we review the quarter, {{name}}?",
    [
      "Hi {{name}},",
      "A short quarterly check-in helps us align range, cover, and any friction in ordering.",
      "Pick a time with {{salesperson}} — even 10 minutes on email is enough to reset priorities.",
    ],
    {
      eyebrow: "Account review",
      ctaLabel: "Book a quick review",
      kind: "outreach",
      bullets: ["What sold vs what stalled", "Inbound lines worth watching", "Any delivery or admin friction"],
    },
  ),
  pack(
    "mkt_fast_movers_alert",
    "Fast movers alert",
    "Moving fast this week, {{name}}",
    [
      "Hi {{name}},",
      "A few categories are turning unusually quickly across similar accounts. Worth a glance if you don’t want empty hooks midweek.",
      "Reply for a tight list — not the whole catalogue.",
    ],
    {
      eyebrow: "Market pulse",
      ctaLabel: "Send fast movers",
    },
  ),
  pack(
    "mkt_preorder_inbound",
    "Pre-order / inbound interest",
    "Inbound interest for {{name}}",
    [
      "Hi {{name}},",
      "We’re taking interest notes for inbound lines before they hit general availability.",
      "If you want to be considered in the first wave, reply with categories or SKU families you care about.",
    ],
    {
      eyebrow: "Pre-order interest",
      ctaLabel: "Register my interest",
    },
  ),
  pack(
    "mkt_accessories_attach",
    "Accessories attach",
    "Don’t forget the attach lines, {{name}}",
    [
      "Hi {{name}},",
      "Hardware and consumables turn faster when attach lines (coils, cables, cases, and similar) sit next to them.",
      "We can suggest a small attach set matched to what you already stock.",
    ],
    {
      eyebrow: "Attach sales",
      ctaLabel: "Suggest attach lines",
    },
  ),
  pack(
    "mkt_reopen_after_stockout",
    "After a stockout — rebuild",
    "Back to full shelves, {{name}}?",
    [
      "Hi {{name}},",
      "If you took a hit from a stockout, we can help rebuild the fixture with available alternatives and a plan for when the original returns.",
      "Send what ran out and we’ll respond with a rebuild shortlist.",
    ],
    {
      eyebrow: "Stock recovery",
      ctaLabel: "Help me rebuild",
    },
  ),
  pack(
    "mkt_quiet_friday_plan",
    "Plan next week’s cover",
    "Plan next week’s cover, {{name}}",
    [
      "Hi {{name}},",
      "A Friday check on shelf cover saves Monday surprises. If you want a quick eyes-on from us, reply with what’s light.",
      "{{salesperson}} can confirm what’s ready to ship for early next week.",
    ],
    {
      eyebrow: "Weekly rhythm",
      ctaLabel: "Check next-week cover",
      kind: "outreach",
    },
  ),
];

export function marketingTemplatesByKey() {
  return Object.fromEntries(MARKETING_CAMPAIGN_TEMPLATES.map((t) => [t.template_key, t]));
}
