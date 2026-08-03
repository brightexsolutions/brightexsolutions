import { transporter, SENDERS, SITE_NAME, SITE_URL } from "@/lib/mail";
import { BUSINESS_WHATSAPP } from "@/lib/constants";
import { SERVICE_LABELS } from "@/lib/intake-schema";

const WA_URL = `https://wa.me/${BUSINESS_WHATSAPP}`;

interface IntakeAckOptions {
  to: string;
  /** Anyone the client asked to be copied. Resolve via resolveCc(). */
  cc?: string[];
  name: string;
  /** Primary service. */
  serviceType: string;
  /** Every service asked for, when the enquiry covers more than one. */
  serviceTypes?: string[];
  projectTitle?: string | null;
  description: string;
}

/** "a website", "a website and branding", "a website, branding and automation" */
function describeServices(serviceType: string, serviceTypes?: string[]): string {
  const list = (serviceTypes?.length ? serviceTypes : [serviceType])
    .map((t) => (SERVICE_LABELS[t] ?? t).toLowerCase());

  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function baseHtml(bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Gold accent -->
        <tr><td style="height:3px;background:#f9a825;border-radius:12px 12px 0 0;"></td></tr>

        <!-- Header -->
        <tr><td style="background:#152238;padding:24px 32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#f9a825;border-radius:6px;width:34px;height:34px;text-align:center;vertical-align:middle;">
              <span style="color:#152238;font-weight:800;font-size:15px;">B</span>
            </td>
            <td style="padding-left:10px;">
              <span style="color:#ffffff;font-weight:700;font-size:15px;">${SITE_NAME}</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 32px;">
          ${bodyContent}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            ${SITE_NAME} &middot;
            <a href="${SITE_URL}" style="color:#94a3b8;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function summaryBox(serviceType: string, serviceTypes: string[] | undefined, projectTitle?: string | null, description?: string | null) {
  const services = (serviceTypes?.length ? serviceTypes : [serviceType])
    .map((t) => SERVICE_LABELS[t] ?? t);
  const heading = projectTitle || services[0];
  const excerpt = description ? description.slice(0, 180) + (description.length > 180 ? "..." : "") : "";

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <tr><td style="background:#f8fafc;padding:14px 18px;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:.06em;color:#94a3b8;text-transform:uppercase;">Your submission</p>
      <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#152238;">${heading}</p>
      <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;">${services.join(" &middot; ")}</p>
      ${excerpt ? `<p style="margin:6px 0 0 0;font-size:13px;color:#475569;line-height:1.55;">${excerpt}</p>` : ""}
    </td></tr>
  </table>`;
}

function ccNote(cc?: string[]) {
  if (!cc?.length) return "";
  return `<p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
    Copied on this email: ${cc.join(", ")}
  </p>`;
}

function whatsappBtn() {
  return `
  <table cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr>
      <td style="background:#25D366;border-radius:10px;text-align:center;">
        <a href="${WA_URL}" target="_blank"
          style="display:inline-block;padding:12px 28px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">
          💬 Chat with us on WhatsApp
        </a>
      </td>
    </tr>
  </table>`;
}

function signOff() {
  return `<p style="margin:24px 0 0 0;font-size:14px;color:#475569;line-height:1.6;">
    Talk soon,<br/>
    <strong style="color:#152238;">The ${SITE_NAME} Team</strong>
  </p>`;
}

// ─── New client (submitted via generic /intake link) ──────────────────────────

export async function sendNewClientIntakeAck(opts: IntakeAckOptions) {
  const firstName = opts.name.split(" ")[0];
  const services  = describeServices(opts.serviceType, opts.serviceTypes);

  const html = baseHtml(`
    <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#152238;line-height:1.3;">
      Hi ${firstName}, great to meet you 👋
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.6;">
      Thank you for reaching out to ${SITE_NAME}. We have your project requirements and we are looking
      forward to learning more about what you want to build.
    </p>
    ${summaryBox(opts.serviceType, opts.serviceTypes, opts.projectTitle, opts.description)}
    <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#334155;">What happens next?</p>
    <p style="margin:0 0 6px 0;font-size:14px;color:#64748b;line-height:1.6;">
      We will review your ${services} requirements and reach out within 1 to 2 business days to arrange a
      discovery call, so we can go through everything together and agree the best way forward.
    </p>
    <p style="margin:0 0 0 0;font-size:14px;color:#64748b;line-height:1.6;">
      In the meantime, WhatsApp is the fastest way to reach us if anything comes to mind.
    </p>
    ${whatsappBtn()}
    ${signOff()}
    ${ccNote(opts.cc)}
  `);

  const text = `Hi ${firstName},

Thank you for reaching out to ${SITE_NAME}. We have your requirements for ${services} and we are on it.

What happens next:
We will review your submission and reach out within 1 to 2 business days to arrange a discovery call.

Chat with us: ${WA_URL}

Talk soon,
The ${SITE_NAME} Team`;

  await transporter.sendMail({
    from: SENDERS.info,
    to: opts.to,
    cc: opts.cc,
    subject: `We received your requirements, ${firstName}`,
    html,
    text,
  });
}

// ─── Existing client (submitted via personal /intake/[token] link) ────────────

export async function sendExistingClientIntakeAck(opts: IntakeAckOptions) {
  const firstName = opts.name.split(" ")[0];
  const services  = describeServices(opts.serviceType, opts.serviceTypes);
  const subject   = opts.projectTitle
    ? `Got your requirements for "${opts.projectTitle}", ${firstName}`
    : `Got your ${services} requirements, ${firstName}`;

  const html = baseHtml(`
    <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#152238;line-height:1.3;">
      Thanks for sharing, ${firstName} ✅
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.6;">
      We have your project requirements and we are already reviewing them. We will be in touch shortly to
      go through the details and map out the next steps together.
    </p>
    ${summaryBox(opts.serviceType, opts.serviceTypes, opts.projectTitle, opts.description)}
    <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#334155;">What happens next?</p>
    <p style="margin:0 0 6px 0;font-size:14px;color:#64748b;line-height:1.6;">
      We will work through your ${services} requirements and come back to you to discuss the detail,
      answer any questions, and agree what happens next.
    </p>
    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
      If you want to add anything in the meantime, WhatsApp is the fastest way to reach us.
    </p>
    ${whatsappBtn()}
    ${signOff()}
    ${ccNote(opts.cc)}
  `);

  const text = `Hi ${firstName},

Thanks for sharing your requirements. We have your ${services} submission and we are reviewing it now.

${opts.projectTitle ? `Project: ${opts.projectTitle}\n` : ""}We will reach out shortly to discuss next steps.

Chat with us: ${WA_URL}

Talk soon,
The ${SITE_NAME} Team`;

  await transporter.sendMail({
    from: SENDERS.info,
    to: opts.to,
    cc: opts.cc,
    subject,
    html,
    text,
  });
}
