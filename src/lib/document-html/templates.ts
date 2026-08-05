/**
 * Turning documents into templates, and templates back into documents.
 *
 * The one rule that matters: a template carries STRUCTURE, never content.
 *
 * A template that kept its prose would put one client's wording, and worse
 * their price, into another client's proposal, and would do it silently.
 * stripToSkeleton() therefore empties every field a human wrote while keeping
 * every field that describes shape: section order, kinds, headings, how many
 * rows a table has. What comes back from a template is a document with the
 * right bones and nothing to send until someone writes it.
 *
 * Placeholders rather than empty strings, because the validator refuses empty
 * content (correctly: an empty block is a blank space in a client document) and
 * because a placeholder tells you what belongs there.
 */
import type { Block, BlockDocument, DocSection } from "./blocks";

const PLACEHOLDER = "…";

/** A short instruction for what belongs in this block. */
function hintFor(kind: Block["kind"]): string {
  switch (kind) {
    case "exec_lede": return "One sentence naming the client's real problem.";
    case "prose": return "Write this paragraph.";
    case "note": return "A short aside worth flagging.";
    case "about": return "What Brightex does, relevant to this client.";
    default: return PLACEHOLDER;
  }
}

function blankBlock(block: Block): Block {
  switch (block.kind) {
    case "prose":
      return { ...block, paragraphs: block.paragraphs.map(() => hintFor("prose")) };
    case "exec_lede":
      return { ...block, text: hintFor("exec_lede"), paragraphs: block.paragraphs?.map(() => hintFor("prose")) };
    case "kpi_row":
      return { ...block, items: block.items.map((i) => ({ value: PLACEHOLDER, label: i.label })) };
    case "cards_grid":
      return { ...block, cards: block.cards.map((c) => ({
        icon: c.icon, title: PLACEHOLDER,
        ...(c.body !== undefined ? { body: PLACEHOLDER } : {}),
        ...(c.points ? { points: c.points.map(() => PLACEHOLDER) } : {}),
      })) };
    case "arrow_list":
      return { ...block, items: block.items.map(() => PLACEHOLDER) };
    case "key_value_list":
      return { ...block, items: block.items.map((i) => ({ label: i.label, detail: PLACEHOLDER })) };
    case "chips":
      return { ...block, items: block.items.map(() => PLACEHOLDER) };
    case "phases":
      return { ...block, phases: block.phases.map((p) => ({
        name: p.name, duration: p.duration, items: p.items.map(() => PLACEHOLDER),
      })) };
    case "scope_3col":
      return { ...block,
        included: block.included.map(() => PLACEHOLDER),
        excluded: block.excluded.map(() => PLACEHOLDER),
        neededFromClient: block.neededFromClient.map(() => PLACEHOLDER) };
    // Figures are wiped, not carried. A template that remembered a real price
    // would eventually quote one client's fee to another.
    case "investment_table":
      return { ...block,
        rows: block.rows.map((r) => ({ desc: PLACEHOLDER, ...(r.sub !== undefined ? { sub: PLACEHOLDER } : {}), amount: "0" })),
        total: { label: block.total.label, amount: "0" } };
    case "phased_investment_table":
      return { ...block,
        rows: block.rows.map((r) => ({ phase: r.phase, desc: PLACEHOLDER, amount: "0" })),
        total: { label: block.total.label, amount: "0" } };
    case "scope_out":
      return { ...block, heading: block.heading, rows: block.rows.map(() => ({ label: PLACEHOLDER, detail: PLACEHOLDER })) };
    case "data_table":
      return { ...block, headers: block.headers, rows: block.rows.map((r) => r.map(() => PLACEHOLDER)) };
    case "tiers":
      return { ...block, tiers: block.tiers.map((t) => ({
        name: t.name, price: "On request", priceSuffix: t.priceSuffix,
        ...(t.desc !== undefined ? { desc: PLACEHOLDER } : {}),
        features: t.features.map(() => PLACEHOLDER),
        ...(t.featured ? { featured: true } : {}),
      })) };
    case "timeline":
      return { ...block, rows: block.rows.map((r) => ({
        week: r.week, title: PLACEHOLDER, desc: PLACEHOLDER, ...(r.launch ? { launch: true } : {}),
      })) };
    case "steps":
      return { ...block, steps: block.steps.map((s) => ({ title: s.title, desc: PLACEHOLDER })) };
    case "note":
      return { ...block, text: hintFor("note"),
        ...(block.heading ? { heading: block.heading } : {}),
        ...(block.items ? { items: block.items.map(() => PLACEHOLDER) } : {}),
        ...(block.mono ? { mono: PLACEHOLDER } : {}) };
    case "about":
      return { ...block, text: hintFor("about"), paragraphs: block.paragraphs?.map(() => hintFor("prose")) };
    // Legal clauses are fixed house text, not client content: kept verbatim.
    case "clauses":
      return block;
    case "signature":
      return block;
  }
}

