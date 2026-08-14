-- Unique Distribution wholesale marketing / outreach campaign templates
-- Source of truth: src/lib/marketing-campaign-templates.ts
-- Re-seed anytime: npx tsx scripts/seed-marketing-templates.ts

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_new_arrivals',
  'New arrivals this week',
  'marketing',
  NULL,
  NULL,
  '{{name}} — fresh lines just landed',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">New arrivals</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We’ve booked in new lines this week and wanted trade accounts to see them first.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with the categories you care about and {{salesperson}} will send a short pick-list sized for your shelves.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Fast-moving SKUs highlighted for retailers</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Ask for MOQs and pack sizes</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Allocation noted where stock is tight</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send me the new lines</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, We’ve booked in new lines this week and wanted trade accounts to see them first. Reply with the categories you care about and {{salesperson}} will send a short pick-list sized for your shelves.
• Fast-moving SKUs highlighted for retailers
• Ask for MOQs and pack sizes
• Allocation noted where stock is tight
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_bestsellers',
  'Monthly bestsellers',
  'marketing',
  NULL,
  NULL,
  'What’s moving for accounts like yours, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Bestsellers</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Here’s a snapshot of lines other trade accounts have been reordering lately.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you want a tailored list against your last order ({{last_order}}), just reply.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Top reorders by similar accounts</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Steady sellers vs short-run spikes</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Easy swap suggestions if a line is tight</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Build my reorder list</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Here’s a snapshot of lines other trade accounts have been reordering lately. If you want a tailored list against your last order ({{last_order}}), just reply.
• Top reorders by similar accounts
• Steady sellers vs short-run spikes
• Easy swap suggestions if a line is tight
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_restock_nudge',
  'Restock reminder',
  'marketing',
  NULL,
  NULL,
  'Time to top up, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Restock</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Based on typical sell-through, it may be a good window to check shelf levels.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Tell us what you’re low on — or ask {{salesperson}} for a suggested restock against {{last_order}}.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Match pack sizes to your turn rate</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Flag substitutes if a SKU is short</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Same-day quotes where we can</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Help me restock</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Based on typical sell-through, it may be a good window to check shelf levels. Tell us what you’re low on — or ask {{salesperson}} for a suggested restock against {{last_order}}.
• Match pack sizes to your turn rate
• Flag substitutes if a SKU is short
• Same-day quotes where we can
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_lapsed_90',
  'Quiet 90+ days — soft reopen',
  'marketing',
  NULL,
  NULL,
  'We’ve missed your orders, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Re-engage</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">It’s been a while since {{last_order}}, and we wanted to check in without the hard sell.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If demand shifted, new lines dropped, or you simply need a cleaner shortlist — we’re here.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Catch up on what’s new since your last order</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">No obligation shortlist</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Your account manager is {{salesperson}}</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Reopen my account chat</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, It’s been a while since {{last_order}}, and we wanted to check in without the hard sell. If demand shifted, new lines dropped, or you simply need a cleaner shortlist — we’re here.
• Catch up on what’s new since your last order
• No obligation shortlist
• Your account manager is {{salesperson}}
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_lapsed_180',
  'Win-back after a long gap',
  'marketing',
  NULL,
  NULL,
  '{{name}}, shall we rebuild your shortlist?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Win-back</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">It’s been a longer stretch since we last supplied you. Ranges move quickly in this trade — happy to reset the catalogue for your store format.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with footfall type (high street / convenience / specialty) and we’ll keep recommendations practical.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Current core range overview</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Starter packs for reopening stock</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Talk through lead times and delivery</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Reset my shortlist</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, It’s been a longer stretch since we last supplied you. Ranges move quickly in this trade — happy to reset the catalogue for your store format. Reply with footfall type (high street / convenience / specialty) and we’ll keep recommendations practical.
• Current core range overview
• Starter packs for reopening stock
• Talk through lead times and delivery
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_one_time_second',
  'Second-order nudge',
  'marketing',
  NULL,
  NULL,
  'Ready for order two, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Grow with us</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Thanks again for getting started with us. Most accounts find the second order is where the range really settles.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We can suggest complements to what you took on {{last_order}} — or keep it simple with proven reorders.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Complements to your first basket</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Avoid overstocking slow lines</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Ask about trade account setup tips</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Suggest my second order</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Thanks again for getting started with us. Most accounts find the second order is where the range really settles. We can suggest complements to what you took on {{last_order}} — or keep it simple with proven reorders.
