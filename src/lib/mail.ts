import { Resend } from "resend";
import {
  SITE_NAME, SITE_URL,
  BUSINESS_EMAIL, BUSINESS_PHONE, BUSINESS_WHATSAPP,
} from "@/lib/constants";

// ─── Named senders ────────────────────────────────────────────────────────────
// All verified under brightexsolutions.co.ke in the Resend dashboard.
// Callers can import these to choose the appropriate sender explicitly.
export const SENDERS = {
  info:     `${SITE_NAME} <info@brightexsolutions.co.ke>`,
  bookings: `${SITE_NAME} <bookings@brightexsolutions.co.ke>`,
  support:  `${SITE_NAME} <support@brightexsolutions.co.ke>`,
  payments: `${SITE_NAME} <payments@brightexsolutions.co.ke>`,
  updates:  `${SITE_NAME} <updates@brightexsolutions.co.ke>`,
} as const;

// All replies land in the business Gmail inbox
const REPLY_TO = "info.brightexsolutions@gmail.com";

// ─── Resend client ────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── sendMail options ─────────────────────────────────────────────────────────
export interface MailOptions {
  /** Sender address. If omitted or using old Gmail format, defaults to info@ sender. */
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

// Resolve the from address:
// — If caller passes a brightexsolutions.co.ke address, use it as-is.
// — Otherwise fall back to the info@ sender so legacy callers (still using
//   the Gmail address in SMTP_USER) get the correct Resend-verified sender
//   without any change on their side.
function resolveSender(from?: string): string {
  if (from?.includes("brightexsolutions.co.ke")) return from;
  return SENDERS.info;
}

// ─── Drop-in nodemailer transporter replacement ───────────────────────────────
// Keeps the same .sendMail() interface so all existing callers work unchanged.
export const transporter = {
  sendMail: async (options: MailOptions) => {
    const result = await resend.emails.send({
      from:     resolveSender(options.from),
      to:       Array.isArray(options.to) ? options.to : [options.to],
      subject:  options.subject,
      html:     options.html,
      text:     options.text,
      replyTo: options.replyTo ?? REPLY_TO,
      attachments: options.attachments?.map((a) => ({
        filename:    a.filename,
        content:     a.content as Buffer,
        content_type: a.contentType,
      })),
    });
    // The Resend SDK does NOT throw on API-level failures (rate limits,
    // invalid domain, quota exceeded, etc.) — it returns { data: null, error }
    // instead. Every caller of this wrapper (15+ routes) uses try/catch
    // around sendMail() expecting a throw on failure, so without this check
    // a rate-limited or rejected send silently reports success everywhere.
    if (result.error) {
      throw new Error(`Resend send failed [${result.error.name}]: ${result.error.message}`);
    }
    return result;
  },
};

// Re-export for backward-compat with existing API routes
export const ADMIN_EMAIL    = BUSINESS_EMAIL;
export const ADMIN_PHONE    = BUSINESS_PHONE;
export const ADMIN_WHATSAPP = BUSINESS_WHATSAPP;
export { SITE_NAME, SITE_URL };
