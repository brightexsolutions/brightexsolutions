/**
 * Deriving an agreement from an accepted proposal.
 *
 * The whole point of this file is that NO MODEL IS INVOLVED and no human
 * retypes anything. Scope, phases, timeline and figures are carried across from
 * the proposal the client actually read and accepted; the payment milestones
 * are computed from the schedule they actually chose; the legal clauses are
 * fixed text reviewed once. Nothing in an agreement is drafted afresh, because
 * every fresh draft is an opportunity for the contract to say something the
 * client never agreed to.
 *
 * The previous route to an agreement flattened a proposal into a prose summary
 * and asked a model to write a contract from it. That is precisely where a
 * number drifts, and a drifted number in a contract is not a typo, it is a
 * dispute.
 *
 * Ranges are the one thing that cannot carry across untouched. A proposal
 * quoting "135,000 to 210,000" is honest at proposal stage and unusable in a
 * contract, so derivation REQUIRES the figures to have been pinned first (see
 * applyLockedFigures). It refuses rather than picking an end of the range.
 */
import type {
  BlockDocument, Block, DocSection, PaymentSchedule, Money,
} from "./blocks";
import { parseMoney, fmtKes, isRanged, documentTotal, rangedAmounts } from "./blocks";
import { SITE_NAME, BUSINESS_CITY, BUSINESS_COUNTRY } from "@/lib/constants";

// Fixed legal clauses. Kept identical to the set in ./agreement.ts, which is
// the version that has been in use: this is deliberately a copy of reviewed
// text, not a rewrite of it. Edit only after legal review.
const CLAUSES: { heading: string; text: string }[] = [
  {
    heading: "Intellectual Property",
    text: "Upon receipt of full payment, all custom deliverables produced specifically for the Client under this Agreement (source code, designs, and content created by Brightex Solutions for this project) transfer to the Client. Brightex Solutions retains the right to use pre-existing tools, frameworks, libraries, and general know-how, and may reference the completed project in its own portfolio unless the Client requests otherwise in writing.",
  },
  {
    heading: "Confidentiality",
    text: "Both parties agree to keep confidential any non-public business, technical, or financial information disclosed during the course of this engagement, and to use such information solely for the purposes of this Agreement. This obligation survives the completion or termination of this Agreement.",
  },
  {
    heading: "Changes to Scope",
    text: "Any request to change the agreed scope of work will be assessed by Brightex Solutions and, where it materially affects timeline or cost, will be documented and quoted separately before work proceeds. Verbal change requests are not binding until confirmed in writing.",
  },
  {
    heading: "Termination",
    text: "Either party may terminate this Agreement with 14 days' written notice. Upon termination, the Client is responsible for payment for all work completed up to the termination date. Any deposit paid is non-refundable once work has commenced, except where Brightex Solutions is unable to begin the engagement.",
  },
  {
    heading: "Limitation of Liability",
    text: "Brightex Solutions' total liability under this Agreement is limited to the total fees paid by the Client for the specific engagement giving rise to the claim. Brightex Solutions is not liable for indirect, incidental, or consequential damages, including loss of profits or data, arising from the use of the delivered work.",
  },
  {
    heading: "Governing Law",
    text: "This Agreement is governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute arising from this Agreement will first be addressed through good-faith negotiation between the parties before pursuing formal legal action.",
  },
];

/** A figure pinned by a human, replacing a range quoted in the proposal. */
export interface LockedFigure {
  blockId: string;
  rowIndex: number;
  /** The agreed amount, as a plain number. */
  amount: number;
}

/**
 * Replaces ranged amounts with the figures that were agreed, and recomputes
 * every affected total.
 *
 * Totals are recomputed rather than also being supplied, so a locked set can
 * never produce rows that do not add up to their own total.
 */
export function applyLockedFigures(doc: BlockDocument, locked: LockedFigure[]): BlockDocument {
  if (locked.length === 0) return doc;

  const byBlock = new Map<string, Map<number, number>>();
  for (const f of locked) {
    if (!byBlock.has(f.blockId)) byBlock.set(f.blockId, new Map());
    byBlock.get(f.blockId)!.set(f.rowIndex, f.amount);
  }

  const next = structuredClone(doc);
  for (const section of next.sections) {
    for (const block of section.blocks) {
      if (block.kind !== "investment_table" && block.kind !== "phased_investment_table") continue;
      const rowMap = byBlock.get(block.id);
      if (!rowMap) continue;

      const rows = block.rows as { amount: string }[];
      rows.forEach((row, i) => {
        const amount = rowMap.get(i);
        if (amount !== undefined) row.amount = fmtKes(amount);
      });

      const sum = rows.reduce((s, r) => s + (parseMoney(r.amount)?.min ?? 0), 0);
      block.total.amount = fmtKes(sum);
    }
  }
  return next;
}

