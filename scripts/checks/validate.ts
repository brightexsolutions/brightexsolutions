import { parseBlockDocument, normaliseCopy, PaymentScheduleSchema } from "@/lib/document-html/block-schema";
import { CHANF_PROPOSAL } from "@/lib/document-html/fixtures/chanf-proposal";

let fails = 0;
const t = (n: string, c: boolean, d = "") => { if (!c) { fails++; console.log(`  FAIL ${n} :: ${d}`); } else console.log(`  ok   ${n}`); };


/**
 * Sections are addressed by id, never by index.
 *
 * These checks used positional lookups and broke the moment a section was
 * reordered in the fixture, failing with a TypeError that said nothing about
 * the real cause. The fixture is a live proposal whose order changes; its
 * section ids do not.
 */
type Sec = { id: string; blocks: { kind: string; [k: string]: unknown }[] };
const sectionById = (doc: { sections: Sec[] }, id: string): Sec => {
  const found = doc.sections.find((s) => s.id === id);
  if (!found) throw new Error(`Fixture has no section "${id}". Ids: ${doc.sections.map((s) => s.id).join(", ")}`);
  return found;
};
const blockOfKind = (section: Sec, kind: string) => {
  const found = section.blocks.find((b) => b.kind === kind);
  if (!found) throw new Error(`Section "${section.id}" has no ${kind} block.`);
  return found;
};

const r = parseBlockDocument(CHANF_PROPOSAL);
t("CHANF fixture validates", r.ok, (r.errors ?? []).join(" | "));

// Copy normalisation, both em dash roles.
// Typed as string, not a literal: comparing two different string literals is a
// type error, and the interesting thing here is the runtime transform.
const norm = (s: string): string => normaliseCopy(s);

const labelCase = norm("Phase 1 — Stabilise & Discover");
t("label separator becomes a colon", labelCase === "Phase 1: Stabilise & Discover", labelCase);

const proseCase = norm("many leads are low quality — job seekers rather than students");
t("mid-sentence becomes a comma",
  proseCase === "many leads are low quality, job seekers rather than students", proseCase);

t("normalisation is deep",
  !JSON.stringify(normaliseCopy({ a: [{ b: "x — Y" }] })).includes("—"));

// Schedules must sum to 100
t("60/40 accepted", PaymentScheduleSchema.safeParse({ mode: "standard", stages: [
  { label: "Deposit", percent: 60, trigger: "on_signature" },
  { label: "Balance", percent: 40, trigger: "on_completion" }] }).success);
t("40/20/40 accepted", PaymentScheduleSchema.safeParse({ mode: "flexible", stages: [
  { label: "a", percent: 40, trigger: "on_signature" },
  { label: "b", percent: 20, trigger: "on_milestone", milestone_index: 1 },
  { label: "c", percent: 40, trigger: "on_completion" }] }).success);
t("60/30 REJECTED (sums to 90)", !PaymentScheduleSchema.safeParse({ mode: "flexible", stages: [
  { label: "a", percent: 60, trigger: "on_signature" },
  { label: "b", percent: 30, trigger: "on_completion" }] }).success);
t("4 stages REJECTED", !PaymentScheduleSchema.safeParse({ mode: "flexible", stages: [
  { label: "a", percent: 25, trigger: "on_signature" }, { label: "b", percent: 25, trigger: "on_milestone" },
  { label: "c", percent: 25, trigger: "on_milestone" }, { label: "d", percent: 25, trigger: "on_completion" }] }).success);

// Structural guards
const dup = JSON.parse(JSON.stringify(CHANF_PROPOSAL));
dup.sections[1].id = dup.sections[0].id;
t("duplicate section id REJECTED", !parseBlockDocument(dup).ok);

const dupBlock = JSON.parse(JSON.stringify(CHANF_PROPOSAL));
dupBlock.sections[1].blocks[0].id = dupBlock.sections[0].blocks[0].id;
t("duplicate block id REJECTED", !parseBlockDocument(dupBlock).ok);

const allHidden = JSON.parse(JSON.stringify(CHANF_PROPOSAL));
allHidden.sections.forEach((s: { hidden: boolean }) => { s.hidden = true; });
t("all-sections-hidden REJECTED", !parseBlockDocument(allHidden).ok);

const emptyList = JSON.parse(JSON.stringify(CHANF_PROPOSAL));
(blockOfKind(sectionById(emptyList, "scope"), "phases") as { phases: unknown[] }).phases = [];
t("empty phases list REJECTED", !parseBlockDocument(emptyList).ok);

const blankAmount = JSON.parse(JSON.stringify(CHANF_PROPOSAL));
(blockOfKind(sectionById(blankAmount, "investment"), "phased_investment_table") as { rows: { amount: string }[] }).rows[0].amount = "";
t("blank amount REJECTED", !parseBlockDocument(blankAmount).ok);

const badVersion = JSON.parse(JSON.stringify(CHANF_PROPOSAL));
badVersion.version = 1;
t("wrong version REJECTED", !parseBlockDocument(badVersion).ok);

// Error messages must name where the problem is
const e = parseBlockDocument(emptyList);
t("error path names the offending section", (e.errors ?? []).some((m) => /^sections\.\d+\./.test(m)), (e.errors ?? []).join(" | "));

console.log(fails === 0 ? "\nALL VALIDATION CHECKS PASSED\n" : `\n${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
