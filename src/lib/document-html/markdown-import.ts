/**
 * Markdown to blocks: the bridge from brainstorming elsewhere back into the
 * system.
 *
 * The mistake to avoid here is trying to parse whatever HTML a chat happened to
 * produce. Two real attempts at that are in docs/fixtures: both arrived with em
 * dashes, no `@page` rule, no responsive breakpoint, and a print button that
 * upload sanitising strips. Parsing them faithfully would mean faithfully
 * reproducing their faults.
 *
 * So the direction is reversed. We hand out an output contract (see
 * MARKDOWN_CONTRACT), the drafting happens against it, and this parses that
 * contract. What comes back is structure and prose; everything else, the
 * responsive layout, A4 print, table collapsing, the copy rules, is supplied by
 * the house shell whether or not whoever drafted it remembered.
 *
 * Headings are matched loosely (case-insensitive, punctuation ignored) because
 * a model asked for "## Investment" will occasionally write "## Investment &
 * Pricing", and rejecting a good document over a stray ampersand helps nobody.
 * Anything unrecognised becomes a prose section rather than being dropped: a
 * section in the wrong shape is fixable in the editor, a silently missing one
 * is not.
 */
import { normaliseCopy } from "./block-schema";
import type { Block, BlockDocument, DocSection } from "./blocks";

/** The contract handed out with the brief. Kept in one place so the prompt and
 * the parser can never drift apart. */
export const MARKDOWN_CONTRACT = `Return markdown only, no preamble and no closing commentary.

Use these exact section headings. Omit any that do not apply, and do not invent others:

## Executive Summary
A short lede paragraph naming the client's real problem, then one or two paragraphs.

## Understanding the Brief
One paragraph of context, then 2 to 4 bullets. Each bullet: a bold short title, then a sentence.
Example: **The site is currently down** A lapsed hosting issue has taken it offline.

## Scope
A "### Included", "### Not included" and "### Needed from you" subsection, each a bullet list.

## Phases
For each phase a "### <Phase name> (<duration>)" heading followed by a bullet list of deliverables.

## Investment
A markdown table: | Phase | Deliverable | Amount |
Amounts in plain numbers, no currency symbol. A range is written "15,000 - 20,000".
Finish with a row whose first cell is "Total".

## Payment Schedule
A markdown table: | Stage | Percent | Trigger |
Trigger is one of: on signature, at milestone, on completion, on date.
Percentages must add up to exactly 100.

## Timeline
A markdown table: | Period | Milestone | Detail |

## Measuring Success
A markdown table: | What we track | How it is measured | Timeline |

## Ongoing Partnership
For each tier a "### <Tier name> (<price>)" heading followed by a bullet list.

## About Brightex Solutions
One or two paragraphs.

## Next Steps
A numbered list. Each item: a bold short title, then a sentence.

Rules:
- Never use em dashes. Use a colon or a comma.
- Currency is KES. Write plain numbers and let the template format them.
- No stack names, framework names or acronyms in client-facing copy.
- Be specific and grounded in the brief. Do not pad.`;

// ─── Tokenising ─────────────────────────────────────────────────────────────

interface RawSection {
  heading: string;
  lines: string[];
}

function splitSections(markdown: string): RawSection[] {
  const out: RawSection[] = [];
  let current: RawSection | null = null;

  for (const raw of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const h2 = /^##\s+(?!#)(.+?)\s*$/.exec(raw);
    if (h2) {
      if (current) out.push(current);
      current = { heading: h2[1].trim(), lines: [] };
      continue;
    }
    // A leading H1 is the document title, not a section.
    if (/^#\s+(?!#)/.test(raw)) continue;
    if (current) current.lines.push(raw);
  }
  if (current) out.push(current);
  return out;
}

/** Loose heading match: case, punctuation and filler words ignored. */
function normaliseHeading(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function bullets(lines: string[]): string[] {
  return lines
    .map((l) => /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(l)?.[1]?.trim())
    .filter((v): v is string => !!v);
}

function paragraphs(lines: string[]): string[] {
  const out: string[] = [];
  let buf: string[] = [];
  for (const l of lines) {
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(l) || /^\s*\|/.test(l) || /^###\s/.test(l)) continue;
    if (l.trim() === "") {
      if (buf.length) { out.push(buf.join(" ").trim()); buf = []; }
      continue;
    }
    buf.push(l.trim());
  }
  if (buf.length) out.push(buf.join(" ").trim());
  return out.filter(Boolean);
}

/** Markdown table rows, header separated, alignment row discarded. */
function table(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const rows = lines
    .filter((l) => /^\s*\|/.test(l))
    .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
  if (rows.length < 2) return null;

  const headers = rows[0];
  const body = rows.slice(1).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c) || c === ""));
  return { headers, rows: body };
}

