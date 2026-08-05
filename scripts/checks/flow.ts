/**
 * Checks for the proposal to signed agreement flow.
 *
 * These exercise the derivation and signing logic without a database or a
 * browser, because the properties that matter are arithmetic and refusal
 * conditions: does the contract total match the proposal, do milestones sum to
 * the total, does the derivation refuse a range rather than picking an end of
 * it. Those are the failures that would reach a client as a wrong number.
 */
import { deriveAgreement, applyLockedFigures } from "@/lib/document-html/derive-agreement";
import { documentTotal, needsFigureLock, rangedAmounts, parseMoney, fmtMoney, renderBlockDocument } from "@/lib/document-html/blocks";
import { parseBlockDocument } from "@/lib/document-html/block-schema";
import { agreementSignBox, signingTerms, describeSchedule } from "@/lib/document-html/accept";
import { planKickoff, planDates, parsePhaseSpan } from "@/lib/document-html/kickoff";
import { CHANF_PROPOSAL } from "@/lib/document-html/fixtures/chanf-proposal";
import type { PaymentSchedule, BlockDocument } from "@/lib/document-html/blocks";

let fails = 0;
const t = (n: string, c: boolean, d = "") => { if (!c) { fails++; console.log(`  FAIL ${n} :: ${d}`); } else console.log(`  ok   ${n}`); };

const SIGNATORY = { name: "Godwin Ochieng", title: "Lead at Brightex Solutions" };
const STANDARD: PaymentSchedule = { mode: "standard", stages: [
  { label: "Deposit", percent: 60, trigger: "on_signature" },
  { label: "On completion", percent: 40, trigger: "on_completion" },
]};
const FLEXIBLE: PaymentSchedule = { mode: "flexible", stages: [
  { label: "Deposit", percent: 40, trigger: "on_signature" },
  { label: "Midpoint", percent: 20, trigger: "on_milestone", milestone_index: 1 },
  { label: "On completion", percent: 40, trigger: "on_completion" },
]};

console.log("\n1. Ranges block derivation");
const ranged = deriveAgreement(CHANF_PROPOSAL, { referenceCode: "AGR-TEST-001", schedule: STANDARD, brightexSignatory: SIGNATORY });
t("derivation REFUSES while ranges remain", !ranged.ok);
t("refusal names the unresolved lines", (ranged.error ?? "").includes("Phase 1"), ranged.error ?? "");
t("proposal reports it needs a figure lock", needsFigureLock(CHANF_PROPOSAL));
t("three ranged lines detected", rangedAmounts(CHANF_PROPOSAL).length === 3, String(rangedAmounts(CHANF_PROPOSAL).length));

console.log("\n2. Locking figures");
const LOCKED = [
  { blockId: "inv-table", rowIndex: 0, amount: 18000 },
  { blockId: "inv-table", rowIndex: 1, amount: 130000 },
  { blockId: "inv-table", rowIndex: 2, amount: 32000 },
];
const pinned = applyLockedFigures(CHANF_PROPOSAL, LOCKED);
const pinnedTotal = documentTotal(pinned);
t("no ranges remain after locking", !needsFigureLock(pinned));
t("total is the sum of pinned figures", pinnedTotal?.min === 180000, fmtMoney(pinnedTotal!));
t("table total recomputed, not stale", (() => {
  const s = pinned.sections.find((x) => x.id === "investment")!;
  const b = s.blocks.find((x) => x.id === "inv-table")! as { total: { amount: string } };
  return parseMoney(b.total.amount)?.min === 180000;
})());
t("original proposal is not mutated", needsFigureLock(CHANF_PROPOSAL));

console.log("\n3. Derived agreement");
const derived = deriveAgreement(CHANF_PROPOSAL, {
  referenceCode: "AGR-TEST-001", schedule: STANDARD, locked: LOCKED, brightexSignatory: SIGNATORY,
});
t("derivation succeeds once pinned", derived.ok, derived.error ?? "");
const agr = derived.doc as BlockDocument;
t("type is agreement", agr.type === "agreement");
t("derived agreement validates", parseBlockDocument(agr).ok, (parseBlockDocument(agr).errors ?? []).join(" | "));
t("contract total matches the pinned proposal", derived.total?.min === 180000, String(derived.total?.min));
t("references the source proposal", JSON.stringify(agr).includes(CHANF_PROPOSAL.meta.reference_code));
t("countersignatory named in the document", JSON.stringify(agr).includes(SIGNATORY.name));