/** Sections carrying scope: what the client is buying. */
function scopeSections(doc: BlockDocument): DocSection[] {
  return doc.sections.filter(
    (s) =>
      !s.hidden &&
      !s.indicative &&
      s.blocks.some((b) =>
        ["phases", "scope_3col", "arrow_list", "cards_grid", "prose", "exec_lede"].includes(b.kind)
      ) &&
      !s.blocks.some((b) => b.kind === "investment_table" || b.kind === "phased_investment_table")
  );
}

/** The obligations the proposal put on the client, which become contractual. */
function clientObligations(doc: BlockDocument): string[] {
  const out: string[] = [];
  for (const section of doc.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind === "note" && block.items?.length && /need|require|from you|from the client/i.test(block.heading ?? "")) {
        out.push(...block.items);
      }
      if (block.kind === "scope_3col") out.push(...block.neededFromClient);
    }
  }
  return out;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

/** Trigger wording as it should read in a contract, not in a UI. */
function triggerText(stage: PaymentSchedule["stages"][number]): string {
  switch (stage.trigger) {
    case "on_signature": return "On signing of this Agreement";
    case "on_milestone": return `On completion of milestone ${(stage.milestone_index ?? 0) + 1}`;
    case "on_completion": return "On completion and handover";
    case "on_date": return stage.due_date ? `On ${fmtDate(stage.due_date)}` : "On the agreed date";
  }
}

export interface DeriveOptions {
  referenceCode: string;
  schedule: PaymentSchedule;
  locked?: LockedFigure[];
  /** Countersignature, stamped at creation so the client never receives an
   * agreement that is unsigned on our side. */
  brightexSignatory: { name: string; title: string };
  createdAt?: string;
  specialTerms?: string | null;
}

export interface DeriveResult {
  ok: boolean;
  doc?: BlockDocument;
  error?: string;
  total?: Money;
}

