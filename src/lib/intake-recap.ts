/**
 * The client's own submission, sent back to them in full.
 *
 * The acknowledgement email has always said "we got it" and shown a 180
 * character excerpt of the description. That is a receipt for an envelope, not
 * for its contents. A client who has just spent fifteen minutes answering
 * questions about their business has no record of what they actually said, and
 * neither does anyone they want to forward it to.
 *
 * Sending the whole thing back does three jobs at once:
 *   - it is the receipt, so they can check we understood them
 *   - it is the correction prompt: people spot the gap by reading, not by
 *     being asked "is anything missing?"
 *   - it is forwardable, which is what actually happens when the person filling
 *     the form is not the person who signs
 *
 * Built on the same table-based primitives as the rest of intake-mail.ts, since
 * Gmail and Outlook still need tables.
 */
import { SERVICE_LABELS, readAnswerGroups, serviceTypesOf } from "@/lib/intake-schema";
import { esc } from "@/lib/document-html";
import { transporter, SENDERS } from "@/lib/mail";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const NAVY = "#0d1f4e";
const ORANGE = "#e8920a";
const GREY = "#64748b";
const BORDER = "#e2e8f0";

export interface IntakeRecapSource {
  id?: string;
  reference?: string | null;
  submitter_name?: string | null;
  submitter_email?: string | null;
  submitter_company?: string | null;
  submitter_role?: string | null;
  submitter_phone?: string | null;
  preferred_contact?: string | null;
  service_type?: string | null;
  service_types?: string[] | null;
  project_title?: string | null;
  description?: string | null;
  problem_statement?: string | null;
  success_criteria?: string | null;
  reference_links?: string | null;
  industry?: string | null;
  business_summary?: string | null;
  target_audience?: string | null;
  online_presence?: string | null;
  timeline?: string | null;
  hard_deadline?: string | null;
  budget_range?: string | null;
  budget_confidence?: string | null;
  decision_stage?: string | null;
  heard_from?: string | null;
  additional_notes?: string | null;
  assets?: Record<string, unknown> | null;
  specifics?: Record<string, unknown> | null;
  cc_emails?: string[] | null;
  submitted_at?: string | null;
  edit_token?: string | null;
  edit_count?: number | null;
}

type Row = { label: string; value: string };

function rows(pairs: [string, unknown][]): Row[] {
  return pairs
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([label, v]) => ({ label, value: String(v).trim() }));
}

/** A labelled block of rows. Omitted entirely when it has nothing in it, so a
 * short submission does not read as a page of empty headings. */
function section(title: string, items: Row[]): string {
  if (items.length === 0) return "";
  return `
  <tr><td style="padding:22px 0 0 0;">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:.08em;color:${ORANGE};text-transform:uppercase;">${esc(title)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
      ${items.map((r, i) => `
      <tr>
        <td style="padding:11px 14px;background:${i % 2 ? "#ffffff" : "#f9fafb"};border-bottom:${i === items.length - 1 ? "none" : `1px solid ${BORDER}`};vertical-align:top;width:38%;">
          <span style="font-size:12px;color:${GREY};font-weight:600;">${esc(r.label)}</span>
        </td>
        <td style="padding:11px 14px;background:${i % 2 ? "#ffffff" : "#f9fafb"};border-bottom:${i === items.length - 1 ? "none" : `1px solid ${BORDER}`};vertical-align:top;">
          <span style="font-size:13px;color:#1e293b;line-height:1.6;">${esc(r.value).replace(/\n/g, "<br/>")}</span>
        </td>
      </tr>`).join("")}
    </table>
  </td></tr>`;
}

/**
 * Readiness, as a have / do not have list rather than raw booleans.
 *
 * What the client does NOT have is the more useful half: it is the list of
 * things that will hold the project up, and showing it back is how a client
 * discovers they need to sort out their domain access before we ask.
 */