console.log("\n4. Milestones must sum to the contract total");
function milestoneSum(doc: BlockDocument): number {
  const s = doc.sections.find((x) => x.id === "fees")!;
  const b = s.blocks.find((x) => x.id === "fees-schedule")! as { rows: { amount: string }[] };
  return b.rows.reduce((n, r) => n + (parseMoney(r.amount)?.min ?? 0), 0);
}
t("60/40 milestones sum exactly", milestoneSum(agr) === 180000, String(milestoneSum(agr)));

const flex = deriveAgreement(CHANF_PROPOSAL, {
  referenceCode: "AGR-TEST-002", schedule: FLEXIBLE, locked: LOCKED, brightexSignatory: SIGNATORY,
});
t("40/20/40 derivation succeeds", flex.ok, flex.error ?? "");
t("40/20/40 milestones sum exactly", milestoneSum(flex.doc as BlockDocument) === 180000, String(milestoneSum(flex.doc as BlockDocument)));

// The rounding case: a total that does not divide cleanly by the percentages.
const odd = applyLockedFigures(CHANF_PROPOSAL, [
  { blockId: "inv-table", rowIndex: 0, amount: 33333 },
  { blockId: "inv-table", rowIndex: 1, amount: 33333 },
  { blockId: "inv-table", rowIndex: 2, amount: 33335 },
]);
const oddDerived = deriveAgreement(odd, { referenceCode: "AGR-TEST-003", schedule: FLEXIBLE, brightexSignatory: SIGNATORY });
t("awkward total still sums exactly (no lost shilling)",
  milestoneSum(oddDerived.doc as BlockDocument) === 100001, String(milestoneSum(oddDerived.doc as BlockDocument)));

console.log("\n5. Indicative sections never enter the contract");
t("retainer tiers excluded from contract total", derived.total?.min === 180000);
t("no retainer section in the agreement",
  !agr.sections.some((s) => /retainer|ongoing partnership/i.test(s.title)),
  agr.sections.map((s) => s.title).join(", "));
t("no suggested-enhancements section in the agreement",
  !agr.sections.some((s) => /suggested enhancement/i.test(s.title)));

console.log("\n6. Derivation guards");
t("a non-proposal is refused",
  !deriveAgreement({ ...CHANF_PROPOSAL, type: "agreement" }, { referenceCode: "X", schedule: STANDARD, brightexSignatory: SIGNATORY }).ok);
t("a schedule not summing to 100 is refused",
  !deriveAgreement(CHANF_PROPOSAL, { referenceCode: "X", locked: LOCKED, brightexSignatory: SIGNATORY,
    schedule: { mode: "flexible", stages: [{ label: "a", percent: 70, trigger: "on_signature" }] } }).ok);

