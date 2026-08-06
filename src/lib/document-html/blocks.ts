/**
 * Block document model.
 *
 * Why this exists
 * ───────────────
 * A document used to be a fixed shape per type (ProposalData, AgreementData,
 * SopData), and anything the shape could not express fell back to a verbatim
 * `raw_html` blob. Neither path supports the things a real engagement needs:
 * hiding a section for one client, editing or improving one section without
 * regenerating the rest, building from a template, or generating a teaser
 * automatically. A shape cannot be reordered and a blob cannot be edited.
 *
 * So a document is now an ordered list of blocks. Each block names a kind, and
 * each kind maps onto a builder in ./index.ts. The renderer here is a
 * dispatcher: it owns no markup of its own, which is what keeps every document
 * looking like the house reference rather than approximating it.
 *
 * What the model buys, concretely
 * ───────────────────────────────
 *   hidden      excluded from every rendering
 *   gated       blurred behind the paywall card when the document is gated,
 *               so a teaser is derived rather than authored twice
 *   locked      AI refinement refuses to touch it (fixed clauses, totals)
 *   indicative  present but NOT part of the contracted total: out-of-scope
 *               items, future enhancements, post-launch retainers. This one is
 *               load-bearing: an agreement derived from a proposal that summed
 *               a retainer tier into the project fee is a wrong contract, and
 *               a naming convention is not strong enough to prevent it.
 *
 * Section numbers and the table of contents are DERIVED from the visible block
 * list, never authored. Hand-maintained numbering drifts: the CHANF reference
 * proposal in docs/fixtures/ has HTML comments whose numbers disagree with the
 * rendered ones, which is the ordinary outcome of editing by hand.
 */
import type { ExecutedParty } from "./index";
import {
  documentShell, sectionHeader, execLede, kpiRow, arrowList, arrowListKeyValue,
  investmentTable, phasedInvestmentTable, cardsGrid, phaseList, dataTable,
  scopeOut, noteBox, noteBoxTitled, aboutBox, chipRow, timeline, stepsList,
  tiersGrid, scope3Grid, clauseParagraph, signatureBlock, blurredSection,
  indicativeNote, splitTitleForCover, executedSignatures, esc,
} from "./index";

// ─── Block kinds ────────────────────────────────────────────────────────────

export type BlockKind =
  | "prose"
  | "exec_lede"
  | "kpi_row"
  | "cards_grid"
  | "arrow_list"
  | "key_value_list"
  | "chips"
  | "phases"
  | "scope_3col"
  | "investment_table"
  | "phased_investment_table"
  | "scope_out"
  | "data_table"
  | "tiers"
  | "timeline"
  | "steps"
  | "note"
  | "about"
  | "clauses"
  | "signature"
  | "signed_by";

/** Content shapes, one per kind. Kept as a discriminated union so a malformed
 * block is a type error at the point it is built, not a blank section at the
 * point a client opens the link. */
export type BlockContent =
  | { kind: "prose"; paragraphs: string[] }
  | { kind: "exec_lede"; text: string; paragraphs?: string[] }
  | { kind: "kpi_row"; items: { value: string; label: string }[] }
  | { kind: "cards_grid"; cards: { icon?: string; title: string; body?: string; points?: string[] }[] }
  | { kind: "arrow_list"; items: string[] }
  | { kind: "key_value_list"; items: { label: string; detail: string }[] }
  | { kind: "chips"; items: string[] }
  | { kind: "phases"; phases: { name: string; duration: string; items: string[] }[] }
  | { kind: "scope_3col"; included: string[]; excluded: string[]; neededFromClient: string[] }
  | { kind: "investment_table"; rows: { desc: string; sub?: string; amount: string }[]; total: { label: string; amount: string } }
  | { kind: "phased_investment_table"; rows: { phase: string; desc: string; amount: string }[]; total: { label: string; amount: string } }
  | { kind: "scope_out"; heading: string; rows: { label: string; detail: string }[] }
  | { kind: "data_table"; headers: string[]; rows: string[][] }
  | { kind: "tiers"; tiers: { name: string; price: number | string; priceSuffix?: string; desc?: string; features: string[]; featured?: boolean }[] }
  | { kind: "timeline"; rows: { week: string; title: string; desc: string; launch?: boolean }[] }
  | { kind: "steps"; steps: { title: string; desc: string }[] }
  | { kind: "note"; heading?: string; text: string; items?: string[]; mono?: string; solid?: boolean }
  | { kind: "about"; text: string; paragraphs?: string[] }
  | { kind: "clauses"; clauses: { heading?: string; text: string }[] }
  | { kind: "signature"; leftLabel: string; rightLabel: string }
  /**
   * The execution block, with whoever has already signed filled in.
   *
   * Distinct from `signature`, which draws empty ruled lines for a printed
   * document. This one carries real names, marks and dates: Brightex's side is
   * present from the moment the agreement is created, so a client never opens a
   * contract that is blank where we should be. `awaiting` is the other party's
   * space, shown until they sign.
   */
  | {
      kind: "signed_by";
      parties: { role: string; name: string; title?: string | null; entity?: string | null; imageUrl?: string | null; signedAt: string }[];
      awaiting?: { role: string; label: string } | null;
    };

