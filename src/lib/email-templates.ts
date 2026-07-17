/**
 * Brightex branded email template helpers.
 * Clean, mobile-first design: personalized hero, card-based info sections,
 * full-width buttons on mobile. Inspired by Greenhouse's email aesthetic.
 */

import {
  SITE_NAME,
  BUSINESS_DESCRIPTOR,
  BUSINESS_EMAIL,
  BUSINESS_PHONE,
  BUSINESS_CITY,
  BUSINESS_COUNTRY,
  BUSINESS_WEBSITE,
} from "@/lib/constants";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY    = "#152238";
const NAVY2   = "#1a2d47";
const GOLD    = "#f9a825";
const MUTED   = "#64748b";
const BORDER  = "#e2e8f0";
const CARD    = "#ffffff";
const LIGHT   = "#f8fafc";
const PAGE_BG = "#eef2f7";

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Label → value row for use inside emailInfoTable(). Value may contain HTML. */
export function emailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${BORDER}">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;
                       letter-spacing:0.7px;vertical-align:top;padding-right:16px;width:120px">${label}</td>
            <td style="font-size:14px;color:#1e293b;font-weight:600;text-align:right">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** Wraps emailRow() calls in a clean rounded info card. */
export function emailInfoTable(rows: string): string {
  return `
    <div style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;margin:20px 0">
      <div style="padding:0 20px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>
      </div>
    </div>`;
}

/** Icon + label + value card row (like Greenhouse's date/time/venue cards). */
export function emailInfoCard(icon: string, label: string, value: string): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px;width:100%">
      <tr>
        <td style="width:44px;vertical-align:top">
          <div style="width:36px;height:36px;border-radius:50%;background:${LIGHT};border:1px solid ${BORDER};
                      text-align:center;line-height:36px;font-size:16px;display:inline-block">${icon}</div>
        </td>
        <td style="vertical-align:middle;padding-left:12px">
          <p style="margin:0;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;
                    letter-spacing:0.8px;line-height:1">${label}</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e293b;line-height:1.3">${value}</p>
        </td>
      </tr>
    </table>`;
}

/** Prominent reference/number box — like Greenhouse's ticket reference. */
export function emailReferenceBox(ref: string, label = "Reference"): string {
  return `
    <div style="background:#fafaf7;border:1px solid #e5ddc8;border-radius:10px;
                padding:22px 24px;text-align:center;margin:24px 0">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${MUTED};
                text-transform:uppercase;letter-spacing:1.2px">${label}</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:${NAVY};
                font-family:'Courier New',Courier,monospace;letter-spacing:4px">${ref}</p>
    </div>`;
}

/** Coloured alert bar. */
export function emailAlert(message: string, type: "success" | "warning" | "error" | "info" = "info"): string {
  const map = {
    success: { bg: "#f0fdf4", border: "#22c55e", text: "#15803d" },
    warning: { bg: "#fffbeb", border: GOLD,       text: "#92400e" },
    error:   { bg: "#fef2f2", border: "#ef4444",  text: "#991b1b" },
    info:    { bg: "#f0f9ff", border: "#0ea5e9",  text: "#075985" },
  };
  const c = map[type];
  return `
    <div style="background:${c.bg};border-left:4px solid ${c.border};
                padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:${c.text};margin:0;font-size:14px;line-height:1.6">${message}</p>
    </div>`;
}

/** CTA button — full width on mobile via MSO fallback. */
export function emailButton(text: string, href: string, variant: "primary" | "secondary" = "primary"): string {
  const bg    = variant === "primary" ? NAVY : GOLD;
  const color = variant === "primary" ? "#ffffff" : NAVY;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0">
      <tr>
        <td align="center">
          <a href="${href}"
             style="display:inline-block;background:${bg};color:${color};
                    font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                    font-size:15px;font-weight:700;padding:15px 36px;
                    border-radius:8px;text-decoration:none;letter-spacing:0.2px;
                    min-width:220px;text-align:center;mso-padding-alt:0">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

export function emailDivider(): string {
  return `<div style="border-top:1px solid ${BORDER};margin:28px 0"></div>`;
}

/** Body paragraph. Accepts inline HTML. */
export function emailParagraph(html: string): string {
  return `<p style="color:#475569;font-size:15px;line-height:1.75;margin:14px 0">${html}</p>`;
}

/** Escapes HTML special characters. Use before interpolating user-typed text
 * into an email — otherwise a client's own plain-text input becomes live
 * markup in the outgoing email. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Turns bare URLs in already-escaped plain text into clickable links. Run
 * AFTER escapeHtml() so the href itself can't inject markup either. */
export function linkifyText(escapedText: string): string {
  return escapedText.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" style="color:${GOLD};text-decoration:underline">${url}</a>`
  );
}

/** Applies the composer's lightweight formatting marks to already-escaped
 * text: **bold**, __underline__, then linkifies. Run in that order so a URL
 * containing an underscore can't be mistaken for an underline mark. */
function applyInlineFormatting(escaped: string): string {
  const formatted = escaped
    .replace(/\*\*([^\n*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^\n_]+)__/g, "<u>$1</u>");
  return linkifyText(formatted);
}

/** Plain, free-typed email body (composer / manual comms log) → safe HTML:
 * escaped, then bold/underline/link formatting applied, blank-line-separated
 * paragraphs (single newlines within one become <br>), and consecutive
 * "- " lines become a real bulleted list. */