function assetsSection(assets: Record<string, unknown> | null | undefined): string {
  if (!assets || Object.keys(assets).length === 0) return "";
  const LABELS: Record<string, string> = {
    logo: "Logo files", brand_guidelines: "Brand guidelines", copy: "Written content",
    images: "Photography", domain: "Domain name", hosting: "Hosting", content_plan: "Content plan",
  };
  const have: string[] = [];
  const need: string[] = [];
  for (const [key, value] of Object.entries(assets)) {
    const label = LABELS[key] ?? key.replace(/_/g, " ");
    (value ? have : need).push(label);
  }
  if (have.length === 0 && need.length === 0) return "";

  return section("What you have ready", [
    ...(have.length ? [{ label: "Ready", value: have.join(", ") }] : []),
    ...(need.length ? [{ label: "Still to sort out", value: need.join(", ") }] : []),
  ]);
}

export interface RecapOptions {
  /** Full URL to revise the submission, when edits remain. */
  editUrl?: string | null;
  editsRemaining?: number;
  /** Shown in the footer so the client knows who else has a copy. */
  cc?: string[];
  siteUrl: string;
  siteName: string;
}

/** The recap as standalone HTML: used for the email body and, wrapped in the
 * document shell, for the printable copy. */
export function renderIntakeRecapBody(intake: IntakeRecapSource, opts: RecapOptions): string {
  const services = serviceTypesOf(intake).map((s) => SERVICE_LABELS[s] ?? s);
  const groups = readAnswerGroups(serviceTypesOf(intake), intake.specifics);

  const body = [
    section("Who we are talking to", rows([
      ["Name", intake.submitter_name],
      ["Role", intake.submitter_role],
      ["Business", intake.submitter_company],
      ["Email", intake.submitter_email],
      ["Phone", intake.submitter_phone],
      ["Best way to reach you", intake.preferred_contact],
    ])),

    section("What you asked for", rows([
      ["Services", services.join(", ")],
      ["Project", intake.project_title],
      ["In your words", intake.description],
      ["The problem to solve", intake.problem_statement],
      ["What success looks like", intake.success_criteria],
      ["References and inspiration", intake.reference_links],
    ])),

    section("Your business", rows([
      ["Industry", intake.industry],
      ["What the business does", intake.business_summary],
      ["Who you serve", intake.target_audience],
      ["Where you are online now", intake.online_presence],
    ])),

    section("Timing and budget", rows([
      ["Desired timeline", intake.timeline],
      ["Fixed deadline", intake.hard_deadline],
      ["Budget range", intake.budget_range],
      ["Budget position", intake.budget_confidence],
      ["Where you are in deciding", intake.decision_stage],
    ])),

    assetsSection(intake.assets),

    ...groups.map((g) =>
      section(`${g.serviceLabel}: your answers`, g.rows.map((r) => ({ label: r.label, value: r.value })))
    ),

    section("Anything else", rows([
      ["Additional notes", intake.additional_notes],
      ["How you found us", intake.heard_from],
    ])),
  ].join("");

  return body;
}