/** One block of content inside a section. A section can hold several. */
export type Block = BlockContent & {
  id: string;
};

/** A numbered, titled section of the document. Sections carry the flags,
 * because hiding or gating half a section is not a thing anyone wants: the
 * unit a client perceives is the section. */
export interface DocSection {
  id: string;
  /** Small uppercase kicker above the title ("Overview", "Pricing"). */
  tag: string;
  title: string;
  blocks: Block[];
  hidden?: boolean;
  gated?: boolean;
  locked?: boolean;
  indicative?: boolean;
  /** Overrides the default gate copy for this section. */
  gateCopy?: { heading: string; body: string; buttonLabel: string; buttonHref: string };
}

export interface DocMeta {
  title: string;
  /** Cover kicker, e.g. "WEBSITE REDESIGN & DIGITAL PARTNERSHIP PROPOSAL". */
  coverTag: string;
  /** Cover headline. The last words render bold in orange. */
  coverTitle: string;
  coverSub?: string;
  reference_code: string;
  created_at: string;
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null };
  metaFields?: { label: string; value: string }[];
  badges?: { label: string; value: string }[];
  confidentialFor?: string | null;
}

export interface BlockDocument {
  version: 2;
  type: "proposal" | "agreement" | "techdoc" | "sop";
  meta: DocMeta;
  sections: DocSection[];
  /** The payment schedule the proposal states. Drives the agreement's milestone
   * table and the invoice tranches, so all three agree by construction rather
   * than by being retyped in three places. */
  schedule?: PaymentSchedule;
}

export type ScheduleTrigger = "on_signature" | "on_milestone" | "on_completion" | "on_date";

export interface ScheduleStage {
  label: string;
  percent: number;
  trigger: ScheduleTrigger;
  milestone_index?: number;
  due_date?: string;
}

export interface PaymentSchedule {
  mode: "standard" | "flexible";
  stages: ScheduleStage[];
}

/**
 * The house payment terms: 60% to commence, 40% on completion.
 *
 * How a project is paid for is Brightex's commercial decision, not the
 * client's, so this is a stated term rather than something offered as a menu.
 * A client presented with payment options will reasonably read them as
 * negotiable and pick the one that suits them, which is a negotiation nobody
 * asked to open at the moment they were ready to say yes.
 *
 * A document may state something else where an engagement genuinely warrants
 * it, but that is set on the document by us, deliberately, before it is sent.
 * Where a document says nothing, this applies.
 */
export const DEFAULT_PAYMENT_SCHEDULE: PaymentSchedule = {
  mode: "standard",
  stages: [
    { label: "Deposit, to commence work", percent: 60, trigger: "on_signature" },
    { label: "On completion and handover", percent: 40, trigger: "on_completion" },
  ],
};

/** The schedule a document is actually on: its own, or the house default. */
export function scheduleOf(doc: Pick<BlockDocument, "schedule">): PaymentSchedule {
  return doc.schedule ?? DEFAULT_PAYMENT_SCHEDULE;
}

// ─── Money ──────────────────────────────────────────────────────────────────

/**
 * An amount that may legitimately be a range.
 *
 * Proposals quote ranges, because at proposal stage scope is not pinned: the
 * CHANF proposal quotes 135,000 to 210,000 overall and a range per phase. A
 * contract cannot. Rather than storing ranges as display strings and parsing
 * them back later (which is how a "210,000" becomes an invoice for 135,000),
 * the range is structured, and converting a document into anything billable
 * has to resolve it explicitly. See isRanged() and resolveAmount().
 */
export interface Money {
  min: number;
  /** Absent means a fixed amount. */
  max?: number;
}

