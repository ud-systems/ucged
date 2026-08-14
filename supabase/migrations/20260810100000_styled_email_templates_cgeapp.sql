-- Restyle soft email templates with brand green + logo (matches app --primary hsl(100 42% 45%) ≈ #639F43)
-- {{logo_url}} is filled by cge-soft-email / cge-campaign-send / cge-mail-send from app_settings.brand_logo_url

INSERT INTO public.app_settings (key, value)
VALUES ('brand_logo_url', coalesce((SELECT value FROM public.app_settings WHERE key = 'brand_logo_url'), ''))
ON CONFLICT (key) DO NOTHING;

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Customer Growth</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Thanks for your first order. If you need help picking what comes next, we are here.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Reply to us</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 60)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'one_time_60';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Customer Growth</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Here are popular next picks from customers like you. Reply anytime and we will help.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Ask for recommendations</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 75)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'one_time_75';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Customer Growth</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Thought you might like a gentle reminder of items that pair with your past orders.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Talk to your account team</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 60)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'repeat_cooling_60';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Customer Growth</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">If it is time to restock, we can point you to the right products quickly.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Request a restock list</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 75)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'repeat_cooling_75';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Priority account</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">We value your business. If you need anything — new arrivals or personal help — just reply.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Reply personally</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 60)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'vip_60';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Priority account</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">As a valued customer you have priority support. Tell us what you are looking for.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Priority support</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 75)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'vip_75';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Welcome</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Welcome. If you want recommendations for a first order, reply and we will help.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Get first-order help</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 60)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'never_purchased_60';

UPDATE public.cge_email_templates SET
  name = coalesce(name, template_key),
  html_body = $html$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F0;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8E3D0;">
<tr><td style="background:#639F43;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;"/></td>
<td style="vertical-align:middle;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;">Unique Distribution</p>
<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Welcome</p></td>
</tr></table></td></tr>
<tr><td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Hi {{name}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1A1A;">Still browsing? We can suggest bestsellers and answer questions.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#639F43;border-radius:8px;">
<a href="mailto:hello@uniquedistribution.com" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">Ask about bestsellers</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;background:#F3F7F0;border-top:1px solid #D8E3D0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5C5C5C;">Unique Distribution · Soft check-in (day 75)</td></tr>
</table></td></tr></table></body></html>$html$,
  updated_at = now()
WHERE template_key = 'never_purchased_75';
