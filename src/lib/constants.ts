/**
 * Site-wide business constants.
 *
 * SERVER-SIDE values come from environment variables — change in Vercel dashboard.
 * CLIENT-SIDE values are exported as plain strings so they can be imported anywhere.
 *
 * Runtime-editable values (phone, email, WhatsApp, tagline, etc.) should use the
 * settings helpers below, which read from the `site_settings` DB table when available
 * and fall back to these defaults.
 */

// ─── Business identity ──────────────────────────────────────────────────────

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Brightex Solutions";
export const SITE_TAGLINE = process.env.NEXT_PUBLIC_SITE_TAGLINE ?? "We build digital solutions that work.";
/** Formal business descriptor shown in email headers, PDF headers, and branded materials */
export const BUSINESS_DESCRIPTOR = process.env.NEXT_PUBLIC_BUSINESS_DESCRIPTOR ?? "Technology & Business Consulting";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brightexsolutions.co.ke";

/** Google Search Console verification token — set GOOGLE_SITE_VERIFICATION in Vercel env vars */
export const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION ?? "";

/** Display URL without protocol — used in invoices, PDFs, and printed materials */
export const BUSINESS_WEBSITE = "www.brightexsolutions.co.ke";

// ─── Contact details ─────────────────────────────────────────────────────────

export const BUSINESS_PHONE = process.env.ADMIN_PHONE ?? "+254 741 980 127";
export const BUSINESS_PHONE_RAW = process.env.ADMIN_PHONE_RAW ?? "254741980127"; // no + no spaces, for wa.me / tel: links
export const BUSINESS_EMAIL = process.env.ADMIN_EMAIL ?? "info.brightexsolutions@gmail.com";
export const BUSINESS_WHATSAPP = process.env.ADMIN_WHATSAPP ?? "254741980127"; // same format as BUSINESS_PHONE_RAW

// ─── Social media handles ────────────────────────────────────────────────────

export const SOCIAL_INSTAGRAM = process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "";
export const SOCIAL_FACEBOOK = process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "";
export const SOCIAL_LINKEDIN = process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? "";
export const SOCIAL_TIKTOK = process.env.NEXT_PUBLIC_SOCIAL_TIKTOK ?? "";
export const SOCIAL_TWITTER = process.env.NEXT_PUBLIC_SOCIAL_TWITTER ?? "";

// ─── Location ────────────────────────────────────────────────────────────────

export const BUSINESS_CITY = "Nairobi";
export const BUSINESS_COUNTRY = "Kenya";
export const BUSINESS_TIMEZONE = "Africa/Nairobi";
export const BUSINESS_CURRENCY = "KES";

// ─── Operating hours ─────────────────────────────────────────────────────────

export const OPERATING_HOURS = "Mon–Fri, 8am–6pm EAT";
export const WHATSAPP_REPLY_TIME = "within 2 hours";

// ─── Derived helpers ─────────────────────────────────────────────────────────

/** Full WhatsApp URL with optional pre-filled message */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${BUSINESS_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Default WhatsApp message used when escalating from Brixo or public pages */
export const WHATSAPP_DEFAULT_MESSAGE =
  "Hi Brightex Team, I was on the Brightex website and I'd like to chat.";

/** Invoice number prefix */
export const INVOICE_PREFIX = "BXS";

/** Default trial duration (days) */
export const DEFAULT_TRIAL_DAYS = 7;

/** Subscription renewal alert threshold (days before renewal) */
export const RENEWAL_ALERT_DAYS = 14;

/** SSL expiry alert threshold (days before expiry) */
export const SSL_ALERT_DAYS = 30;