• Complements to your first basket
• Avoid overstocking slow lines
• Ask about trade account setup tips
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_vip_preview',
  'VIP early look',
  'marketing',
  NULL,
  NULL,
  'Early look for you, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Priority account</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">As a valued account we’re sharing an early view of what’s coming onto the book.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you want priority notes on allocation, reply and {{salesperson}} will mark your interest.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Early visibility on inbound lines</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Allocation conversations before wider release</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Direct line to {{salesperson}}</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Reserve my interest</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, As a valued account we’re sharing an early view of what’s coming onto the book. If you want priority notes on allocation, reply and {{salesperson}} will mark your interest.
• Early visibility on inbound lines
• Allocation conversations before wider release
• Direct line to {{salesperson}}
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_vip_thank_you',
  'VIP thank you',
  'outreach',
  NULL,
  NULL,
  'Thank you for the partnership, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Priority account</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Just a short note to say we appreciate the volume and consistency you bring.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If there’s anything we can tighten — lead times, substitutions, or a dedicated shortlist — tell us.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Talk to my account manager</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Just a short note to say we appreciate the volume and consistency you bring. If there’s anything we can tighten — lead times, substitutions, or a dedicated shortlist — tell us.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_volume_opportunity',
  'Volume / case-fill opportunity',
  'marketing',
  NULL,
  NULL,
  '{{name}} — worth reviewing case fills?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Trade planning</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If sell-through is strong on core lines, consolidating into fuller cases can simplify receiving and keep shelves denser.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with your top movers and we’ll map sensible case quantities — no invented offers, just practical fills.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Align pack size to weekly turn</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Reduce split-case friction</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Plan next inbound with {{salesperson}}</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Review my case fills</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, If sell-through is strong on core lines, consolidating into fuller cases can simplify receiving and keep shelves denser. Reply with your top movers and we’ll map sensible case quantities — no invented offers, just practical fills.
• Align pack size to weekly turn
• Reduce split-case friction
• Plan next inbound with {{salesperson}}
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_allocation_alert',
  'Limited allocation heads-up',
  'marketing',
  NULL,
  NULL,
  'Heads-up on tight stock, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Allocation</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">A few lines are on tighter allocation than usual. If they’re important to your mix, flag interest early so we can plan fairly.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">This isn’t a discount blast — just a stock-availability note for trade partners.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Tell us SKUs or categories that matter</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">We’ll confirm what we can cover</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Substitutes offered where needed</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Flag lines I need</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, A few lines are on tighter allocation than usual. If they’re important to your mix, flag interest early so we can plan fairly. This isn’t a discount blast — just a stock-availability note for trade partners.
• Tell us SKUs or categories that matter
• We’ll confirm what we can cover
• Substitutes offered where needed
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_back_in_stock',
  'Back in stock',
  'marketing',
  NULL,
  NULL,
  'Back on the shelf for trade, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Stock update</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Lines that were short are moving back into available stock. If you were waiting, now’s a clean window to reorder.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with what you need and we’ll confirm availability against live warehouse levels.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Confirm availability</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Lines that were short are moving back into available stock. If you were waiting, now’s a clean window to reorder. Reply with what you need and we’ll confirm availability against live warehouse levels.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_end_of_line',
  'End-of-line / clearance trade',
  'marketing',
  NULL,
  NULL,
  'End-of-line opportunities, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Clearance trade</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We’re clearing a handful of end-of-line packs to make room for inbound. Useful if you want value depth on proven formats.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Ask {{salesperson}} for the current end-of-line list — quantities are limited and first-come for trade accounts.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Limited remaining cases</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Good for promotions on your shop floor</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Confirm before holding stock</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send end-of-line list</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, We’re clearing a handful of end-of-line packs to make room for inbound. Useful if you want value depth on proven formats. Ask {{salesperson}} for the current end-of-line list — quantities are limited and first-come for trade accounts.
• Limited remaining cases
• Good for promotions on your shop floor
• Confirm before holding stock
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_bundle_starter',
  'Retailer starter / refresh pack',
  'marketing',
  NULL,
  NULL,
  'A practical starter pack for {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Starter packs</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you’re resetting a fixture or opening a new counter, we can assemble a balanced starter set — core sellers plus a few trial lines.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Share your footprint and average weekly footfall style and we’ll keep it realistic.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Core + trial balance</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Pack sizes suited to small or large format</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Optional refresh for existing fixtures</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Build a starter pack</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, If you’re resetting a fixture or opening a new counter, we can assemble a balanced starter set — core sellers plus a few trial lines. Share your footprint and average weekly footfall style and we’ll keep it realistic.
