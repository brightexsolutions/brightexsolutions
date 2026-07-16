import type { ProposalData, ScopeItem } from "@/components/admin/proposal-pdf";
import {
  documentShell, sectionHeader, execLede, kpiRow, arrowList, arrowListKeyValue, splitTitleForCover,
  investmentTable, stepsList, noteBox, aboutBox, blurredSection, scope3Grid, scopeLabel, tiersGrid,
  timeline, esc, SITE_NAME,
} from "@/lib/document-html";
import { SITE_URL, whatsappUrl } from "@/lib/constants";
import { PROCESS_STAGES } from "@/lib/brightex-sop";

/** The same 4-stage process shown on the public "How We Work" section —
 * generic and identical for every client, never deal-specific, so it's safe
 * to always show even on a gated document. */
function howWeWorkSection(num: string): string {
  return `<section class="section">
    ${sectionHeader(num, "Our Process", "How We Work")}
    ${stepsList(PROCESS_STAGES.map((s) => ({ title: s.title, desc: s.clientDescription })))}
  </section>`;
}

function fmt(n: number): string {
  return `KES ${n.toLocaleString("en-KE")}`;
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}

const ABOUT_TEXT = `${SITE_NAME} is a Nairobi-based technology and business consulting firm. We specialise in designing and building digital products, websites, web applications, management systems, and business automation tools, for organisations across East Africa and beyond. Every project we take on is built to a professional standard: clean code, modern design, and practical systems your team can actually use.`;

/** A scope item with a `tag` gets its own deep-dive section (problem/solution
 * cards + scope-at-a-glance grid) — a plainer item (just title/description)
 * renders as a simple card inside the shared "Scope of Work" section. AI
 * chooses depth per deliverable based on how much the engagement summary
 * actually supports; this only renders what's there, never invents detail. */
function hasDeepDive(item: ScopeItem): boolean {
  return !!item.tag;
}

function renderDeepDiveSection(item: ScopeItem, num: string): string {
  const hasCards = (item.problem_points?.length || item.solution_points?.length);
  const hasScope = (item.included?.length || item.excluded?.length || item.needed_from_client?.length);
  return `<section class="section">
    ${sectionHeader(num, item.tag ?? "Scope", item.title)}
    ${item.description ? `<p>${esc(item.description)}</p>` : ""}
    ${hasCards ? `<div class="cards">
      ${item.problem_points?.length ? `<div class="fcard"><div class="ficon">!</div><h4>Where it falls short today</h4>${arrowList(item.problem_points)}</div>` : ""}
      ${item.solution_points?.length ? `<div class="fcard"><div class="ficon">★</div><h4>What this delivers</h4>${arrowList(item.solution_points)}</div>` : ""}
    </div>` : ""}
    ${hasScope ? `${scopeLabel(`${item.title}: scope at a glance`)}${scope3Grid(item.included ?? [], item.excluded ?? [], item.needed_from_client ?? [])}` : ""}
  </section>`;
}