export function emailBodyFromPlainText(body: string): string {
  const html: string[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join("\n").trim();
    if (text) html.push(emailParagraph(applyInlineFormatting(escapeHtml(text)).replace(/\n/g, "<br>")));
    paragraphLines = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems
      .map((item) => `<li style="margin:4px 0;color:#475569;font-size:15px;line-height:1.6">${applyInlineFormatting(escapeHtml(item))}</li>`)
      .join("");
    html.push(`<ul style="margin:14px 0;padding-left:22px">${items}</ul>`);
    listItems = [];
  };

  for (const rawLine of body.split("\n")) {
    const trimmed = rawLine.trim();
    const bulletMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
    } else if (trimmed === "") {
      flushList();
      flushParagraph();
    } else {
      flushList();
      paragraphLines.push(rawLine);
    }
  }
  flushList();
  flushParagraph();

  return html.join("");
}

/** Small uppercase section label. */
export function emailSectionLabel(text: string): string {
  return `<p style="font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;
                    letter-spacing:1px;margin:24px 0 8px">${text}</p>`;
}

/** Standard sign-off line. */
export function emailSignoff(): string {
  return `<p style="color:${MUTED};font-size:14px;margin:28px 0 0">— The ${SITE_NAME} Team</p>`;
}

// ─── Master wrapper ────────────────────────────────────────────────────────────

/**
 * Full branded email shell.
 *
 * @param title      - document title / subject hint
 * @param subtitle   - small badge in header (e.g. invoice number)
 * @param body       - assembled HTML from helpers above
 * @param preheader  - hidden preview text shown in inbox
 * @param heroTitle  - large bold text in the hero section (e.g. "Here's your invoice,\nJohn.")
 * @param heroLabel  - small gold label above hero title (e.g. "Invoice · INV-001")
 */
export function emailTemplate({
  title,
  subtitle,
  body,
  preheader = "",
  heroTitle,
  heroLabel,
}: {
  title: string;
  subtitle?: string;
  body: string;
  preheader?: string;
  heroTitle?: string;
  heroLabel?: string;
}): string {
  const filler = "&nbsp;&zwnj;".repeat(90);

  const heroSection = heroTitle
    ? `<!-- hero -->
      <tr><td class="email-hero"
              style="background:${NAVY2};padding:32px 40px 38px">
        ${heroLabel
          ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${GOLD};
                       letter-spacing:1.3px;text-transform:uppercase">${heroLabel}</p>`
          : ""}
        <h1 style="margin:0;font-size:30px;font-weight:700;color:#ffffff;
                   line-height:1.3;letter-spacing:-0.3px">
          ${heroTitle.replace(/\n/g, "<br>")}
        </h1>
      </td></tr>`
    : `<!-- title bar -->
      <tr><td style="background:${NAVY2};padding:14px 40px">
        <p style="margin:0;font-size:14px;font-weight:600;color:#f1f5f9">${title}</p>
      </td></tr>`;

  const siteUrl = BUSINESS_WEBSITE?.replace(/^https?:\/\//, "") ?? BUSINESS_WEBSITE;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  @media only screen and (max-width:600px){
    .email-outer  { padding:16px 8px!important }
    .email-header { padding:20px 24px!important }
    .email-hero   { padding:26px 24px 30px!important }
    .email-body   { padding:28px 24px!important }
    .email-footer { padding:18px 24px!important }
    .email-hero h1 { font-size:24px!important;line-height:1.25!important }
    .mobile-full-btn a {
      display:block!important;
      width:100%!important;
      box-sizing:border-box!important;
      text-align:center!important;
      min-width:0!important;
    }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};
             font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
             -webkit-font-smoothing:antialiased">

${preheader
  ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${PAGE_BG}">${preheader}${filler}</div>`
  : ""}

<table class="email-outer" width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="background:${PAGE_BG};padding:40px 16px">
  <tr><td align="center">

    <!-- outer container -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:580px">

      <!-- ── Brand header ─────────────────────────────────────────── -->
      <tr><td class="email-header"
              style="background:${NAVY};padding:24px 40px;
                     border-radius:12px 12px 0 0">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;
                        letter-spacing:0.3px">${SITE_NAME}</p>
              <p style="margin:3px 0 0;font-size:10px;color:#94a3b8;
                        letter-spacing:1px;text-transform:uppercase">${BUSINESS_DESCRIPTOR}</p>
            </td>
            ${subtitle
              ? `<td style="text-align:right;vertical-align:middle;padding-left:16px">
                  <span style="display:inline-block;background:rgba(249,168,37,0.15);
                               color:${GOLD};font-size:12px;font-weight:700;
                               padding:5px 12px;border-radius:20px;
                               border:1px solid rgba(249,168,37,0.3);white-space:nowrap">${subtitle}</span>
                </td>`
              : ""}
          </tr>
        </table>
      </td></tr>

      <!-- ── Gold accent line ──────────────────────────────────────── -->
      <tr><td style="height:4px;background:linear-gradient(90deg,${GOLD},#e09000)"></td></tr>

      ${heroSection}

      <!-- ── Body ─────────────────────────────────────────────────── -->
      <tr><td class="email-body"
              style="background:${CARD};padding:36px 40px;
                     border-left:1px solid ${BORDER};border-right:1px solid ${BORDER}">
        ${body}
      </td></tr>

      <!-- ── Footer ───────────────────────────────────────────────── -->
      <tr><td class="email-footer"
              style="background:${LIGHT};border:1px solid ${BORDER};border-top:none;
                     border-radius:0 0 12px 12px;padding:20px 40px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td>
              <p style="margin:0 0 3px;font-size:12px;color:${MUTED}">${SITE_NAME} · ${BUSINESS_CITY}, ${BUSINESS_COUNTRY}</p>
              <p style="margin:0;font-size:12px;color:${MUTED}">${BUSINESS_EMAIL} · ${BUSINESS_PHONE}</p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <a href="${BUSINESS_WEBSITE}"
                 style="font-size:12px;color:${MUTED};text-decoration:none">${siteUrl}</a>
            </td>
          </tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