/** Email-ready HTML and plain text. */
export function renderIntakeRecap(
  intake: IntakeRecapSource,
  opts: RecapOptions
): { subject: string; html: string; text: string } {
  const firstName = (intake.submitter_name ?? "there").trim().split(/\s+/)[0];
  const services = serviceTypesOf(intake).map((s) => SERVICE_LABELS[s] ?? s);
  const submitted = intake.submitted_at
    ? new Date(intake.submitted_at).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi" })
    : null;

  const editNote = opts.editUrl && (opts.editsRemaining ?? 0) > 0
    ? `<tr><td style="padding:22px 0 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed ${BORDER};border-radius:8px;">
          <tr><td style="padding:14px 16px;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#334155;line-height:1.6;">
              Spotted something you would put differently? You can revise this
              ${opts.editsRemaining === 1 ? "once more" : `up to ${opts.editsRemaining} more times`}
              before we work from it.
            </p>
            <a href="${esc(opts.editUrl)}" style="font-size:13px;color:${ORANGE};font-weight:700;text-decoration:none;">Update my answers &rarr;</a>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const ccNote = opts.cc?.length
    ? `<p style="margin:14px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">Also copied to: ${esc(opts.cc.join(", "))}</p>`
    : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your submission to ${esc(opts.siteName)}</title></head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:28px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">

        <tr><td style="background:${NAVY};padding:28px 30px;">
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${ORANGE};font-weight:700;">Your submission</p>
          <p style="margin:0;font-size:23px;color:#ffffff;font-weight:700;line-height:1.3;">Here is everything you told us</p>
          ${submitted ? `<p style="margin:8px 0 0 0;font-size:12px;color:rgba(255,255,255,.6);">Submitted ${esc(submitted)}</p>` : ""}
        </td></tr>

        <tr><td style="padding:26px 30px 30px 30px;">
          <p style="margin:0 0 4px 0;font-size:16px;color:#1e293b;line-height:1.6;">Hello ${esc(firstName)},</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
            Thank you for taking the time to go through that properly. Below is your submission in full, so you have a
            record of it and can check we have understood you correctly${services.length ? ` on the ${esc(services.join(" and "))} side` : ""}.
            We will review it and come back to you within one to two business days to arrange a call.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            ${renderIntakeRecapBody(intake, opts)}
            ${editNote}
          </table>

          <p style="margin:26px 0 0 0;font-size:14px;color:#475569;line-height:1.7;">
            Talk soon,<br/><strong style="color:${NAVY};">The ${esc(opts.siteName)} Team</strong>
          </p>
          ${ccNote}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  // Plain text mirrors the structure: some clients strip HTML, and a recap that
  // arrives as one run-on paragraph is not a recap.
  const textLines: string[] = [`Hello ${firstName},`, "", "Here is your submission in full:", ""];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || String(value).trim() === "") return;
    textLines.push(`${label}: ${String(value).trim()}`);
  };
  push("Name", intake.submitter_name);
  push("Role", intake.submitter_role);
  push("Business", intake.submitter_company);
  push("Email", intake.submitter_email);
  push("Phone", intake.submitter_phone);
  textLines.push("");
  push("Services", services.join(", "));
  push("Project", intake.project_title);
  push("In your words", intake.description);
  push("Problem to solve", intake.problem_statement);
  push("What success looks like", intake.success_criteria);
  push("Timeline", intake.timeline);
  push("Budget range", intake.budget_range);
  for (const g of readAnswerGroups(serviceTypesOf(intake), intake.specifics)) {
    textLines.push("", `${g.serviceLabel}:`);
    for (const r of g.rows) textLines.push(`  ${r.label}: ${r.value}`);
  }
  if (opts.editUrl && (opts.editsRemaining ?? 0) > 0) {
    textLines.push("", `Update your answers: ${opts.editUrl}`);
  }
  textLines.push("", "Talk soon,", `The ${opts.siteName} Team`);

  return {
    subject: `Your submission to ${opts.siteName}${intake.project_title ? `: ${intake.project_title}` : ""}`,
    html,
    text: textLines.join("\n"),
  };
}

/**
 * Sends the recap to the person who submitted, copying whoever they asked for.
 *
 * Deliberately separate from the short acknowledgement in intake-mail.ts rather
 * than replacing it: the ack is the warm "we have you, here is what happens
 * next" and this is the record. Sending both, in that order, means the first
 * thing in the inbox is reassurance and the second is the paperwork, which is
 * the right way round.
 */
export async function sendIntakeRecap(
  intake: IntakeRecapSource,
  opts: { to: string; cc?: string[]; editUrl?: string | null; editsRemaining?: number }
): Promise<void> {
  const { subject, html, text } = renderIntakeRecap(intake, {
    editUrl: opts.editUrl ?? null,
    editsRemaining: opts.editsRemaining ?? 0,
    cc: opts.cc,
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
  });

  await transporter.sendMail({
    from: SENDERS.info,
    to: opts.to,
    cc: opts.cc,
    subject,
    html,
    text,
  });
}