export function renderProposalHtml(data: ProposalData): string {
  const grandTotal = data.line_items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const deposit = data.payment_terms ? Math.round(grandTotal * (data.payment_terms.deposit_percent / 100)) : null;
  const balance = deposit != null ? grandTotal - deposit : null;
  const clientLabel = data.client.company?.trim() || data.client.name;

  const sections: string[] = [];
  const tocLabels: string[] = [];
  let n = 1;
  const num = () => String(n++).padStart(2, "0");

  if (data.intro) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Overview", "Executive Summary")}
      ${execLede(data.intro)}
      ${kpiRow([
        { value: fmt(grandTotal), label: "Total Investment" },
        ...(deposit != null ? [{ value: fmt(deposit), label: `Deposit (${data.payment_terms!.deposit_percent}%)` }] : []),
        { value: data.timeline ?? `${data.scope_items.length} deliverables`, label: data.timeline ? "Timeline" : "Deliverables" },
      ])}
    </section>`);
    tocLabels.push("Executive Summary");
  }

  if (data.problem_points?.length || data.solution_points?.length) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "The Brief", "Understanding the Brief")}
      <div class="cards">
        ${data.problem_points?.length ? `<div class="fcard"><div class="ficon">!</div><h4>Where things stand today</h4>${arrowList(data.problem_points)}</div>` : ""}
        ${data.solution_points?.length ? `<div class="fcard"><div class="ficon">✦</div><h4>What changes</h4>${arrowList(data.solution_points)}</div>` : ""}
      </div>
    </section>`);
    tocLabels.push("Understanding the Brief");
  }

  const deepDiveItems = data.scope_items.filter(hasDeepDive);
  const simpleItems = data.scope_items.filter((i) => !hasDeepDive(i));

  if (simpleItems.length > 0) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Deliverables", "Scope of Work")}
      <div class="cards">
        ${simpleItems.map((item) => `<div class="fcard">
          <div class="ficon">✓</div>
          <h4>${item.title}</h4>
          ${item.description ? arrowList([item.description]) : ""}
        </div>`).join("")}
      </div>
    </section>`);
    tocLabels.push("Scope of Work");
  }

  for (const item of deepDiveItems) {
    sections.push(renderDeepDiveSection(item, num()));
    tocLabels.push(item.title);
  }

  if (data.line_items.length > 0) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Pricing", "Investment & Pricing")}
      ${investmentTable(
        data.line_items.map((it) => ({
          desc: it.description,
          sub: it.qty > 1 ? `Qty ${it.qty} × ${fmt(it.unit_price)}` : undefined,
          amount: fmt(it.qty * it.unit_price),
        })),
        { label: "Total Investment", amount: fmt(grandTotal) }
      )}
      ${data.recommended_bundle ? `
        <h3 class="serif" style="color:var(--navy);margin:26px 0 0">${data.recommended_bundle.label}</h3>
        ${investmentTable(
          [{ desc: data.recommended_bundle.item_titles.join(" + "), sub: data.recommended_bundle.note ?? undefined, amount: fmt(data.recommended_bundle.amount) }],
          { label: "Recommended Package Total", amount: fmt(data.recommended_bundle.amount) }
        )}
      ` : ""}
      ${noteBox("Prices are estimates based on current scope. Any changes to scope or requirements after project commencement may be subject to a revised quotation.")}
    </section>`);
    tocLabels.push("Investment & Pricing");
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
    tocLabels.push("Payment Terms");
  }

  if (data.phased_timeline?.length) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "The Plan", "Timeline & Rollout")}
      ${timeline(data.phased_timeline.map((p) => ({ week: p.period, title: p.title, desc: p.description, launch: p.is_launch })))}
    </section>`);
    tocLabels.push("Timeline & Rollout");
  }

  if (data.retainer_tiers?.length) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Ongoing", "Ongoing Support & Growth")}
      <p>A project is rarely build-once-and-forget. These plans keep it working, improving and earning after launch.</p>
      ${tiersGrid(data.retainer_tiers)}
    </section>`);
    tocLabels.push("Ongoing Support & Growth");
  }

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Who We Are", "About Brightex Solutions")}
    ${aboutBox(ABOUT_TEXT)}
  </section>`);
  tocLabels.push("About Brightex Solutions");

  const validityDays = 14;
  const termsBullets = [
    { label: "Validity", detail: `this proposal and pricing are valid for ${validityDays} days from the date issued${data.valid_until ? ` (until ${fmtDate(data.valid_until)})` : ""}.` },
    ...(deposit != null ? [{ label: "To begin", detail: `a ${data.payment_terms!.deposit_percent}% deposit of ${fmt(deposit)} confirms the project and reserves the delivery slot.` }] : []),
    { label: "Ownership", detail: "all designs, code, content and concepts in this proposal remain the property of Brightex Solutions, and are licensed to the client on full payment." },
    { label: "Confidentiality", detail: "this document is shared in confidence for evaluation only, not to be redistributed or used to brief another developer." },
  ];

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Working Together", "Terms & Next Steps")}
    <div class="cards">
      <div class="fcard">
        <h4>Simple, fair terms</h4>
        ${arrowListKeyValue(termsBullets)}
      </div>
      <div class="fcard">
        <h4>Next steps</h4>
        ${stepsList((data.next_steps?.length ? data.next_steps : [
          { title: "Confirm and sign off", description: "Reply to confirm your acceptance of the scope and terms." },
          { title: "Pay the deposit", description: deposit != null ? `Transfer the deposit of ${fmt(deposit)} to confirm the project start date.` : "Transfer the agreed deposit to confirm the project start date." },
          { title: "Kick-off", description: "We schedule a kick-off call to align on milestones and delivery timeline." },
        ]).map((s) => ({ title: s.title, desc: s.description })))}
      </div>
    </div>
    ${data.notes ? noteBox(data.notes) : ""}
  </section>`);
  tocLabels.push("Terms & Next Steps");

  return documentShell({
    title: `${data.project_title} — Proposal ${data.proposal_number}`,
    dlBarLabel: `PROPOSAL · ${clientLabel.toUpperCase()}`,
    coverTag: "Project Proposal",
    coverTitleLines: splitTitleForCover(data.cover_tagline?.trim() || data.project_title),
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
    tocItems: tocLabels.map((label, i) => ({ num: String(i + 1).padStart(2, "0"), label })),
    bodyHtml: sections.join("\n"),
  });
}