• Core + trial balance
• Pack sizes suited to small or large format
• Optional refresh for existing fixtures
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_cross_sell',
  'Complements to last order',
  'marketing',
  NULL,
  NULL,
  'Lines that sit well next to {{last_order}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Cross-sell</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Looking at {{last_order}}, there are a few complementary lines retailers often add on the next drop.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Want a short “next to this” list? Reply and we’ll keep it tight.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Adjacent categories only</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">No catalogue dump</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Grounded in what you already buy</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send complements</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Looking at {{last_order}}, there are a few complementary lines retailers often add on the next drop. Want a short “next to this” list? Reply and we’ll keep it tight.
• Adjacent categories only
• No catalogue dump
• Grounded in what you already buy
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_catalogue_update',
  'Catalogue / price book update',
  'marketing',
  NULL,
  NULL,
  'Updated trade catalogue note for {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Catalogue</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We’ve refreshed parts of the trade catalogue. If your team works from a saved shortlist, it’s worth a quick sync so quotes stay accurate.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">{{salesperson}} can walk you through what changed for your usual categories.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Sync my shortlist</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, We’ve refreshed parts of the trade catalogue. If your team works from a saved shortlist, it’s worth a quick sync so quotes stay accurate. {{salesperson}} can walk you through what changed for your usual categories.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_trade_offers_ask',
  'This week’s trade offers (ask)',
  'marketing',
  NULL,
  NULL,
  '{{name}} — want this week’s trade offers?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Trade offers</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We don’t blast invented discounts — but if you’d like whatever trade offers are live this week for your categories, reply and we’ll send the real list.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Tell us your focus (disposables, kits, liquids, accessories, or mixed) so we keep it relevant.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Only current, confirmed trade terms</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Category-filtered for your store</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Handled by {{salesperson}}</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send live offers</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, We don’t blast invented discounts — but if you’d like whatever trade offers are live this week for your categories, reply and we’ll send the real list. Tell us your focus (disposables, kits, liquids, accessories, or mixed) so we keep it relevant.
• Only current, confirmed trade terms
• Category-filtered for your store
• Handled by {{salesperson}}
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_seasonal_summer',
  'Summer trade prep',
  'marketing',
  NULL,
  NULL,
  'Summer shelf prep for {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Seasonal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Warmer months usually shift what moves fastest on the counter. Happy to help you prep a summer-weighted shortlist.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with what sold hard last summer — or ask us for a suggested mix.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Build summer shortlist</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Warmer months usually shift what moves fastest on the counter. Happy to help you prep a summer-weighted shortlist. Reply with what sold hard last summer — or ask us for a suggested mix.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_seasonal_autumn',
  'Autumn range refresh',
  'marketing',
  NULL,
  NULL,
  'Autumn refresh ideas for {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Seasonal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">As footfall patterns change into autumn, many accounts tidy slow lines and lean into steadier core SKUs.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We can help you rebalance without overcomplicating the fixture.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Plan autumn mix</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, As footfall patterns change into autumn, many accounts tidy slow lines and lean into steadier core SKUs. We can help you rebalance without overcomplicating the fixture.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_seasonal_festive',
  'Festive / holiday trade',
  'marketing',
  NULL,
  NULL,
  'Festive trade planning, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Seasonal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Holiday peaks are a good moment to lock core stock early and avoid last-minute shortages.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Share your expected uplift and we’ll help plan sensible case covers — no hype, just planning.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Core line cover first</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Gift / impulse add-ons if useful</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Lead-time check with warehouse</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Plan festive cover</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Holiday peaks are a good moment to lock core stock early and avoid last-minute shortages. Share your expected uplift and we’ll help plan sensible case covers — no hype, just planning.
