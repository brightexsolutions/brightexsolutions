/**
 * Validation for block documents.
 *
 * Why validate at all, when the types already describe the shape: TypeScript
 * stops at the edge of the process. A block document arriving as JSON (from an
 * import, an editor save, or a paste) is `unknown`, and the failure mode of an
 * unvalidated one is the worst kind: it stores fine, renders a blank or
 * half-empty section, and is discovered by the client rather than by us.
 *
 * So the shape is checked once, at the boundary, and anything that would render
 * as nothing is rejected with a message naming the offending section.
 *
 * The schema is also where house copy rules are ENFORCED rather than trusted.
 * Every document authored outside this system so far has arrived with em dashes
 * in it (the CHANF proposal had six, the Linka roadmap seven), because care at
 * authoring time does not survive contact with a real deadline. normaliseCopy()
 * fixes them on the way in.
 */
import { z } from "zod";
import type { BlockDocument } from "./blocks";

// ─── Copy normalisation ─────────────────────────────────────────────────────

/**
 * Applies the house copy rules to every string in a document.
 *
 * Em dash handling is context-sensitive rather than a blanket replacement,
 * because the character is used for two different jobs: as a separator between
 * a label and its detail ("Phase 1 \u2014 Stabilise"), where a colon is right, and
 * parenthetically mid-sentence, where a comma is right.
 */
export function normaliseCopy<T>(value: T): T {
  if (typeof value === "string") {
    return value
      // Label separator: word, spaced em dash, capitalised word.
      .replace(/\s+\u2014\s+(?=[A-Z0-9])/g, ": ")
      // Anything else: a comma reads correctly in running prose.
      .replace(/\s*\u2014\s*/g, ", ") as unknown as T;
  }
  if (Array.isArray(value)) return value.map(normaliseCopy) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normaliseCopy(v);
    return out as T;
  }
  return value;
}

// ─── Block schemas ──────────────────────────────────────────────────────────

const nonEmpty = z.string().trim().min(1);
const moneyish = z.string().trim().min(1);

/** Every block requires enough content to render something. A block whose only
 * job is to display a list, holding an empty list, is a blank space in a client
 * document, so minimum lengths are deliberate rather than defensive. */
