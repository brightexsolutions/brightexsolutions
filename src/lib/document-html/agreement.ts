import type { AgreementData } from "@/lib/document-types";
import {
  documentShell, sectionHeader, arrowList, investmentTable, signatureBlock, splitTitleForCover,
  noteBox, clauseParagraph, blurredSection, SITE_NAME,
} from "@/lib/document-html";
import { BUSINESS_CITY, BUSINESS_COUNTRY, SITE_URL, whatsappUrl } from "@/lib/constants";

function fmt(n: number): string {
  return `KES ${n.toLocaleString("en-KE")}`;
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}

// Fixed legal clauses — never AI-generated, edit here only after legal review.
const CLAUSES = {
  ip: "Upon receipt of full payment, all custom deliverables produced specifically for the Client under this Agreement (source code, designs, and content created by Brightex Solutions for this project) transfer to the Client. Brightex Solutions retains the right to use pre-existing tools, frameworks, libraries, and general know-how, and may reference the completed project in its own portfolio unless the Client requests otherwise in writing.",
  confidentiality: "Both parties agree to keep confidential any non-public business, technical, or financial information disclosed during the course of this engagement, and to use such information solely for the purposes of this Agreement. This obligation survives the completion or termination of this Agreement.",
  changes: "Any request to change the agreed scope of work will be assessed by Brightex Solutions and, where it materially affects timeline or cost, will be documented and quoted separately before work proceeds. Verbal change requests are not binding until confirmed in writing.",
  termination: "Either party may terminate this Agreement with 14 days' written notice. Upon termination, the Client is responsible for payment for all work completed up to the termination date. Any deposit paid is non-refundable once work has commenced, except where Brightex Solutions is unable to begin the engagement.",
  liability: "Brightex Solutions' total liability under this Agreement is limited to the total fees paid by the Client for the specific engagement giving rise to the claim. Brightex Solutions is not liable for indirect, incidental, or consequential damages, including loss of profits or data, arising from the use of the delivered work.",
  governingLaw: "This Agreement is governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute arising from this Agreement will first be addressed through good-faith negotiation between the parties before pursuing formal legal action.",
};