export function isRanged(m: Money): boolean {
  return m.max !== undefined && m.max !== m.min;
}

export function fmtKes(n: number): string {
  return n.toLocaleString("en-KE");
}

export function fmtMoney(m: Money): string {
  return isRanged(m) ? `${fmtKes(m.min)} - ${fmtKes(m.max as number)}` : fmtKes(m.min);
}

/** Every ranged amount in a document, so acceptance can ask for the figures it
 * needs pinned rather than guessing at one end of the range. */
export function rangedAmounts(doc: BlockDocument): { sectionId: string; blockId: string; label: string; amount: Money }[] {
  const out: { sectionId: string; blockId: string; label: string; amount: Money }[] = [];
  for (const section of doc.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind !== "investment_table" && block.kind !== "phased_investment_table") continue;
      for (const row of block.rows as { desc?: string; phase?: string; amount: string }[]) {
        const money = parseMoney(row.amount);
        if (money && isRanged(money)) {
          out.push({
            sectionId: section.id,
            blockId: block.id,
            label: row.phase ? `${row.phase}: ${row.desc ?? ""}`.trim() : (row.desc ?? ""),
            amount: money,
          });
        }
      }
    }
  }
  return out;
}

/** Reads "135,000 - 210,000" or "150,000" back into a Money. Returns null for
 * anything that is not an amount, so prose in an amount column is ignored
 * rather than silently becoming a number. */
export function parseMoney(text: string): Money | null {
  const nums = text.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const min = Number(nums[0]);
  if (!Number.isFinite(min)) return null;
  if (nums.length === 1) return { min };
  const max = Number(nums[1]);
  return Number.isFinite(max) ? { min, max } : { min };
}

// ─── Rendering ──────────────────────────────────────────────────────────────