const BlockSchema = z.discriminatedUnion("kind", [
  z.object({ id: nonEmpty, kind: z.literal("prose"), paragraphs: z.array(nonEmpty).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("exec_lede"), text: nonEmpty, paragraphs: z.array(nonEmpty).optional() }),
  z.object({ id: nonEmpty, kind: z.literal("kpi_row"), items: z.array(z.object({ value: nonEmpty, label: nonEmpty })).min(2).max(6) }),
  z.object({ id: nonEmpty, kind: z.literal("cards_grid"), cards: z.array(z.object({
    icon: z.string().optional(), title: nonEmpty,
    body: z.string().optional(), points: z.array(nonEmpty).optional(),
  })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("arrow_list"), items: z.array(nonEmpty).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("key_value_list"), items: z.array(z.object({ label: nonEmpty, detail: nonEmpty })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("chips"), items: z.array(nonEmpty).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("phases"), phases: z.array(z.object({
    name: nonEmpty, duration: nonEmpty, items: z.array(nonEmpty).min(1),
  })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("scope_3col"),
    included: z.array(nonEmpty), excluded: z.array(nonEmpty), neededFromClient: z.array(nonEmpty) }),
  z.object({ id: nonEmpty, kind: z.literal("investment_table"),
    rows: z.array(z.object({ desc: nonEmpty, sub: z.string().optional(), amount: moneyish })).min(1),
    total: z.object({ label: nonEmpty, amount: moneyish }) }),
  z.object({ id: nonEmpty, kind: z.literal("phased_investment_table"),
    rows: z.array(z.object({ phase: nonEmpty, desc: nonEmpty, amount: moneyish })).min(1),
    total: z.object({ label: nonEmpty, amount: moneyish }) }),
  z.object({ id: nonEmpty, kind: z.literal("scope_out"), heading: nonEmpty,
    rows: z.array(z.object({ label: nonEmpty, detail: nonEmpty })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("data_table"),
    headers: z.array(nonEmpty).min(2).max(4),
    rows: z.array(z.array(z.string())).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("tiers"), tiers: z.array(z.object({
    name: nonEmpty, price: z.union([z.number(), nonEmpty]), priceSuffix: z.string().optional(),
    desc: z.string().optional(), features: z.array(nonEmpty).min(1), featured: z.boolean().optional(),
  })).min(2).max(4) }),
  z.object({ id: nonEmpty, kind: z.literal("timeline"), rows: z.array(z.object({
    week: nonEmpty, title: nonEmpty, desc: nonEmpty, launch: z.boolean().optional(),
  })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("steps"), steps: z.array(z.object({ title: nonEmpty, desc: nonEmpty })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("note"), heading: z.string().optional(),
    text: z.string(), items: z.array(nonEmpty).optional(), mono: z.string().optional(), solid: z.boolean().optional() }),
  z.object({ id: nonEmpty, kind: z.literal("about"), text: nonEmpty, paragraphs: z.array(nonEmpty).optional() }),
  z.object({ id: nonEmpty, kind: z.literal("clauses"), clauses: z.array(z.object({
    heading: z.string().optional(), text: nonEmpty,
  })).min(1) }),
  z.object({ id: nonEmpty, kind: z.literal("signature"), leftLabel: nonEmpty, rightLabel: nonEmpty }),
]);

const ScheduleStageSchema = z.object({
  label: nonEmpty,
  percent: z.number().min(1).max(100),
  trigger: z.enum(["on_signature", "on_milestone", "on_completion", "on_date"]),
  milestone_index: z.number().int().min(0).optional(),
  due_date: z.string().optional(),
});

/**
 * Stages must sum to exactly 100, and there is no tolerance on this.
 *
 * A schedule summing to 95 produces invoices that do not add up to the
 * contract, and the discrepancy surfaces at the worst possible moment: when
 * the client queries the final invoice. Rejecting it at the boundary is the
 * only place this can be caught cheaply.
 */
export const PaymentScheduleSchema = z.object({
  mode: z.enum(["standard", "flexible"]),
  stages: z.array(ScheduleStageSchema).min(1).max(3),
}).refine(
  (s) => s.stages.reduce((sum, st) => sum + st.percent, 0) === 100,
  { message: "Payment schedule stages must add up to exactly 100%" }
);

const SectionSchema = z.object({
  id: nonEmpty,
  tag: nonEmpty,
  title: nonEmpty,
  blocks: z.array(BlockSchema).min(1),
  hidden: z.boolean().optional(),
  gated: z.boolean().optional(),
  locked: z.boolean().optional(),
  indicative: z.boolean().optional(),
  gateCopy: z.object({
    heading: nonEmpty, body: nonEmpty, buttonLabel: nonEmpty, buttonHref: nonEmpty,
  }).optional(),
});

export const BlockDocumentSchema = z.object({
  version: z.literal(2),
  type: z.enum(["proposal", "agreement", "techdoc", "sop"]),
  meta: z.object({
    title: nonEmpty,
    coverTag: nonEmpty,
    coverTitle: nonEmpty,
    coverSub: z.string().optional(),
    reference_code: nonEmpty,
    created_at: nonEmpty,
    client: z.object({
      name: nonEmpty,
      company: z.string().nullish(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
    }),
    metaFields: z.array(z.object({ label: nonEmpty, value: nonEmpty })).optional(),
    badges: z.array(z.object({ label: nonEmpty, value: nonEmpty })).optional(),
    confidentialFor: z.string().nullish(),
  }),
  sections: z.array(SectionSchema).min(1),
  schedule: PaymentScheduleSchema.optional(),
  scheduleOptions: z.array(PaymentScheduleSchema).max(3).optional(),
})
  // Section ids address blocks for editing, gating and per-section AI. A
  // duplicate id means an edit silently lands on the wrong section.
  .refine((d) => new Set(d.sections.map((s) => s.id)).size === d.sections.length, {
    message: "Section ids must be unique",
  })
  .refine(
    (d) => {
      const ids = d.sections.flatMap((s) => s.blocks.map((b) => b.id));
      return new Set(ids).size === ids.length;
    },
    { message: "Block ids must be unique across the document" }
  )
  // A document where every section is hidden renders as a cover and a footer.
  .refine((d) => d.sections.some((s) => !s.hidden), {
    message: "At least one section must be visible",
  });

export interface ValidationResult {
  ok: boolean;
  doc?: BlockDocument;
  errors?: string[];
}

/**
 * Validates and normalises in one step, in that order: copy rules are applied
 * first so a document is not rejected for a dash, then the structure is
 * checked. Returns readable paths ("sections.4.blocks.0.rows") rather than a
 * zod dump, because the person reading this is fixing a document, not debugging
 * a schema.
 */
export function parseBlockDocument(input: unknown): ValidationResult {
  const normalised = normaliseCopy(input);
  const result = BlockDocumentSchema.safeParse(normalised);
  if (result.success) return { ok: true, doc: result.data as BlockDocument };

  return {
    ok: false,
    errors: result.error.issues.map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    }),
  };
}