console.log("\n7. Signing control");
const signHtml = renderBlockDocument(agr, {
  trailingHtml: agreementSignBox({
    documentId: "11111111-2222-3333-4444-555555555555",
    clientName: "Jacinta Nduta", clientEmail: "j@x.co", entity: "CHANF",
    schedule: STANDARD, countersignedBy: SIGNATORY,
  }),
  dlLocked: true, dlLockedReason: "Available once the agreement is signed",
});
const terms = signingTerms(STANDARD);
t("six terms confirmed individually", terms.length === 6, String(terms.length));
t("payment term names the chosen schedule", terms[0].label.includes("60% on signature"), terms[0].label);
t("every term rendered as its own checkbox",
  (signHtml.match(/data-term="/g) ?? []).length === terms.length);
t("signature canvas present", signHtml.includes('id="sigCanvas"'));
t("upload path present", signHtml.includes("brxSigUpload"));
t("preview endpoint wired", signHtml.includes("/signature-preview"));
t("sign endpoint wired", signHtml.includes("/sign'"));
t("countersignature shown to the client", signHtml.includes("Already signed by Godwin Ochieng"));
t("unsigned agreement is not downloadable", signHtml.includes("dl-btn-locked"));
t("read-to-end gate present", signHtml.includes("signProgressBar"));
t("describeSchedule reads as prose",
  describeSchedule(FLEXIBLE) === "40% on signature, then 20% at the agreed milestone, then 40% on completion",
  describeSchedule(FLEXIBLE));

console.log("\n8. Signing CSS is in the shell, not orphaned");
const style = /<style>([\s\S]*?)<\/style>/.exec(signHtml)?.[1] ?? "";
for (const cls of ["sig-tabs", "sig-tab", "sig-canvas", "sig-preview", "sig-clear", "changes-panel"]) {
  t(`.${cls} is styled`, style.includes("." + cls));
}
t("signing controls hidden in print", /@media print\{[\s\S]*?\.sig-pane/.test(style));

console.log("\n9. Kick-off planning");
const plan = planKickoff(agr, { startDate: "2026-08-10T09:00:00Z", clientLabel: "CHANF" });
t("no warnings on a well-formed agreement", plan.warnings.length === 0, plan.warnings.join(" | "));
t("budget is the contract total", plan.project.budget === 180000, String(plan.project.budget));
t("one task per delivery phase", plan.tasks.length === 3, String(plan.tasks.length));
t("one invoice per payment stage", plan.invoices.length === 2, String(plan.invoices.length));
t("invoices sum to the contract",
  plan.invoices.reduce((n, i) => n + i.amount, 0) === 180000,
  String(plan.invoices.reduce((n, i) => n + i.amount, 0)));
t("only the deposit is billed immediately",
  plan.invoices.filter((i) => i.issueNow).length === 1,
  String(plan.invoices.filter((i) => i.issueNow).length));

const flexPlan = planKickoff(flex.doc as BlockDocument, { startDate: "2026-08-10T09:00:00Z", clientLabel: "CHANF" });
t("3-stage schedule yields 3 invoices", flexPlan.invoices.length === 3, String(flexPlan.invoices.length));
t("3-stage invoices sum to the contract",
  flexPlan.invoices.reduce((n, i) => n + i.amount, 0) === 180000,
  String(flexPlan.invoices.reduce((n, i) => n + i.amount, 0)));
t("the midpoint stage is gated by a task",
  flexPlan.invoices[1].gatedByTaskIndex !== undefined && flexPlan.tasks.some((x) => x.isPaymentMilestone));
t("only the deposit is billed immediately (3-stage)",
  flexPlan.invoices.filter((i) => i.issueNow).length === 1);

// Phase durations are written for humans; the parser has to cope or say so.
t('"Week 1" reads as days 0 to 7',
  JSON.stringify(parsePhaseSpan("Week 1")) === JSON.stringify({ startDay: 0, endDay: 7 }),
  JSON.stringify(parsePhaseSpan("Week 1")));
t('"Weeks 2 to 5" reads as days 7 to 35',
  JSON.stringify(parsePhaseSpan("Weeks 2 to 5")) === JSON.stringify({ startDay: 7, endDay: 35 }),
  JSON.stringify(parsePhaseSpan("Weeks 2 to 5")));
t("unreadable duration returns null rather than guessing",
  parsePhaseSpan("when the client is ready") === null);

const dated = planDates(plan);
t("task due dates resolve to real dates", dated.tasks.every((x) => x.dueDate === null || /^\d{4}-\d{2}-\d{2}$/.test(x.dueDate)));
t("deposit falls due 3 days after signing", dated.invoices[0].dueDate === "2026-08-13", String(dated.invoices[0].dueDate));
t("final stage falls due at the end of delivery", dated.invoices[1].dueDate === "2026-10-05", String(dated.invoices[1].dueDate));

// An agreement with nothing to plan from must warn, not invent.
const empty = structuredClone(agr);
empty.sections = empty.sections.filter((s) => !s.blocks.some((b) => b.kind === "phases" || b.kind === "timeline"));
const emptyPlan = planKickoff(empty, { startDate: "2026-08-10T09:00:00Z", clientLabel: "X" });
t("missing phases produce a warning, not silent success",
  emptyPlan.warnings.some((w) => /phases/i.test(w)), emptyPlan.warnings.join(" | "));

console.log(fails === 0 ? "\nALL FLOW CHECKS PASSED\n" : `\n${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
