import {
  renderBlockDocument, needsFigureLock, documentTotal, fmtMoney,
  DEFAULT_PAYMENT_SCHEDULE, scheduleOf,
} from "@/lib/document-html/blocks";
import { proposalAcceptBox, proposalAcceptedBox, describeSchedule } from "@/lib/document-html/accept";
import { acceptButton, acceptedBox } from "@/lib/document-html";
import { CHANF_PROPOSAL as doc } from "@/lib/document-html/fixtures/chanf-proposal";

let fails = 0;
function check(name: string, cond: boolean, detail = "") {
  if (!cond) { fails++; console.log(`  FAIL  ${name}${detail ? "  :: " + detail : ""}`); }
  else console.log(`  ok    ${name}`);
}

// ── The four states a public link can be in ────────────────────────────────
const states = {
  "proposal, open": renderBlockDocument(doc, {
    trailingHtml: proposalAcceptBox({
      documentId: "11111111-2222-3333-4444-555555555555",
      clientName: "Jacinta Nduta", clientEmail: "j@chanf.or.ke",
      schedule: doc.schedule, hasRangedPricing: needsFigureLock(doc),
    }),
  }),
  "proposal, gated": renderBlockDocument(doc, {
    gated: true, trailingHtml: "", dlLocked: true, dlLockedReason: "Available after your walkthrough call",
  }),
  "proposal, accepted": renderBlockDocument(doc, {
    trailingHtml: proposalAcceptedBox("Jacinta Nduta", "2026-08-06T09:00:00Z"),
  }),
  "agreement, unsigned": renderBlockDocument(
    { ...doc, type: "agreement" },
    { trailingHtml: acceptButton("11111111-2222-3333-4444-555555555555", { clientName: "J", clientEmail: "j@x.co" }),
      dlLocked: true, dlLockedReason: "Available once the agreement is signed" }),
  "agreement, signed": renderBlockDocument(
    { ...doc, type: "agreement" },
    { trailingHtml: acceptedBox("Jacinta Nduta", "2026-08-06T09:00:00Z") }),
};

// ── 1. CSS class coverage: the bug class that ships silently ───────────────
console.log("\n1. CSS class coverage (every emitted class must be styled)");
const styleBlock = /<style>([\s\S]*?)<\/style>/.exec(states["proposal, open"])?.[1] ?? "";
const defined = new Set<string>();
for (const m of styleBlock.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1]);
// Utility classes intentionally styled by element/descendant selectors only.
const styledByContext = new Set(["v", "l", "n", "sn", "amt", "total", "lbl", "val", "col", "inc", "out", "ic", "sub", "label", "desc", "feat", "head", "body", "price", "num", "stext", "txt"]);

const missing = new Map<string, string[]>();
for (const [state, html] of Object.entries(states)) {
  const body = html.replace(/<style>[\s\S]*?<\/style>/, "");
  for (const m of body.matchAll(/class="([^"]+)"/g)) {
    for (const cls of m[1].trim().split(/\s+/)) {
      if (!cls || defined.has(cls) || styledByContext.has(cls)) continue;
      if (!missing.has(cls)) missing.set(cls, []);
      missing.get(cls)!.push(state);
    }
  }
}
check("no unstyled classes emitted", missing.size === 0,
  [...missing].map(([c, s]) => `.${c} (in ${s[0]})`).join(", "));

// ── 2. Accept control appears exactly where it should ─────────────────────
console.log("\n2. Acceptance controls, per state");
check("open proposal offers acceptance",        states["proposal, open"].includes("brxAcceptProposal"));
check("gated proposal offers NO acceptance",   !states["proposal, gated"].includes("brxAcceptProposal"));
check("accepted proposal offers NO acceptance",!states["proposal, accepted"].includes("brxAcceptProposal"));
check("accepted proposal shows confirmation",   states["proposal, accepted"].includes("Accepted by Jacinta Nduta"));
check("unsigned agreement offers signing",      states["agreement, unsigned"].includes("brxAcceptAgreement"));
check("signed agreement offers NO signing",    !states["agreement, signed"].includes("brxAcceptAgreement"));
check("proposal never shows the LEGAL signer",  !states["proposal, open"].includes("brxAcceptAgreement"));