/**
 * Gated preview — shown on the public link instead of the full proposal when
 * a document is marked `gated`. Deliberately not a "paywall": the full
 * executive summary, deliverable titles, timeline, and total investment are
 * all real and specific (trust through specificity, and the headline number
 * pre-empts the silent "can I afford this" objection). Only the itemised
 * pricing breakdown and payment terms are held back, released once Godwin
 * has had the walkthrough call. Never mentions payment.
 */
export function renderProposalTeaserHtml(data: ProposalData): string {
  const grandTotal = data.line_items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const clientLabel = data.client.company?.trim() || data.client.name;

  const sections: string[] = [];
  const tocLabels: string[] = [];
  let n = 1;
  const num = () => String(n++).padStart(2, "0");

  // 01 — Executive Summary: the hook. Real and specific, always visible.
  if (data.intro) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Overview", "Executive Summary")}
      ${execLede(data.intro)}
      ${kpiRow([
        { value: fmt(grandTotal), label: "Total Investment" },
        { value: String(data.scope_items.length), label: "Deliverables" },
        ...(data.timeline ? [{ value: data.timeline, label: "Timeline" }] : []),
      ])}
    </section>`);
    tocLabels.push("Executive Summary");
  }

  // 02-N — the actual consulting output: problem framing, per-deliverable
  // solution design, pricing, and rollout plan. This is what took real time
  // to produce, so it's gated as one block, not given away with the hook.
  const gatedParts: string[] = [];
  let gn = 1;
  const gnum = () => String(gn++).padStart(2, "0");

  if (data.problem_points?.length || data.solution_points?.length) {
    gatedParts.push(`<section class="section">
      ${sectionHeader(gnum(), "The Brief", "Understanding the Brief")}
      <div class="cards">
        ${data.problem_points?.length ? `<div class="fcard"><div class="ficon">!</div><h4>Where things stand today</h4>${arrowList(data.problem_points)}</div>` : ""}
        ${data.solution_points?.length ? `<div class="fcard"><div class="ficon">✦</div><h4>What changes</h4>${arrowList(data.solution_points)}</div>` : ""}
      </div>
    </section>`);
  }

  const deepDiveItems = data.scope_items.filter(hasDeepDive);
  const simpleItems = data.scope_items.filter((i) => !hasDeepDive(i));

  if (simpleItems.length > 0) {
    gatedParts.push(`<section class="section">
      ${sectionHeader(gnum(), "Deliverables", "Scope of Work")}
      <div class="cards">
        ${simpleItems.map((item) => `<div class="fcard">
          <div class="ficon">✓</div>
          <h4>${esc(item.title)}</h4>
          ${item.description ? arrowList([item.description]) : ""}
        </div>`).join("")}
      </div>
    </section>`);
  }

  for (const item of deepDiveItems) {
    gatedParts.push(renderDeepDiveSection(item, gnum()));
  }

  if (data.line_items.length > 0) {
    gatedParts.push(`<section class="section">
      ${sectionHeader(gnum(), "Pricing", "Investment & Pricing")}
      ${investmentTable(
        data.line_items.map((it) => ({ desc: it.description, sub: it.qty > 1 ? `Qty ${it.qty} × ${fmt(it.unit_price)}` : undefined, amount: fmt(it.qty * it.unit_price) })),
        { label: "Total Investment", amount: fmt(grandTotal) }
      )}
    </section>`);
  }

  if (data.phased_timeline?.length) {
    gatedParts.push(`<section class="section">
      ${sectionHeader(gnum(), "The Plan", "Timeline & Rollout")}
      ${timeline(data.phased_timeline.map((p) => ({ week: p.period, title: p.title, desc: p.description, launch: p.is_launch })))}
    </section>`);
  }

  if (data.retainer_tiers?.length) {
    gatedParts.push(`<section class="section">
      ${sectionHeader(gnum(), "Ongoing", "Ongoing Support & Growth")}
      <p>A project is rarely build-once-and-forget. These plans keep it working, improving and earning after launch.</p>
      ${tiersGrid(data.retainer_tiers)}
    </section>`);
  }

  if (gatedParts.length > 0) {
    sections.push(`<section class="section">
      ${blurredSection(
        gatedParts.join("\n"),
        {
          heading: "Your detailed plan is ready.",
          body: "The full breakdown for each part of the project, the pricing, and the rollout plan are all mapped out. Let's walk through it together and lock in your timeline.",
          buttonLabel: "Schedule a Walkthrough",
          buttonHref: `${SITE_URL}/contact?intent=book_call`,
          secondaryLabel: "Prefer to chat first? Message us on WhatsApp",
          secondaryHref: whatsappUrl(`Hi, I'd like to go through the ${data.project_title} proposal.`),
        }
      )}
    </section>`);
    tocLabels.push("The Detailed Plan");
  }

  // Tail — only genuinely generic, non-deal-specific content is visible:
  // who Brightex is, and the standard process every client goes through.
  sections.push(`<section class="section">
    ${sectionHeader(num(), "Who We Are", "About Brightex Solutions")}
    ${aboutBox(ABOUT_TEXT)}
  </section>`);
  tocLabels.push("About Brightex Solutions");

  sections.push(howWeWorkSection(num()));
  tocLabels.push("How We Work");

  // Terms (deposit %, ownership, confidentiality) and this proposal's
  // specific next steps are deal-specific, so they're gated too — released
  // alongside the rest of the detailed plan.
  const validityDays = 14;
  const termsBullets = [
    { label: "Validity", detail: `this proposal is valid for ${validityDays} days from the date issued${data.valid_until ? ` (until ${fmtDate(data.valid_until)})` : ""}.` },
    ...(data.payment_terms ? [{ label: "To begin", detail: `a ${data.payment_terms.deposit_percent}% deposit confirms the project and reserves the delivery slot.` }] : []),
    { label: "Ownership", detail: "all designs, code, content and concepts in this proposal remain the property of Brightex Solutions, and are licensed to the client on full payment." },
    { label: "Confidentiality", detail: "this document is shared in confidence for evaluation only, not to be redistributed or used to brief another developer." },
  ];
  const termsAndNextSteps = `<section class="section">
    ${sectionHeader("", "Working Together", "Terms & Next Steps")}
    <div class="cards">
      <div class="fcard">
        <h4>Simple, fair terms</h4>
        ${arrowListKeyValue(termsBullets)}
      </div>
      <div class="fcard">
        <h4>Next steps</h4>
        ${stepsList((data.next_steps?.length ? data.next_steps : [
          { title: "Confirm and sign off", description: "Reply to confirm your interest and we'll set up a walkthrough call." },
          { title: "Walkthrough call", description: "We go through the full plan and pricing together, and answer any questions." },
          { title: "Kick-off", description: "Once confirmed, we schedule a kick-off and lock in the delivery timeline." },
        ]).map((s) => ({ title: s.title, desc: s.description })))}
      </div>
    </div>
  </section>`;
  sections.push(`<section class="section">
    ${blurredSection(termsAndNextSteps, {
      heading: "Ready for the details?",
      body: "The full terms and the next steps to get started are ready to go through together.",
      buttonLabel: "Schedule a Walkthrough",
      buttonHref: `${SITE_URL}/contact?intent=book_call`,
      secondaryLabel: "Prefer to chat first? Message us on WhatsApp",
      secondaryHref: whatsappUrl(`Hi, I'd like to go through the ${data.project_title} proposal.`),
    })}
  </section>`);
  tocLabels.push("Terms & Next Steps");

  return documentShell({
    title: `${data.project_title} — Proposal ${data.proposal_number}`,
    dlBarLabel: `PROPOSAL · ${clientLabel.toUpperCase()}`,
    coverTag: "Project Proposal",
    coverTitleLines: splitTitleForCover(data.cover_tagline?.trim() || data.project_title),
    coverSub: data.intro ?? undefined,
    metaFields: [
      { label: "Prepared For", value: clientLabel },
      { label: "Date", value: fmtDate(data.created_at) },
      { label: "Reference", value: data.proposal_number },
    ],
    badges: [
      { label: "Investment", value: fmt(grandTotal) },
      ...(data.timeline ? [{ label: "Timeline", value: data.timeline }] : []),
    ],
    confidentialFor: clientLabel,
    tocItems: tocLabels.map((label, i) => ({ num: String(i + 1).padStart(2, "0"), label })),
    bodyHtml: sections.join("\n"),
    dlLocked: true,
  });
}
