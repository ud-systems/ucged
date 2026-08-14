const MIN_DIGITS = 8;
const UAE_COUNTRY_CODE = "971";

export function phoneDigits(raw: string | null | undefined): string {
  return (raw || "").replace(/\D/g, "");
}

/** Digits with country code, no plus. Local 0-prefix numbers are treated as UAE. */
export function internationalPhoneDigits(raw: string | null | undefined): string | null {
  let digits = phoneDigits(raw);
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `${UAE_COUNTRY_CODE}${digits.slice(1)}`;
  if (digits.length < MIN_DIGITS) return null;
  return digits;
}

export function telHref(raw: string | null | undefined): string | null {
  const digits = internationalPhoneDigits(raw);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappHref(raw: string | null | undefined, text?: string): string | null {
  const digits = internationalPhoneDigits(raw);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function smsHref(raw: string | null | undefined, body?: string): string | null {
  const digits = internationalPhoneDigits(raw);
  if (!digits) return null;
  const base = `sms:+${digits}`;
  return body ? `${base}?body=${encodeURIComponent(body)}` : base;
}