// ── 3. The endpoint the button posts to must be the real route ────────────
console.log("\n3. Endpoint wiring");
const posted = [...states["proposal, open"].matchAll(/fetch\('([^']+)'/g)].map((m) => m[1]);
check("accept posts to /accept-proposal", posted.some((u) => u.endsWith("/accept-proposal")), posted.join(", "));
const agrPosted = [...states["agreement, unsigned"].matchAll(/fetch\('([^']+)'/g)].map((m) => m[1]);
check("sign posts to /accept", agrPosted.some((u) => u.endsWith("/accept")), agrPosted.join(", "));

// ── 4. Schedule choice ────────────────────────────────────────────────────
console.log("\n4. Payment terms are stated, never chosen");
// How a project is paid for is Brightex's decision. A client shown a menu of
// terms reads them as negotiable, which opens a negotiation at the exact moment
// they were ready to say yes.
check("terms shown as a plain statement", states["proposal, open"].includes("sched-fixed"));
check("no radio picker rendered", !states["proposal, open"].includes('name="brxSched"'));
check("no schedule choice is posted", !states["proposal, open"].includes("schedule_index"));
check("the house terms read correctly",
  describeSchedule(doc.schedule!) === "60% on signature, then 40% on completion",
  describeSchedule(doc.schedule!));
check("the house default is 60/40",
  DEFAULT_PAYMENT_SCHEDULE.stages.map((st) => st.percent).join("/") === "60/40",
  DEFAULT_PAYMENT_SCHEDULE.stages.map((st) => st.percent).join("/"));
check("a document with no schedule falls back to the house terms",
  describeSchedule(scheduleOf({ schedule: undefined })) === "60% on signature, then 40% on completion",
  describeSchedule(scheduleOf({ schedule: undefined })));

// ── 5. Print and responsive invariants ────────────────────────────────────
console.log("\n5. Print and responsive");
for (const [state, html] of Object.entries(states)) {
  check(`${state}: @page A4`, /@page\{size:A4/.test(html));
  check(`${state}: no unscoped 720 breakpoint`, !/@media\s*\(max-width:720px\)/.test(html));
  check(`${state}: no em dash`, !html.includes("—"));
}
// Whitespace-tolerant: the rule's formatting is not the thing being asserted.
const printBlocks = [...styleBlock.matchAll(/@media\s+print\s*\{([\s\S]*?)\n\s*\}/g)].map((m) => m[1]).join("\n");
check("print hides the accept box", /\.accept-box/.test(printBlocks), printBlocks.slice(0, 120));
check("tables carry data-label", (states["proposal, open"].match(/data-label=/g) ?? []).length > 10);

// ── 6. Download button state ──────────────────────────────────────────────
console.log("\n6. Download button");
check("open proposal is downloadable",     states["proposal, open"].includes('onclick="window.print()"'));
check("gated proposal is NOT downloadable", states["proposal, gated"].includes("dl-btn-locked"));
check("unsigned agreement NOT downloadable",states["agreement, unsigned"].includes("dl-btn-locked"));
check("signed agreement IS downloadable",   states["agreement, signed"].includes('onclick="window.print()"'));

// ── 7. Gating targets pricing only ────────────────────────────────────────
console.log("\n7. Gating");
check("gated blurs exactly one section", (states["proposal, gated"].match(/class="gate-wrap"/g) ?? []).length === 1);
check("gated still shows the plan (phases visible)", states["proposal, gated"].includes("Stabilise &amp; Discover"));
check("ungated has no gate wrapper", !/class="gate-wrap"/.test(states["proposal, open"]));

// ── 8. Money and totals ───────────────────────────────────────────────────
console.log("\n8. Money");
const total = documentTotal(doc)!;
check("total is the ranged project fee", fmtMoney(total) === "135,000 - 210,000", fmtMoney(total));
check("indicative retainers excluded from total", total.max === 210000, String(total.max));
check("figure lock required", needsFigureLock(doc));

// ── 9. TOC and numbering derived ──────────────────────────────────────────
console.log("\n9. Structure");
const tocNums = [...states["proposal, open"].matchAll(/<span class="n">(\d+)<\/span>/g)].map((m) => m[1]);
check("TOC numbers derived 01..10", tocNums.join(",") === "01,02,03,04,05,06,07,08,09,10", tocNums.join(","));
check("TOC entry count matches sections", tocNums.length === doc.sections.filter((s) => !s.hidden).length);

console.log(fails === 0 ? "\nALL CHECKS PASSED\n" : `\n${fails} CHECK(S) FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
