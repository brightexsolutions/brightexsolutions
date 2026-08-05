/**
 * The written record of a discovery call.
 *
 * A call is where scope is actually agreed, and it is the one artefact in the
 * whole pipeline that normally leaves no trace. The intake is written down, the
 * proposal is written down, the agreement is written down, and the conversation
 * that determined all three lives in one person's memory and a page of notes.
 *
 * Sending the summary does three things:
 *   - it confirms we heard correctly, while it is still cheap to correct
 *   - it puts what the client committed to providing in writing, before it
 *     becomes the reason a timeline slipped
 *   - it gives the proposal that follows an obvious basis, so a price does not
 *     arrive out of nowhere
 *
 * Written as a plain record, not a sales email: what was discussed, what was
 * agreed, what we need, what happens next.
 */
import { transporter, SENDERS } from "@/lib/mail";
import { emailTemplate, emailParagraph, emailInfoCard, emailButton, emailDivider, emailSignoff } from "@/lib/email-templates";
import { esc } from "@/lib/document-html";

export interface CallSummary {
  clientName: string;
  /** Who was on the call, both sides. */
  attendees: string[];
  callDate: string;
  /** The substance: what was covered and what the client told us. */
  discussed: string[];
  /** Positions reached. These are the ones worth being wrong about in writing
   * now rather than in dispute later. */
  agreed: string[];
  /** What the client owes us before work can start or continue. */
  neededFromClient: string[];
  /** Explicitly out of scope, where the call raised it. Recording the "no" is
   * as valuable as recording the "yes". */
  notCovered?: string[];
  nextSteps: string[];
  /** Link to the proposal, when it goes out alongside this. */
  documentUrl?: string | null;
  documentLabel?: string | null;
}

function bulletList(items: string[]): string {
  return `<ul style="margin:0 0 4px 0;padding-left:18px;">${items
    .map((i) => `<li style="font-size:14px;color:#475569;line-height:1.7;margin-bottom:7px;">${esc(i)}</li>`)
    .join("")}</ul>`;
}

function block(title: string, items: string[]): string {
  if (items.length === 0) return "";
  return (
    `<p style="margin:22px 0 8px 0;font-size:11px;font-weight:700;letter-spacing:.08em;color:#e8920a;text-transform:uppercase;">${esc(title)}</p>` +
    bulletList(items)
  );
}

export function renderCallSummary(summary: CallSummary): { subject: string; html: string; text: string } {
  const firstName = summary.clientName.trim().split(/\s+/)[0];
  const dateLabel = new Date(summary.callDate).toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const html = emailTemplate({
    title: "Notes from our call",
    subtitle: dateLabel,
    preheader: `What we discussed and agreed on ${dateLabel}`,
    heroLabel: "Call summary",
    heroTitle: "Here is what\nwe agreed.",
    body:
      emailParagraph(`Hi ${esc(firstName)}, thank you for your time. Writing this down while it is fresh so we are working from the same understanding. If anything below is not how you remember it, tell us now rather than later.`) +
      emailInfoCard("📅", "Call", dateLabel) +
      emailInfoCard("👥", "On the call", summary.attendees.join(", ")) +
      block("What we discussed", summary.discussed) +
      block("What we agreed", summary.agreed) +
      block("What we need from you", summary.neededFromClient) +
      (summary.notCovered?.length ? block("Not included", summary.notCovered) : "") +
      block("Next steps", summary.nextSteps) +
      (summary.documentUrl
        ? emailDivider() +
          emailParagraph("The proposal that follows from this is ready to read.") +
          emailButton(summary.documentLabel ?? "Read the proposal", summary.documentUrl)
        : "") +
      emailSignoff(),
  });

  const textLines = [
    `Hi ${firstName},`,
    "",
    `Notes from our call on ${dateLabel}.`,
    `On the call: ${summary.attendees.join(", ")}`,
  ];
  const push = (title: string, items: string[]) => {
    if (items.length === 0) return;
    textLines.push("", `${title.toUpperCase()}`);
    for (const i of items) textLines.push(`  - ${i}`);
  };
  push("What we discussed", summary.discussed);
  push("What we agreed", summary.agreed);
  push("What we need from you", summary.neededFromClient);
  if (summary.notCovered?.length) push("Not included", summary.notCovered);
  push("Next steps", summary.nextSteps);
  if (summary.documentUrl) textLines.push("", `Read the proposal: ${summary.documentUrl}`);
  textLines.push("", "If anything above is not how you remember it, tell us now rather than later.", "",
    "Best regards,", "The Brightex Solutions Team");

  return {
    subject: `Notes from our call, ${dateLabel}`,
    html,
    text: textLines.join("\n"),
  };
}

export async function sendCallSummary(
  summary: CallSummary,
  opts: { to: string; cc?: string[] }
): Promise<void> {
  const { subject, html, text } = renderCallSummary(summary);
  await transporter.sendMail({ from: SENDERS.info, to: opts.to, cc: opts.cc, subject, html, text });
}