export function renderAgreementHtml(data: AgreementData): string {
  const clientLabel = data.client.company?.trim() || data.client.name;

  const sections: string[] = [];
  let n = 1;
  const num = () => String(n++).padStart(2, "0");

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Agreement", "Parties")}
    ${clauseParagraph(`This Services Agreement ("Agreement") is entered into between ${SITE_NAME}, a technology and business consulting firm based in ${BUSINESS_CITY}, ${BUSINESS_COUNTRY} ("Service Provider"), and ${clientLabel} ("Client"), on ${fmtDate(data.created_at)}, for the engagement described below.`)}
  </section>`);

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Deliverables", "Scope of Work")}
    ${clauseParagraph(data.scope_summary)}
    ${data.deliverables.length ? arrowList(data.deliverables) : ""}
  </section>`);

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Billing", "Fees & Payment Schedule")}
    ${investmentTable(
      data.payment_milestones.map((m) => ({ desc: m.label, sub: m.due, amount: fmt(m.amount) })),
      { label: "Total Fees", amount: fmt(data.total_fees) }
    )}
  </section>`);

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Schedule", "Timeline")}
    ${clauseParagraph(`The engagement described in this Agreement is expected to be completed within ${data.timeline} of the Client meeting its obligations under Section 03, subject to timely feedback and material provided by the Client.`)}
  </section>`);

  const clauseSections: [string, string][] = [
    ["Intellectual Property", CLAUSES.ip],
    ["Confidentiality", CLAUSES.confidentiality],
    ["Changes to Scope", CLAUSES.changes],
    ["Termination", CLAUSES.termination],
    ["Limitation of Liability", CLAUSES.liability],
    ["Governing Law", CLAUSES.governingLaw],
  ];
  for (const [title, text] of clauseSections) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Legal", title)}
      ${clauseParagraph(text)}
    </section>`);
  }

  if (data.special_terms) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Additional", "Special Terms")}
      ${clauseParagraph(data.special_terms)}
    </section>`);
  }

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Sign-off", "Signatures")}
    ${noteBox("This document is AI-assisted and reflects the commercial terms of the engagement as understood at the time of drafting. It should be reviewed by both parties before signature.")}
    ${signatureBlock(SITE_NAME, clientLabel)}
  </section>`);

  return documentShell({
    title: `${data.project_title} — Services Agreement ${data.agreement_number}`,
    dlBarLabel: `SERVICES AGREEMENT · ${clientLabel.toUpperCase()}`,
    coverTag: "Services Agreement",
    coverTitleLines: splitTitleForCover(data.project_title),
    coverSub: `Between ${SITE_NAME} and ${clientLabel}.`,
    metaFields: [
      { label: "Client", value: clientLabel },
      { label: "Date", value: fmtDate(data.created_at) },
      { label: "Reference", value: data.agreement_number },
      { label: "Timeline", value: data.timeline },
    ],
    badges: [{ label: "Total Fees", value: fmt(data.total_fees) }],
    confidentialFor: clientLabel,
    tocItems: [
      { num: "01", label: "Parties" },
      { num: "02", label: "Scope of Work" },
      { num: "03", label: "Fees & Payment Schedule" },
      { num: "04", label: "Timeline" },
      { num: "05", label: "Intellectual Property" },
      { num: "06", label: "Confidentiality" },
      { num: "07", label: "Changes to Scope" },
      { num: "08", label: "Termination" },
      { num: "09", label: "Limitation of Liability" },
      { num: "10", label: "Governing Law" },
    ],
    bodyHtml: sections.join("\n"),
  });
}

/**
 * Gated preview — see renderProposalTeaserHtml for the reasoning. Shows the
 * real scope and total fees (trust through specificity, price anchoring)
 * but withholds the payment milestone breakdown and every legal clause,
 * released after the walkthrough call.
 */
export function renderAgreementTeaserHtml(data: AgreementData): string {
  const clientLabel = data.client.company?.trim() || data.client.name;

  const sections: string[] = [];
  const tocLabels: string[] = [];
  let n = 1;
  const num = () => String(n++).padStart(2, "0");

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Deliverables", "Scope of Work")}
    ${clauseParagraph(data.scope_summary)}
    ${data.deliverables.length ? arrowList(data.deliverables) : ""}
  </section>`);
  tocLabels.push("Scope of Work");

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Schedule", "Timeline")}
    ${clauseParagraph(`This engagement is expected to be completed within ${data.timeline} of kick-off, subject to timely feedback and materials from your side.`)}
  </section>`);
  tocLabels.push("Timeline");

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Billing", "Fees & Payment Schedule")}
    ${blurredSection(
      investmentTable(
        data.payment_milestones.map((m) => ({ desc: m.label, sub: m.due, amount: fmt(m.amount) })),
        { label: "Total Fees", amount: fmt(data.total_fees) }
      ),
      {
        heading: "Your full fee schedule is ready.",
        body: "We've broken down the milestones and payment schedule for your project. Let's walk through it together and lock in your timeline.",
        buttonLabel: "Schedule a Walkthrough",
        buttonHref: `${SITE_URL}/contact?intent=book_call`,
        secondaryLabel: "Prefer to chat first? Message us on WhatsApp",
        secondaryHref: whatsappUrl(`Hi, I'd like to go through the ${data.project_title} agreement.`),
      }
    )}
  </section>`);
  tocLabels.push("Fees & Payment Schedule");

  return documentShell({
    title: `${data.project_title} — Services Agreement ${data.agreement_number}`,
    dlBarLabel: `SERVICES AGREEMENT · ${clientLabel.toUpperCase()}`,
    coverTag: "Services Agreement",
    coverTitleLines: splitTitleForCover(data.project_title),
    coverSub: `Between ${SITE_NAME} and ${clientLabel}.`,
    metaFields: [
      { label: "Client", value: clientLabel },
      { label: "Date", value: fmtDate(data.created_at) },
      { label: "Reference", value: data.agreement_number },
      { label: "Timeline", value: data.timeline },
    ],
    badges: [{ label: "Total Fees", value: fmt(data.total_fees) }],
    confidentialFor: clientLabel,
    tocItems: tocLabels.map((label, i) => ({ num: String(i + 1).padStart(2, "0"), label })),
    bodyHtml: sections.join("\n"),
    dlLocked: true,
  });
}