export function deriveAgreement(proposal: BlockDocument, opts: DeriveOptions): DeriveResult {
  if (proposal.type !== "proposal") {
    return { ok: false, error: "Only a proposal can be turned into an agreement." };
  }

  const resolved = applyLockedFigures(proposal, opts.locked ?? []);

  // Refuse rather than guess. Picking either end of a quoted range would be
  // inventing a contract price the client never agreed to.
  const stillRanged = rangedAmounts(resolved);
  if (stillRanged.length > 0) {
    return {
      ok: false,
      error:
        "This proposal still quotes ranges. Confirm a final figure for each before an agreement can be prepared: " +
        stillRanged.map((r) => r.label).join("; "),
    };
  }

  const total = documentTotal(resolved);
  if (!total || isRanged(total)) {
    return { ok: false, error: "This proposal has no single agreed total to contract on." };
  }

  const percentSum = opts.schedule.stages.reduce((s, st) => s + st.percent, 0);
  if (percentSum !== 100) {
    return { ok: false, error: `The payment schedule adds up to ${percentSum}%, not 100%.` };
  }

  const createdAt = opts.createdAt ?? new Date().toISOString();
  const client = resolved.meta.client;
  const clientLabel = client.company?.trim() || client.name;
  const obligations = clientObligations(resolved);

  // Milestone amounts: every stage but the last is rounded to the shilling, and
  // the last takes the remainder. Percentages of an odd total do not divide
  // cleanly, and a contract whose milestones sum to one shilling less than its
  // own total is the kind of detail that costs a phone call to explain.
  let allocated = 0;
  const milestoneRows = opts.schedule.stages.map((stage, i) => {
    const isLast = i === opts.schedule.stages.length - 1;
    const amount = isLast ? total.min - allocated : Math.round((total.min * stage.percent) / 100);
    allocated += amount;
    return {
      phase: `${stage.percent}%`,
      desc: `${stage.label}. ${triggerText(stage)}.`,
      amount: fmtKes(amount),
    };
  });

  const sections: DocSection[] = [];

  sections.push({
    id: "parties",
    tag: "Agreement",
    title: "Parties & Engagement",
    locked: true,
    blocks: [{
      id: "parties-p",
      kind: "clauses",
      clauses: [{
        text: `This Services Agreement ("Agreement") is entered into between ${SITE_NAME}, a technology and business consulting firm based in ${BUSINESS_CITY}, ${BUSINESS_COUNTRY} ("Service Provider"), and ${clientLabel} ("Client"), on ${fmtDate(createdAt)}, for the engagement described below. It formalises the proposal ${proposal.meta.reference_code}, accepted by the Client, and supersedes any prior discussion of scope or price.`,
      }],
    }],
  });

  // Scope, carried across verbatim from what the client read.
  for (const section of scopeSections(resolved)) {
    sections.push({
      ...structuredClone(section),
      id: `scope-${section.id}`,
      gated: false,
      blocks: section.blocks.map((b) => ({ ...structuredClone(b), id: `agr-${b.id}` })) as Block[],
    });
  }

  const investmentBlocks: Block[] = [];
  for (const section of resolved.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind === "investment_table" || block.kind === "phased_investment_table") {
        investmentBlocks.push({ ...structuredClone(block), id: `agr-${block.id}` } as Block);
      }
    }
  }

  sections.push({
    id: "fees",
    tag: "Commercials",
    title: "Fees & Payment Schedule",
    locked: true,
    blocks: [
      ...investmentBlocks,
      {
        id: "fees-schedule",
        kind: "phased_investment_table",
        rows: milestoneRows,
        total: { label: "Total contract value", amount: fmtKes(total.min) },
      },
      {
        id: "fees-terms",
        kind: "clauses",
        clauses: [{
          text: `The total fee for this engagement is KES ${fmtKes(total.min)}, payable as set out above. Work commences on receipt of the first payment. Invoices are issued at each stage and are due within seven (7) days of issue. All amounts are in Kenyan Shillings and exclusive of any third-party costs (domain registration, hosting, paid tooling or advertising spend), which remain the Client's responsibility unless expressly stated otherwise in the scope above.`,
        }],
      },
    ],
  });

  const timelineSection = resolved.sections.find(
    (s) => !s.hidden && s.blocks.some((b) => b.kind === "timeline")
  );
  if (timelineSection) {
    sections.push({
      id: "timeline",
      tag: "Schedule",
      title: "Timeline",
      locked: true,
      blocks: [
        ...timelineSection.blocks
          .filter((b) => b.kind === "timeline")
          .map((b) => ({ ...structuredClone(b), id: `agr-${b.id}` }) as Block),
        {
          id: "timeline-clause",
          kind: "clauses",
          clauses: [{
            text: "The schedule above runs from the date of the first payment and assumes the Client meets its obligations under this Agreement. Delays in feedback, approvals, access or materials extend the affected dates by the period of the delay.",
          }],
        },
      ],
    });
  }

  if (obligations.length > 0) {
    sections.push({
      id: "obligations",
      tag: "Responsibilities",
      title: "Client Responsibilities",
      locked: true,
      blocks: [
        { id: "oblig-intro", kind: "prose", paragraphs: ["The Client agrees to provide the following, without which the schedule above cannot be met:"] },
        { id: "oblig-list", kind: "arrow_list", items: obligations },
      ],
    });
  }

  sections.push({
    id: "terms",
    tag: "Legal",
    title: "Terms & Conditions",
    locked: true,
    blocks: [{ id: "terms-clauses", kind: "clauses", clauses: CLAUSES }],
  });

  if (opts.specialTerms?.trim()) {
    sections.push({
      id: "special",
      tag: "Legal",
      title: "Special Terms",
      blocks: [{ id: "special-clause", kind: "clauses", clauses: [{ text: opts.specialTerms.trim() }] }],
    });
  }

  sections.push({
    id: "signatures",
    tag: "Execution",
    title: "Signatures",
    locked: true,
    blocks: [
      {
        id: "sig-intro",
        kind: "prose",
        paragraphs: [
          // Phrased to avoid naming Brightex twice: the signatory's title
          // already carries it ("Lead at Brightex Solutions").
          `${opts.brightexSignatory.name}, ${opts.brightexSignatory.title}, signed this Agreement on ${fmtDate(createdAt)}. The Client's signature below completes it and starts the engagement.`,
        ],
      },
    ],
  });

  const doc: BlockDocument = {
    version: 2,
    type: "agreement",
    meta: {
      title: `Services Agreement: ${resolved.meta.client.company || resolved.meta.client.name}`,
      coverTag: "Services agreement",
      coverTitle: `Services Agreement between ${SITE_NAME} and ${clientLabel}.`,
      coverSub: `Formalising ${proposal.meta.reference_code}: scope, fees, timeline and terms as accepted.`,
      reference_code: opts.referenceCode,
      created_at: createdAt,
      client: structuredClone(resolved.meta.client),
      badges: [
        { label: "Contract value", value: `KES ${fmtKes(total.min)}` },
        { label: "Payment", value: opts.schedule.stages.map((s) => `${s.percent}%`).join(" / ") },
      ],
      confidentialFor: clientLabel,
    },
    sections,
    schedule: opts.schedule,
  };

  return { ok: true, doc, total };
}