/** "### Name (detail)" subsections, each with the lines that follow it. */
function subsections(lines: string[]): { title: string; detail: string; lines: string[] }[] {
  const out: { title: string; detail: string; lines: string[] }[] = [];
  let current: { title: string; detail: string; lines: string[] } | null = null;

  for (const l of lines) {
    const h3 = /^###\s+(.+?)\s*$/.exec(l);
    if (h3) {
      if (current) out.push(current);
      const withParens = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(h3[1].trim());
      current = withParens
        ? { title: withParens[1].trim(), detail: withParens[2].trim(), lines: [] }
        : { title: h3[1].trim(), detail: "", lines: [] };
      continue;
    }
    if (current) current.lines.push(l);
  }
  if (current) out.push(current);
  return out;
}

/** "**Bold lead** rest of the sentence" splits into a title and a body. */
function splitBold(text: string): { title: string; body: string } {
  const m = /^\*\*(.+?)\*\*[:.]?\s*(.*)$/.exec(text.trim());
  if (m) return { title: m[1].trim(), body: m[2].trim() };
  const colon = text.indexOf(": ");
  if (colon > 0 && colon < 60) {
    return { title: text.slice(0, colon).trim(), body: text.slice(colon + 2).trim() };
  }
  return { title: text.trim(), body: "" };
}

function stripInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").trim();
}

// ─── Section builders ───────────────────────────────────────────────────────

let blockSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++blockSeq}`;

type Builder = (raw: RawSection) => { tag: string; title: string; blocks: Block[]; indicative?: boolean } | null;

const BUILDERS: { match: string[]; build: Builder }[] = [
  {
    match: ["executive summary", "summary", "overview"],
    build: (raw) => {
      const ps = paragraphs(raw.lines).map(stripInline);
      if (ps.length === 0) return null;
      return {
        tag: "Overview", title: "Executive Summary",
        blocks: [{ id: nextId("exec"), kind: "exec_lede", text: ps[0], paragraphs: ps.slice(1) }],
      };
    },
  },
  {
    match: ["understanding the brief", "understanding", "context", "the problem", "where things stand"],
    build: (raw) => {
      const ps = paragraphs(raw.lines).map(stripInline);
      const cards = bullets(raw.lines).map((b) => {
        const { title, body } = splitBold(b);
        return { icon: "!", title: stripInline(title), body: stripInline(body) || undefined };
      });
      const blocks: Block[] = [];
      if (ps.length) blocks.push({ id: nextId("brief"), kind: "prose", paragraphs: ps });
      if (cards.length) blocks.push({ id: nextId("brief-cards"), kind: "cards_grid", cards });
      return blocks.length ? { tag: "Context", title: "Understanding the Brief", blocks } : null;
    },
  },
  {
    match: ["scope", "scope of work", "what is included"],
    build: (raw) => {
      const subs = subsections(raw.lines);
      const pick = (needle: string) =>
        bullets(subs.find((s) => normaliseHeading(s.title).includes(needle))?.lines ?? []).map(stripInline);
      const included = pick("included").filter((i) => i.length > 0);
      const excluded = pick("not included").length ? pick("not included") : pick("out of scope");
      const needed = pick("needed").length ? pick("needed") : pick("from you");
      if (!included.length && !excluded.length && !needed.length) return null;
      return {
        tag: "Delivery plan", title: "Scope of Work",
        blocks: [{ id: nextId("scope"), kind: "scope_3col", included, excluded, neededFromClient: needed }],
      };
    },
  },
  {
    match: ["phases", "delivery phases", "project scope phases", "how we will do it"],
    build: (raw) => {
      const subs = subsections(raw.lines);
      const phases = subs
        .map((s) => ({ name: stripInline(s.title), duration: s.detail || "To be confirmed", items: bullets(s.lines).map(stripInline) }))
        .filter((p) => p.items.length > 0);
      if (phases.length === 0) return null;
      const ps = paragraphs(raw.lines).map(stripInline);
      const blocks: Block[] = [];
      if (ps.length) blocks.push({ id: nextId("phase-intro"), kind: "prose", paragraphs: ps });
      blocks.push({ id: nextId("phases"), kind: "phases", phases });
      return { tag: "Delivery plan", title: "Project Scope & Phases", blocks };
    },
  },
  {
    match: ["investment", "pricing", "investment pricing", "cost", "fees"],
    build: (raw) => {
      const t = table(raw.lines);
      if (!t) return null;
      const totalRow = t.rows.find((r) => /total/i.test(r[0] ?? ""));
      const bodyRows = t.rows.filter((r) => r !== totalRow);
      const threeCol = t.headers.length >= 3;

      const rows = bodyRows.map((r) => ({
        phase: stripInline(r[0] ?? ""),
        desc: stripInline(threeCol ? (r[1] ?? "") : (r[0] ?? "")),
        amount: stripInline((threeCol ? r[2] : r[1]) ?? "").replace(/KES\s*/i, ""),
      })).filter((r) => r.amount);
      if (rows.length === 0) return null;

      const totalAmount = totalRow
        ? stripInline(totalRow[totalRow.length - 1] ?? "").replace(/KES\s*/i, "")
        : "";

      const ps = paragraphs(raw.lines).map(stripInline);
      const blocks: Block[] = [{
        id: nextId("inv"),
        kind: "phased_investment_table",
        rows,
        total: { label: totalRow ? stripInline(totalRow[0]) : "Total investment", amount: totalAmount || rows.map((r) => r.amount).join(" + ") },
      }];
      if (ps.length) blocks.push({ id: nextId("inv-note"), kind: "note", text: ps.join(" ") });
      return { tag: "Pricing", title: "Investment & Pricing", blocks };
    },
  },
  {
    match: ["timeline", "schedule"],
    build: (raw) => {
      const t = table(raw.lines);
      if (!t) return null;
      const rows = t.rows
        .map((r, i) => ({
          week: stripInline(r[0] ?? ""),
          title: stripInline(r[1] ?? ""),
          desc: stripInline(r[2] ?? ""),
          launch: i === t.rows.length - 1 && /launch|go.?live/i.test(r.join(" ")),
        }))
        .filter((r) => r.week && r.title);
      if (rows.length === 0) return null;
      return { tag: "Schedule", title: "Timeline", blocks: [{ id: nextId("tl"), kind: "timeline", rows }] };
    },
  },
  {
    match: ["measuring success", "success", "results", "how we measure"],
    build: (raw) => {
      const t = table(raw.lines);
      const ps = paragraphs(raw.lines).map(stripInline);
      const blocks: Block[] = [];
      if (ps.length) blocks.push({ id: nextId("succ"), kind: "prose", paragraphs: ps });
      if (t && t.rows.length) {
        blocks.push({
          id: nextId("succ-table"), kind: "data_table",
          headers: t.headers.map(stripInline),
          rows: t.rows.map((r) => r.map(stripInline)),
        });
      }
      return blocks.length ? { tag: "Results", title: "Measuring Success", blocks } : null;
    },
  },
  {
    match: ["ongoing partnership", "retainer", "aftercare", "support"],
    build: (raw) => {
      const subs = subsections(raw.lines);
      const tiers = subs
        .map((s) => ({
          name: stripInline(s.title),
          price: s.detail ? stripInline(s.detail) : "On request",
          features: bullets(s.lines).map(stripInline),
        }))
        .filter((t) => t.features.length > 0);
      if (tiers.length < 2) return null;
      if (tiers.length > 1) tiers[Math.min(1, tiers.length - 1)] = { ...tiers[Math.min(1, tiers.length - 1)], ...{ featured: true } };
      const ps = paragraphs(raw.lines).map(stripInline);
      const blocks: Block[] = [];
      if (ps.length) blocks.push({ id: nextId("ret-intro"), kind: "prose", paragraphs: ps });
      blocks.push({ id: nextId("tiers"), kind: "tiers", tiers });
      // Retainers are a post-launch decision, never part of the project fee.
      return { tag: "Retainer", title: "Ongoing Partnership", blocks, indicative: true };
    },
  },
  {
    match: ["about brightex solutions", "about brightex", "about us", "who we are"],
    build: (raw) => {
      const ps = paragraphs(raw.lines).map(stripInline);
      if (ps.length === 0) return null;
      return {
        tag: "Introduction", title: "About Brightex Solutions",
        blocks: [{ id: nextId("about"), kind: "about", text: ps[0], paragraphs: ps.slice(1) }],
      };
    },
  },
  {
    match: ["next steps", "what happens next", "moving forward"],
    build: (raw) => {
      const steps = bullets(raw.lines).map((b) => {
        const { title, body } = splitBold(b);
        return { title: stripInline(title), desc: stripInline(body) || stripInline(title) };
      });
      if (steps.length === 0) return null;
      return { tag: "Moving forward", title: "Next Steps", blocks: [{ id: nextId("steps"), kind: "steps", steps }] };
    },
  },
];

/** The payment schedule table, read separately: it becomes doc.schedule rather
 * than a section, because it drives invoices rather than being read. */
function parseSchedule(raw: RawSection): BlockDocument["schedule"] | null {
  const t = table(raw.lines);
  if (!t) return null;

  const TRIGGERS: [RegExp, "on_signature" | "on_milestone" | "on_completion" | "on_date"][] = [
    [/sign/i, "on_signature"],
    [/milestone|midpoint|halfway/i, "on_milestone"],
    [/complet|launch|handover|final/i, "on_completion"],
    [/date/i, "on_date"],
  ];

  const stages = t.rows.map((r, i) => {
    const percent = Number((r[1] ?? "").replace(/[^\d.]/g, ""));
    const triggerText = r[2] ?? "";
    const trigger = TRIGGERS.find(([re]) => re.test(triggerText))?.[1] ?? (i === 0 ? "on_signature" : "on_completion");
    return {
      label: stripInline(r[0] ?? `Stage ${i + 1}`),
      percent,
      trigger,
      ...(trigger === "on_milestone" ? { milestone_index: 1 } : {}),
    };
  }).filter((s) => Number.isFinite(s.percent) && s.percent > 0);

  if (stages.length === 0) return null;
  return { mode: stages.length > 2 ? "flexible" : "standard", stages };
}

export interface MarkdownImportResult {
  sections: DocSection[];
  schedule?: BlockDocument["schedule"];
  /** Headings that did not match a known section and became prose. */
  unrecognised: string[];
  warnings: string[];
}

export function parseMarkdownSections(markdown: string): MarkdownImportResult {
  blockSeq = 0;
  const raws = splitSections(markdown);
  const sections: DocSection[] = [];
  const unrecognised: string[] = [];
  const warnings: string[] = [];
  let schedule: BlockDocument["schedule"] | undefined;

  for (const raw of raws) {
    const key = normaliseHeading(raw.heading);

    if (/payment schedule|payment terms/.test(key)) {
      const parsed = parseSchedule(raw);
      if (parsed) {
        const sum = parsed.stages.reduce((n, s) => n + s.percent, 0);
        if (sum !== 100) {
          warnings.push(`The payment schedule adds up to ${sum}%, not 100%. Fix it before sending.`);
        }
        schedule = parsed;
      } else {
        warnings.push("A Payment Schedule heading was found but no readable table under it.");
      }
      continue;
    }

    const builder = BUILDERS.find((b) => b.match.some((m) => key === m || key.includes(m)));
    const built = builder?.build(raw) ?? null;

    if (built) {
      sections.push({
        id: normaliseHeading(built.title).replace(/\s+/g, "-").slice(0, 40),
        tag: built.tag,
        title: built.title,
        blocks: built.blocks,
        ...(built.indicative ? { indicative: true } : {}),
      });
      continue;
    }

    // Unrecognised, or recognised but empty: keep it as prose rather than
    // dropping content someone wrote on purpose.
    const ps = paragraphs(raw.lines).map(stripInline);
    const bs = bullets(raw.lines).map(stripInline);
    const blocks: Block[] = [];
    if (ps.length) blocks.push({ id: nextId("free"), kind: "prose", paragraphs: ps });
    if (bs.length) blocks.push({ id: nextId("free-list"), kind: "arrow_list", items: bs });

    if (blocks.length) {
      if (!builder) unrecognised.push(raw.heading);
      sections.push({
        id: normaliseHeading(raw.heading).replace(/\s+/g, "-").slice(0, 40) || nextId("section"),
        tag: "Detail",
        title: raw.heading,
        blocks,
      });
    } else {
      warnings.push(`"${raw.heading}" had no readable content and was skipped.`);
    }
  }

  if (sections.length === 0) {
    warnings.push("No sections could be read. Check the markdown uses '## Heading' for each section.");
  }

  // Normalised here rather than only in the route, so a dry-run preview shows
  // exactly what would be stored. Hand-authored markdown reliably arrives with
  // em dashes in it: see docs/fixtures.
  return { sections: normaliseCopy(sections), schedule, unrecognised, warnings };
}
