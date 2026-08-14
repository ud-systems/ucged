/** Brand tokens aligned with `src/index.css` (--primary: 100 42% 45%). */
export const BRAND = {
  green: "#639F43",
  greenDark: "#4F8235",
  greenSoft: "#F3F7F0",
  ink: "#1A1A1A",
  muted: "#5C5C5C",
  white: "#FFFFFF",
  border: "#D8E3D0",
} as const;

/** Public path for the white mark used in the app shell (URL-encoded space). */
export const BRAND_LOGO_PATH = "/white%20logo.png";

export function brandLogoUrl(origin?: string) {
  const base = (origin || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return base ? `${base}${BRAND_LOGO_PATH}` : BRAND_LOGO_PATH;
}

/** Shared sample merge vars for template preview. */
export const TEMPLATE_SAMPLE = {
  name: "Alex Mercer",
  salesperson: "Neil Gill",
  last_order: "#1042",
  email: "alex@example.com",
  logo_url: brandLogoUrl(),
};

export function mergeTemplateVars(html: string, vars: Record<string, string> = TEMPLATE_SAMPLE) {
  const merged = { ...TEMPLATE_SAMPLE, logo_url: brandLogoUrl(), ...vars };
  let out = html;
  for (const [k, v] of Object.entries(merged)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function headerBlock(eyebrow: string) {
  return `
          <tr>
            <td style="background:${BRAND.green};padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="{{logo_url}}" alt="Unique Distribution" width="36" height="36" style="display:block;width:36px;height:36px;object-fit:contain;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:${BRAND.white};">Unique Distribution</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${eyebrow}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function ctaBlock(label: string) {
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="background:${BRAND.green};border-radius:8px;">
                    <a href="mailto:{{email}}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:${BRAND.white};text-decoration:none;">${label}</a>
                  </td>
                </tr>
              </table>`;
}

function bulletsBlock(items: string[]) {
  if (!items.length) return "";
  const lis = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${BRAND.ink};">${item}</li>`,
    )
    .join("");
  return `<ul style="margin:4px 0 20px;padding-left:20px;">${lis}</ul>`;
}

/** Default styled marketing / outreach shell for new templates. */
export function defaultStyledTemplateHtml(
  bodyParagraphs: string[],
  opts?: { eyebrow?: string; ctaLabel?: string; bullets?: string[] },
): string {
  const eyebrow = opts?.eyebrow || "Customer Growth";
  const ctaLabel = opts?.ctaLabel || "Reply to us";
  const paragraphs = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${BRAND.ink};">${p}</p>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${BRAND.greenSoft};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.greenSoft};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
          ${headerBlock(eyebrow)}
          <tr>
            <td style="padding:36px 32px 24px;">
              ${paragraphs}
              ${bulletsBlock(opts?.bullets || [])}
              ${ctaBlock(ctaLabel)}
              <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${BRAND.muted};">— {{salesperson}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BRAND.greenSoft};border-top:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
              Unique Distribution · You’re receiving this because of your trade account with us.
              <br/>Last order reference: {{last_order}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function defaultMarketingHtml() {
  return defaultStyledTemplateHtml([
    "Hi {{name}},",
    "We put together a few picks we think you’ll like. Reply anytime if you want help placing an order.",
  ]);
}

/** Build a soft-template HTML body with brand green header + logo for SQL / seeds. */
export function softTemplateHtml(opts: {
  body: string;
  ctaLabel: string;
  footer: string;
  eyebrow?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${BRAND.greenSoft};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.greenSoft};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
          ${headerBlock(opts.eyebrow || "Customer Growth")}
          <tr>
            <td style="padding:36px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${BRAND.ink};">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${BRAND.ink};">${opts.body}</p>
              ${ctaBlock(opts.ctaLabel)}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BRAND.greenSoft};border-top:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
              ${opts.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
