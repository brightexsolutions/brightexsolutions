/**
 * A proposal that still quotes ranges.
 *
 * The figure-lock machinery exists for proposals priced as a range, which get
 * pinned to single figures before they can become a contract. Those checks used
 * the live CHANF proposal as their subject, which worked only for as long as
 * CHANF happened to be quoted in ranges. The moment its pricing was settled to
 * exact figures the tests lost their subject and failed, reporting a problem
 * with the machinery when the machinery was fine.
 *
 * A live client document should not be load-bearing for tests of generic
 * behaviour. This derives a ranged copy from it instead, so the shape stays
 * realistic and current while the pricing under test is ours to control.
 */
import { CHANF_PROPOSAL } from "@/lib/document-html/fixtures/chanf-proposal";
import type { BlockDocument } from "@/lib/document-html/blocks";

/** The three phase prices, as ranges, with a total to match. */
const RANGED_ROWS = ["10,000 - 15,000", "75,000 - 90,000", "25,000 - 30,000"];
const RANGED_TOTAL = "110,000 - 135,000";

function buildRanged(): BlockDocument {
  const doc = structuredClone(CHANF_PROPOSAL) as BlockDocument;
  const section = doc.sections.find((s) => s.id === "investment");
  if (!section) throw new Error("Fixture has no investment section to make ranged.");
  const table = section.blocks.find((b) => b.id === "inv-table") as
    | { rows: { amount: string }[]; total: { amount: string } }
    | undefined;
  if (!table) throw new Error("Investment section has no inv-table block.");
  if (table.rows.length !== RANGED_ROWS.length) {
    throw new Error(`Expected ${RANGED_ROWS.length} phase rows, found ${table.rows.length}.`);
  }
  table.rows.forEach((row, i) => { row.amount = RANGED_ROWS[i]; });
  table.total.amount = RANGED_TOTAL;
  return doc;
}

export const RANGED_PROPOSAL: BlockDocument = buildRanged();

/** What the ranged copy sums to, so assertions do not restate the arithmetic. */
export const RANGED_PHASE_COUNT = RANGED_ROWS.length;