• Core line cover first
• Gift / impulse add-ons if useful
• Lead-time check with warehouse
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_seasonal_spring',
  'Spring catalogue refresh',
  'marketing',
  NULL,
  NULL,
  'Spring lines worth a look, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Seasonal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Spring is when we usually rotate trial lines and refresh the book. If you want a clean shortlist for the new season, we’re ready.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Show spring picks</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Spring is when we usually rotate trial lines and refresh the book. If you want a clean shortlist for the new season, we’re ready.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_midweek_topup',
  'Midweek top-up',
  'outreach',
  NULL,
  NULL,
  'Need a midweek top-up, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Restock</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If the weekend cleared shelves, we can help with a focused midweek top-up on your usual movers.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">A short reply with what’s empty is enough — {{salesperson}} will take it from there.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Place a top-up</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, If the weekend cleared shelves, we can help with a focused midweek top-up on your usual movers. A short reply with what’s empty is enough — {{salesperson}} will take it from there.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_account_manager_intro',
  'Account manager intro',
  'outreach',
  NULL,
  NULL,
  'Your Unique Distribution contact — {{salesperson}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Your account</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">I’m {{salesperson}} from Unique Distribution, looking after your trade account.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Whenever you need stock checks, substitutions, or a clearer shortlist, reply to this email and I’ll help personally.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Say hello</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, I’m {{salesperson}} from Unique Distribution, looking after your trade account. Whenever you need stock checks, substitutions, or a clearer shortlist, reply to this email and I’ll help personally.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_new_account_welcome',
  'New trade account welcome',
  'marketing',
  NULL,
  NULL,
  'Welcome to Unique Distribution, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Welcome</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Welcome aboard. We’re here to make wholesale ordering straightforward — clear availability, sensible pack sizes, and a named contact.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with what you want to stock first and we’ll guide the opening order.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">How ordering works with us</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">What to share for faster quotes</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Your contact: {{salesperson}}</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Start my opening order</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Welcome aboard. We’re here to make wholesale ordering straightforward — clear availability, sensible pack sizes, and a named contact. Reply with what you want to stock first and we’ll guide the opening order.
• How ordering works with us
• What to share for faster quotes
• Your contact: {{salesperson}}
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_never_purchased_nudge',
  'Registered but not ordered',
  'marketing',
  NULL,
  NULL,
  '{{name}}, need a hand placing the first order?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Welcome</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">You’ve got an account with us but we don’t see a first order yet — totally fine if timing wasn’t right.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you’re still weighing range or MOQs, reply and we’ll keep recommendations practical for your store type.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Help me place order one</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, You’ve got an account with us but we don’t see a first order yet — totally fine if timing wasn’t right. If you’re still weighing range or MOQs, reply and we’ll keep recommendations practical for your store type.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_trade_show',
  'Trade show / roadshow invite',
  'marketing',
  NULL,
  NULL,
  'Come see us, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Events</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We’ll be meeting trade partners soon and would love to walk the range with you in person.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply if you want details on dates, location, and how to book a slot with {{salesperson}}.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send event details</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, We’ll be meeting trade partners soon and would love to walk the range with you in person. Reply if you want details on dates, location, and how to book a slot with {{salesperson}}.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_delivery_window',
  'Delivery / cut-off reminder',
  'outreach',
  NULL,
  NULL,
  'Ordering cut-offs for {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Logistics</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Quick logistics note: if you need stock for a specific delivery window, order earlier in the week when you can.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Ask {{salesperson}} for the current cut-off guidance for your route.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Confirm my cut-off</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Quick logistics note: if you need stock for a specific delivery window, order earlier in the week when you can. Ask {{salesperson}} for the current cut-off guidance for your route.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_substitution_help',
  'Smart substitutions',
  'marketing',
  NULL,
  NULL,
  'Need substitutes while a line is short, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Stock support</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">When a hero SKU is constrained, the right substitute keeps your fixture selling without confusing regulars.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Tell us what’s short and we’ll suggest closest matches by format and price band.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Suggest substitutes</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, When a hero SKU is constrained, the right substitute keeps your fixture selling without confusing regulars. Tell us what’s short and we’ll suggest closest matches by format and price band.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_slow_mover_tidy',
  'Fixture tidy / slow movers',
  'marketing',
  NULL,
  NULL,
  'Tidy the fixture with us, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Range health</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If a few lines have stalled, we can help you rotate toward stronger movers and free shelf space.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Share what’s sticky and we’ll propose a practical swap plan.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Review slow movers</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, If a few lines have stalled, we can help you rotate toward stronger movers and free shelf space. Share what’s sticky and we’ll propose a practical swap plan.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_referral_trade',
  'Introduce a fellow retailer',
  'outreach',
  NULL,
  NULL,
  'Know a shop that needs a solid wholesaler, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Referrals</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If another retailer in your network needs a dependable trade partner, we’re happy to introduce ourselves — no awkward pitch from you required.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply with a name or ask us to send a short intro they can forward.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send an intro pack</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, If another retailer in your network needs a dependable trade partner, we’re happy to introduce ourselves — no awkward pitch from you required. Reply with a name or ask us to send a short intro they can forward.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_compliance_trade',
  'Responsible trade reminder',
  'outreach',
  NULL,
  NULL,
  'A quick responsible-trade note, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Trade standards</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">As always, supply is for legitimate trade customers only. Please keep age-verification and local retail rules front of mind on your shop floor.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you need packaging or range guidance that supports compliant retail, {{salesperson}} can help point you to the right resources.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Ask about compliance support</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, As always, supply is for legitimate trade customers only. Please keep age-verification and local retail rules front of mind on your shop floor. If you need packaging or range guidance that supports compliant retail, {{salesperson}} can help point you to the right resources.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_quarterly_review',
  'Quarterly account review',
  'outreach',
  NULL,
  NULL,
  'Shall we review the quarter, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Account review</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">A short quarterly check-in helps us align range, cover, and any friction in ordering.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Pick a time with {{salesperson}} — even 10 minutes on email is enough to reset priorities.</p>
              <ul style="margin:4px 0 20px;padding-left:20px;"><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">What sold vs what stalled</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Inbound lines worth watching</li><li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1A1A1A;">Any delivery or admin friction</li></ul>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Book a quick review</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, A short quarterly check-in helps us align range, cover, and any friction in ordering. Pick a time with {{salesperson}} — even 10 minutes on email is enough to reset priorities.
