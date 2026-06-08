/**
 * Brightex branded email template helpers.
 * All outbound emails are assembled from these primitives so the
 * look is consistent across every touchpoint.
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
const NAVY2   = "#1e2d44";
const GOLD    = "#f9a825";
const MUTED   = "#64748b";
const BORDER  = "#e2e8f0";
const CARD    = "#ffffff";
const LIGHT   = "#f8fafc";
const PAGE_BG = "#f1f5f9";

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Single label → value row for use inside emailInfoTable(). Value may contain HTML. */
export function emailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:7px 16px 7px 0;font-size:13px;color:${MUTED};width:130px;vertical-align:top;white-space:nowrap">${label}</td>
      <td style="padding:7px 0;font-size:13px;color:#1e293b;font-weight:600">${value}</td>
    </tr>`;
}

/** Wraps a set of emailRow() calls in a styled table. */
export function emailInfoTable(rows: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="border:1px solid ${BORDER};border-radius:4px;margin:20px 0;background:${LIGHT}">
      <tr><td style="padding:4px 16px">${rows ? `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>` : ""}</td></tr>
    </table>`;
}

/** Coloured alert bar — success / warning / error / info. */
export function emailAlert(message: string, type: "success" | "warning" | "error" | "info" = "info"): string {
  const map = {
    success: { bg: "#f0fdf4", border: "#10b981", text: "#065f46" },
    warning: { bg: "#fffbeb", border: GOLD,       text: "#92400e" },
    error:   { bg: "#fef2f2", border: "#ef4444",  text: "#991b1b" },
    info:    { bg: "#f0f9ff", border: "#0ea5e9",  text: "#075985" },
  };
  const c = map[type];
  return `
    <div style="background:${c.bg};border-left:3px solid ${c.border};padding:14px 16px;
                border-radius:0 4px 4px 0;margin:20px 0">
      <p style="color:${c.text};margin:0;font-size:14px;font-weight:600">${message}</p>
    </div>`;
}

/** Primary (navy) or secondary (gold) CTA button. */
export function emailButton(text: string, href: string, variant: "primary" | "secondary" = "primary"): string {
  const bg    = variant === "primary" ? NAVY : GOLD;
  const color = variant === "primary" ? "#ffffff" : NAVY;
  return `
    <div style="margin:24px 0">
      <a href="${href}"
         style="display:inline-block;background:${bg};color:${color};font-family:Helvetica,Arial,sans-serif;
                font-size:13px;font-weight:700;padding:11px 22px;border-radius:4px;text-decoration:none;
                letter-spacing:0.4px">${text}</a>
    </div>`;
}

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0">`;
}

/** Plain paragraph. Accepts embedded HTML (links, bold, etc.). */
export function emailParagraph(html: string): string {
  return `<p style="color:#475569;font-size:14px;line-height:1.7;margin:12px 0">${html}</p>`;
}

/** Small uppercase section label. */
export function emailSectionLabel(text: string): string {
  return `<p style="font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.9px;margin:20px 0 6px">${text}</p>`;
}

/** Standard closing line. */
export function emailSignoff(): string {
  return `<p style="color:${MUTED};font-size:13px;margin:28px 0 0">— The ${SITE_NAME} Team</p>`;
}

// ─── Master wrapper ────────────────────────────────────────────────────────────

/**
 * Wraps content in a full branded email shell.
 *
 * @param title    — displayed in the dark title bar below the header
 * @param subtitle — optional badge shown right-aligned in the navy header (e.g. invoice number)
 * @param body     — assembled HTML built with the primitives above
 * @param preheader — short preview text shown in inbox (hidden in body)
 */
export function emailTemplate({
  title,
  subtitle,
  body,
  preheader = "",
}: {
  title: string;
  subtitle?: string;
  body: string;
  preheader?: string;
}): string {
  const filler = "&nbsp;&zwnj;".repeat(90);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${PAGE_BG}">${preheader}${filler}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="background:${PAGE_BG};padding:36px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:560px">

      <!-- ── Brand header ─────────────────────────────────────────────── -->
      <tr><td style="background:${NAVY};padding:24px 32px;border-radius:8px 8px 0 0">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle">
              <p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:0.2px">${SITE_NAME}</p>
              <p style="margin:3px 0 0;font-size:10px;color:#94a3b8;letter-spacing:0.8px;text-transform:uppercase">${BUSINESS_DESCRIPTOR}</p>
            </td>
            ${subtitle ? `<td style="text-align:right;vertical-align:middle;padding-left:16px">
              <span style="display:inline-block;background:rgba(249,168,37,0.15);color:${GOLD};font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid rgba(249,168,37,0.3);white-space:nowrap">${subtitle}</span>
            </td>` : ""}
          </tr>
        </table>
      </td></tr>

      <!-- ── Gold accent line ──────────────────────────────────────────── -->
      <tr><td style="height:3px;background:${GOLD}"></td></tr>

      <!-- ── Title bar ────────────────────────────────────────────────── -->
      <tr><td style="background:${NAVY2};padding:13px 32px">
        <p style="margin:0;font-size:14px;font-weight:600;color:#f1f5f9;letter-spacing:0.2px">${title}</p>
      </td></tr>

      <!-- ── Body ─────────────────────────────────────────────────────── -->
      <tr><td style="background:${CARD};padding:32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER}">
        ${body}
      </td></tr>

      <!-- ── Footer ───────────────────────────────────────────────────── -->
      <tr><td style="background:${LIGHT};border:1px solid ${BORDER};border-top:none;
                     border-radius:0 0 8px 8px;padding:16px 32px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td>
              <p style="margin:0 0 2px;font-size:11px;color:${MUTED}">${SITE_NAME} · ${BUSINESS_CITY}, ${BUSINESS_COUNTRY}</p>
              <p style="margin:0;font-size:11px;color:${MUTED}">${BUSINESS_EMAIL} · ${BUSINESS_PHONE}</p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <a href="${BUSINESS_WEBSITE}" style="font-size:11px;color:${MUTED};text-decoration:none">${BUSINESS_WEBSITE}</a>
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