/**
 * Removes the client's name from strings the skeleton keeps.
 *
 * Blanking prose is not enough on its own. Structural strings are retained on
 * purpose (a note's heading, a phase name, a column heading) and those
 * routinely name the client: the CHANF proposal has a note headed "What
 * Brightex will need from CHANF to begin". Kept as-is, the first document made
 * from that template would ask a different client for CHANF's materials.
 */
function scrubClient(value: string, names: string[]): string {
  let out = value;
  for (const name of names) {
    if (name.length < 3) continue;
    out = out.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "the client");
  }
  return out;
}

function scrubDeep<T>(value: T, names: string[]): T {
  if (typeof value === "string") return scrubClient(value, names) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, names)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v, names);
    return out as T;
  }
  return value;
}

export function stripToSkeleton(doc: BlockDocument): BlockDocument {
  // Every way this client is referred to, longest first so "CHANF Healthcare
  // Technical Training Institute" is replaced before the bare "CHANF".
  const names = [doc.meta.client.company, doc.meta.client.name, doc.meta.confidentialFor]
    .filter((n): n is string => !!n && n.trim().length > 2)
    .flatMap((n) => [n.trim(), n.trim().split(/\s+/)[0]])
    .filter((n, i, all) => all.indexOf(n) === i)
    .sort((a, b) => b.length - a.length);

  return scrubDeep({
    version: 2,
    type: doc.type,
    meta: {
      title: "Proposal",
      coverTag: doc.meta.coverTag,
      coverTitle: "Cover headline goes here",
      reference_code: "TEMPLATE",
      created_at: new Date().toISOString(),
      client: { name: "Client name" },
    },
    sections: doc.sections.map((s): DocSection => ({
      id: s.id,
      tag: s.tag,
      title: s.title,
      blocks: s.blocks.map(blankBlock),
      ...(s.hidden ? { hidden: true } : {}),
      ...(s.gated ? { gated: true } : {}),
      ...(s.locked ? { locked: true } : {}),
      ...(s.indicative ? { indicative: true } : {}),
    })),
  }, names);
}

export interface FromTemplateOptions {
  referenceCode: string;
  title: string;
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null };
  coverTitle?: string;
}

/** A template becomes a document by having identity applied to it. Content is
 * still whatever the skeleton holds, so what arrives is a shape to fill in. */
export function documentFromTemplate(skeleton: BlockDocument, opts: FromTemplateOptions): BlockDocument {
  const clientLabel = opts.client.company?.trim() || opts.client.name;
  return {
    ...structuredClone(skeleton),
    meta: {
      ...structuredClone(skeleton.meta),
      title: opts.title,
      coverTitle: opts.coverTitle?.trim() || opts.title,
      reference_code: opts.referenceCode,
      created_at: new Date().toISOString(),
      client: opts.client,
      confidentialFor: clientLabel,
    },
  };
}