• What sold vs what stalled
• Inbound lines worth watching
• Any delivery or admin friction
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_fast_movers_alert',
  'Fast movers alert',
  'marketing',
  NULL,
  NULL,
  'Moving fast this week, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Market pulse</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">A few categories are turning unusually quickly across similar accounts. Worth a glance if you don’t want empty hooks midweek.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Reply for a tight list — not the whole catalogue.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Send fast movers</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, A few categories are turning unusually quickly across similar accounts. Worth a glance if you don’t want empty hooks midweek. Reply for a tight list — not the whole catalogue.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_preorder_inbound',
  'Pre-order / inbound interest',
  'marketing',
  NULL,
  NULL,
  'Inbound interest for {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Pre-order interest</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We’re taking interest notes for inbound lines before they hit general availability.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you want to be considered in the first wave, reply with categories or SKU families you care about.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Register my interest</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, We’re taking interest notes for inbound lines before they hit general availability. If you want to be considered in the first wave, reply with categories or SKU families you care about.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_accessories_attach',
  'Accessories attach',
  'marketing',
  NULL,
  NULL,
  'Don’t forget the attach lines, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Attach sales</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hardware and consumables turn faster when attach lines (coils, cables, cases, and similar) sit next to them.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">We can suggest a small attach set matched to what you already stock.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Suggest attach lines</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, Hardware and consumables turn faster when attach lines (coils, cables, cases, and similar) sit next to them. We can suggest a small attach set matched to what you already stock.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_reopen_after_stockout',
  'After a stockout — rebuild',
  'marketing',
  NULL,
  NULL,
  'Back to full shelves, {{name}}?',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Stock recovery</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">If you took a hit from a stockout, we can help rebuild the fixture with available alternatives and a plan for when the original returns.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Send what ran out and we’ll respond with a rebuild shortlist.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Help me rebuild</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, If you took a hit from a stockout, we can help rebuild the fixture with available alternatives and a plan for when the original returns. Send what ran out and we’ll respond with a rebuild shortlist.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();

INSERT INTO public.cge_email_templates (template_key, name, template_kind, segment, day_offset, subject, html_body, text_body, active, variables)
VALUES (
  'mkt_quiet_friday_plan',
  'Plan next week’s cover',
  'outreach',
  NULL,
  NULL,
  'Plan next week’s cover, {{name}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
          
          <tr>
            <td style="background:#639F43;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:#FFFFFF;">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Weekly rhythm</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">A Friday check on shelf cover saves Monday surprises. If you want a quick eyes-on from us, reply with what’s light.</p>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;">{{salesperson}} can confirm what’s ready to ship for early next week.</p>
              
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:#639F43;border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Check next-week cover</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5C5C5C;">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C5C5C;">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  $text$Hi {{name}}, A Friday check on shelf cover saves Monday surprises. If you want a quick eyes-on from us, reply with what’s light. {{salesperson}} can confirm what’s ready to ship for early next week.
— {{salesperson}}$text$,
  true,
  '["name","salesperson","last_order","email","logo_url"]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  template_kind = EXCLUDED.template_kind,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  active = EXCLUDED.active,
  variables = EXCLUDED.variables,
  updated_at = now();
