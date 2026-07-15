import type { ProposalData } from "@/components/admin/proposal-pdf";
import {
  documentShell, sectionHeader, execLede, kpiRow, arrowList, arrowListKeyValue, splitTitleForCover,
  investmentTable, stepsList, noteBox, aboutBox, SITE_NAME,
} from "@/lib/document-html";

function fmt(n: number): string {
  return `KES ${n.toLocaleString("en-KE")}`;
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderProposalHtml(data: ProposalData): string {
  const grandTotal = data.line_items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const deposit = data.payment_terms ? Math.round(grandTotal * (data.payment_terms.deposit_percent / 100)) : null;
  const balance = deposit != null ? grandTotal - deposit : null;
  const clientLabel = data.client.company?.trim() || data.client.name;

  const sections: string[] = [];
  let n = 1;
  const num = () => String(n++).padStart(2, "0");

  if (data.intro) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Overview", "Executive Summary")}
      ${execLede(data.intro)}
      ${kpiRow([
        { value: fmt(grandTotal), label: "Total Investment" },
        ...(deposit != null ? [{ value: fmt(deposit), label: `Deposit (${data.payment_terms!.deposit_percent}%)` }] : []),
        { value: String(data.scope_items.length), label: "Deliverables" },
        ...(data.timeline ? [{ value: data.timeline, label: "Timeline" }] : []),
      ])}
    </section>`);
  }

  if (data.scope_items.length > 0) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Deliverables", "Scope of Work")}
      <div class="cards">
        ${data.scope_items.map((item) => `<div class="fcard">
          <div class="ficon">✓</div>
          <h4>${item.title}</h4>
          ${item.description ? arrowList([item.description]) : ""}
        </div>`).join("")}
      </div>
    </section>`);
  }

  if (data.line_items.length > 0) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Pricing", "Investment & Pricing")}
      ${investmentTable(
        data.line_items.map((it) => ({ desc: it.description, sub: it.qty > 1 ? `Qty ${it.qty} × ${fmt(it.unit_price)}` : undefined, amount: fmt(it.qty * it.unit_price) })),
        { label: "Total Investment", amount: fmt(grandTotal) }
      )}
      ${noteBox("Prices are estimates based on current scope. Any changes to scope or requirements after project commencement may be subject to a revised quotation.")}
    </section>`);
  }

  if (data.payment_terms && deposit != null && balance != null) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Billing", "Payment Terms")}
      ${arrowListKeyValue([
        { label: `Deposit (${data.payment_terms.deposit_percent}%)`, detail: `${fmt(deposit)}, due to commence work.` },
        { label: `Balance (${100 - data.payment_terms.deposit_percent}%)`, detail: `${fmt(balance)}, due on delivery.` },
      ])}
      ${data.payment_terms.note ? noteBox(data.payment_terms.note) : ""}
    </section>`);
  }

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Who We Are", "About Brightex Solutions")}
    ${aboutBox(`${SITE_NAME} is a Nairobi-based technology and business consulting firm. We specialise in designing and building digital products, websites, web applications, management systems, and business automation tools, for organisations across East Africa and beyond. Every project we take on is built to a professional standard: clean code, modern design, and practical systems your team can actually use.`)}
  </section>`);

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Getting Started", "Next Steps")}
    ${stepsList([
      { title: "Review this proposal", desc: `Read through the scope and pricing in detail. This proposal is valid for 14 days from the date issued${data.valid_until ? ` (until ${fmtDate(data.valid_until)})` : ""}.` },
      { title: "Confirm and sign off", desc: "Reply to confirm your acceptance of the scope and terms. A written confirmation via email is sufficient to proceed." },
      { title: "Pay the deposit", desc: deposit != null ? `Transfer the deposit of ${fmt(deposit)} to confirm the project start date.` : "Transfer the agreed deposit to confirm the project start date." },
      { title: "Project kick-off", desc: "We schedule a kick-off call to align on milestones, communication channels, and delivery timeline." },
      { title: "Delivery and handover", desc: "We deliver the agreed scope, conduct a review session with you, address any amendments, and hand over all project assets." },
    ])}
    ${data.notes ? noteBox(data.notes) : ""}
  </section>`);

  return documentShell({
    title: `${data.project_title} — Proposal ${data.proposal_number}`,
    dlBarLabel: `PROPOSAL · ${clientLabel.toUpperCase()}`,
    coverTag: "Project Proposal",
    coverTitleLines: splitTitleForCover(data.project_title),
    coverSub: data.intro ?? undefined,
    metaFields: [
      { label: "Prepared For", value: clientLabel },
      { label: "Date", value: fmtDate(data.created_at) },
      { label: "Reference", value: data.proposal_number },
      ...(data.valid_until ? [{ label: "Valid Until", value: fmtDate(data.valid_until) }] : []),
    ],
    badges: [
      { label: "Investment", value: fmt(grandTotal) },
      ...(data.timeline ? [{ label: "Timeline", value: data.timeline }] : []),
    ],
    confidentialFor: clientLabel,
    tocItems: sections.map((_, i) => ({ num: String(i + 1).padStart(2, "0"), label: "" })).map((t, i) => ({
      num: t.num,
      label: [
        data.intro ? "Executive Summary" : null,
        data.scope_items.length ? "Scope of Work" : null,
        data.line_items.length ? "Investment & Pricing" : null,
        data.payment_terms && deposit != null ? "Payment Terms" : null,
        "About Brightex Solutions",
        "Next Steps",
      ].filter((x): x is string => !!x)[i] ?? "",
    })),
    bodyHtml: sections.join("\n"),
  });
}