function renderBlock(block: Block, opts: RenderOptions = {}): string {
  switch (block.kind) {
    case "prose":
      return block.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
    case "exec_lede":
      return execLede(block.text) + (block.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join("");
    case "kpi_row":
      return kpiRow(block.items);
    case "cards_grid":
      return cardsGrid(block.cards);
    case "arrow_list":
      return arrowList(block.items);
    case "key_value_list":
      return arrowListKeyValue(block.items);
    case "chips":
      return chipRow(block.items);
    case "phases":
      return phaseList(block.phases);
    case "scope_3col":
      return scope3Grid(block.included, block.excluded, block.neededFromClient);
    case "investment_table":
      return investmentTable(block.rows, block.total);
    case "phased_investment_table":
      return phasedInvestmentTable(block.rows, block.total);
    case "scope_out":
      return scopeOut(block.heading, block.rows);
    case "data_table":
      return dataTable(block.headers, block.rows);
    case "tiers":
      return tiersGrid(block.tiers);
    case "timeline":
      return timeline(block.rows);
    case "steps":
      return stepsList(block.steps);
    case "note":
      return block.heading
        ? noteBoxTitled(block.heading, block.text, { items: block.items, mono: block.mono, solid: block.solid })
        : noteBox(block.text);
    case "about":
      return aboutBox(block.text) + (block.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join("");
    case "clauses":
      return block.clauses
        .map((c) => (c.heading ? `<h4 style="font-family:var(--font);color:var(--navy);font-size:15px;margin:18px 0 6px">${esc(c.heading)}</h4>` : "") + clauseParagraph(c.text))
        .join("");
    case "signature":
      return signatureBlock(block.leftLabel, block.rightLabel);
    case "signed_by": {
      // Live data wins over whatever was stored with the document.
      const parties = opts.signatures?.parties ?? block.parties;
      const awaiting = opts.signatures ? opts.signatures.awaiting : block.awaiting;
      if (parties.length === 0 && !awaiting) return "";
      return executedSignatures(parties, undefined, awaiting ?? undefined);
    }
  }
}

export interface RenderOptions {
  /** Public link: gated sections are blurred behind the paywall card.
   * Admin view is never gated, so Godwin always sees the real document. */
  gated?: boolean;
  /**
   * Live signature data, overriding whatever the document's signed_by block
   * holds.
   *
   * Signatures are resolved when the page is rendered, not baked in when the
   * document is created. An agreement drafted before a signature was uploaded
   * would otherwise show a typed name forever, and changing the signature would
   * leave every existing draft stale. The block declares WHO signs; this says
   * what their mark currently is.
   *
   * For a SIGNED agreement the caller passes the stored evidence instead, since
   * what matters then is what was actually signed, not what our signature looks
   * like today.
   */
  signatures?: {
    parties: ExecutedParty[];
    awaiting?: { role: string; label: string } | null;
  };
  /** Overrides the gate card for every gated section. Used for fee gating,
   * where the ask is a payment rather than a call, so the card must say so:
   * a client shown "book a walkthrough" who is actually being asked for money
   * will book the call and be surprised. */
  gateCopy?: { heading: string; body: string; buttonLabel: string; buttonHref: string };
  /** Appended inside the last section: the accept box, or the accepted
   * confirmation. Owned by the caller because it differs per route. */
  trailingHtml?: string;
  dlLocked?: boolean;
  dlLockedReason?: string;
}

const DEFAULT_GATE_COPY = {
  heading: "Let us walk you through this",
  body: "The full breakdown is ready. We would rather take you through it on a short call than leave you reading numbers without the reasoning behind them.",
  buttonLabel: "Book the walkthrough",
  buttonHref: "https://www.brightexsolutions.co.ke/book",
};

/** Sections that actually render, in order, with their derived numbers. */
export function visibleSections(doc: BlockDocument): { section: DocSection; num: string }[] {
  return doc.sections
    .filter((s) => !s.hidden)
    .map((section, i) => ({ section, num: String(i + 1).padStart(2, "0") }));
}

export function renderBlockDocument(doc: BlockDocument, opts: RenderOptions = {}): string {
  const visible = visibleSections(doc);
  const lastId = visible.length > 0 ? visible[visible.length - 1].section.id : null;

  const bodyHtml = visible
    .map(({ section, num }) => {
      const inner = section.blocks.map((b) => renderBlock(b, opts)).join("");
      const content = opts.gated && section.gated
        ? blurredSection(inner, { ...DEFAULT_GATE_COPY, ...(opts.gateCopy ?? {}), ...(section.gateCopy ?? {}) })
        : inner;

      return `<section class="section" id="s-${esc(section.id)}">
        ${sectionHeader(num, section.tag, section.title)}
        ${section.indicative ? indicativeNote("Not included in this proposal's pricing") : ""}
        ${content}
        ${section.id === lastId ? (opts.trailingHtml ?? "") : ""}
      </section>`;
    })
    .join("");

  const [line1, line2] = splitTitleForCover(doc.meta.coverTitle);

  return documentShell({
    title: doc.meta.title,
    dlBarLabel: doc.meta.title.toUpperCase(),
    coverTag: doc.meta.coverTag,
    coverTitleLines: [line1, line2],
    coverSub: doc.meta.coverSub,
    metaFields: doc.meta.metaFields ?? [
      { label: "Prepared for", value: doc.meta.client.company || doc.meta.client.name },
      { label: "Date", value: formatDate(doc.meta.created_at) },
      { label: "Reference", value: doc.meta.reference_code },
    ],
    badges: doc.meta.badges,
    confidentialFor: doc.meta.confidentialFor ?? (doc.meta.client.company || doc.meta.client.name),
    tocItems: visible.map(({ section, num }) => ({ num, label: section.title })),
    bodyHtml,
    dlLocked: opts.dlLocked,
    dlLockedReason: opts.dlLockedReason,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Totals ─────────────────────────────────────────────────────────────────

/**
 * The contracted total, which is the sum of amounts in visible, non-indicative
 * investment tables only.
 *
 * Returns a Money, so a proposal quoting ranges yields a range and the caller
 * has to decide what to do about it rather than receiving a plausible-looking
 * single number it did not ask for.
 */
export function documentTotal(doc: BlockDocument): Money | null {
  let min = 0;
  let max = 0;
  let found = false;

  for (const section of doc.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind !== "investment_table" && block.kind !== "phased_investment_table") continue;
      for (const row of block.rows as { amount: string }[]) {
        const money = parseMoney(row.amount);
        if (!money) continue;
        found = true;
        min += money.min;
        max += money.max ?? money.min;
      }
    }
  }

  if (!found) return null;
  return max > min ? { min, max } : { min };
}

/** True when the document cannot be turned into a contract without someone
 * pinning figures first. */
export function needsFigureLock(doc: BlockDocument): boolean {
  return rangedAmounts(doc).length > 0;
}

export function isBlockDocument(data: unknown): data is BlockDocument {
  return (
    typeof data === "object" && data !== null &&
    (data as { version?: unknown }).version === 2 &&
    Array.isArray((data as { sections?: unknown }).sections)
  );
}
