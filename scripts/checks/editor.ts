/**
 * Checks for the editor-era pieces: markdown import and templates.
 *
 * Both are places where content crosses a boundary, and both have a failure
 * mode that is silent rather than loud: markdown that parses into a
 * half-populated document, or a template that carries one client's prose into
 * another's proposal. Those are the properties asserted here.
 */
import { parseMarkdownSections, MARKDOWN_CONTRACT } from "@/lib/document-html/markdown-import";
import { stripToSkeleton, documentFromTemplate } from "@/lib/document-html/templates";
import { parseBlockDocument } from "@/lib/document-html/block-schema";
import { documentTotal, fmtMoney } from "@/lib/document-html/blocks";
import { CHANF_PROPOSAL } from "@/lib/document-html/fixtures/chanf-proposal";
import type { BlockDocument } from "@/lib/document-html/blocks";

let fails = 0;
const t = (n: string, c: boolean, d = "") => { if (!c) { fails++; console.log(`  FAIL ${n} :: ${d}`); } else console.log(`  ok   ${n}`); };

// A document as it would come back from drafting against the contract.
const SAMPLE = `# Proposal for Demo Ltd

## Executive Summary
They do not have a visibility problem, they have a conversion problem.
The plan below rebuilds the site around applications rather than pages.

## Understanding the Brief
Some context about where things stand today.

- **The site is currently down** A lapsed hosting issue took it offline.
- **Applications are manual** Everything arrives by WhatsApp with no record.

## Scope
### Included
- Mobile first rebuild
- Online application form
### Not included
- Social media management
### Needed from you
- Domain registrar access
- Current course list

## Phases
### Phase 1: Stabilise (Week 1)
- Bring the site back online
- Audit the content
### Phase 2: Build (Weeks 2 to 5)
- Design and build the core pages
- Application flow

## Investment
| Phase | Deliverable | Amount |
| --- | --- | --- |
| Phase 1 | Recovery and audit | 15,000 - 20,000 |
| Phase 2 | Design and build | 100,000 - 150,000 |
| Total | | 115,000 - 170,000 |

## Payment Schedule
| Stage | Percent | Trigger |
| --- | --- | --- |
| Deposit | 60 | on signature |
| Balance | 40 | on completion |

## Timeline
| Period | Milestone | Detail |
| --- | --- | --- |
| Week 1 | Stabilise | Site back online |
| Weeks 2 to 5 | Build | Core pages and application flow |

## Ongoing Partnership
### Care (KES 8,000 - 15,000)
- Hosting and security monitoring
- Minor content updates
### Growth (KES 20,000 - 35,000)
- Everything in Care
- Monthly reporting

## Next Steps
1. **Review this proposal** Check the scope and the phasing.
2. **Accept it** Choose how you would like to pay.
`;

console.log("\n1. Markdown import");
const parsed = parseMarkdownSections(SAMPLE);
t("no warnings on contract-conformant markdown", parsed.warnings.length === 0, parsed.warnings.join(" | "));
t("no unrecognised headings", parsed.unrecognised.length === 0, parsed.unrecognised.join(", "));
t("eight sections parsed (Payment Schedule is lifted out, not a section)",
  parsed.sections.length === 8, String(parsed.sections.length));

const kinds = parsed.sections.flatMap((s) => s.blocks.map((b) => b.kind));
t("exec lede parsed", kinds.includes("exec_lede"));
t("bold bullets became cards", kinds.includes("cards_grid"));
t("scope became a three column grid", kinds.includes("scope_3col"));
t("phases parsed with durations", kinds.includes("phases"));
t("investment table parsed", kinds.includes("phased_investment_table"));
t("timeline parsed", kinds.includes("timeline"));
t("tiers parsed", kinds.includes("tiers"));
t("next steps parsed", kinds.includes("steps"));

const scope = parsed.sections.find((s) => s.blocks.some((b) => b.kind === "scope_3col"));
const scopeBlock = scope?.blocks.find((b) => b.kind === "scope_3col") as { included: string[]; excluded: string[]; neededFromClient: string[] };
t("included/excluded/needed split correctly",
  scopeBlock.included.length === 2 && scopeBlock.excluded.length === 1 && scopeBlock.neededFromClient.length === 2,
  JSON.stringify([scopeBlock.included.length, scopeBlock.excluded.length, scopeBlock.neededFromClient.length]));

const retainer = parsed.sections.find((s) => /partnership/i.test(s.title));
t("retainers marked indicative, so they never enter a contract", !!retainer?.indicative);

t("payment schedule read into the document, not a section",
  parsed.schedule?.stages.length === 2 && !parsed.sections.some((s) => /payment schedule/i.test(s.title)));
t("schedule triggers mapped", parsed.schedule?.stages[0].trigger === "on_signature" && parsed.schedule?.stages[1].trigger === "on_completion",
  JSON.stringify(parsed.schedule?.stages.map((s) => s.trigger)));

console.log("\n2. Markdown import guards");
const badSchedule = parseMarkdownSections(SAMPLE.replace("| Balance | 40 | on completion |", "| Balance | 30 | on completion |"));
t("a schedule not summing to 100 warns", badSchedule.warnings.some((w) => /100/.test(w)), badSchedule.warnings.join(" | "));

const unknown = parseMarkdownSections("## Something We Invented\nA paragraph about it.\n");
t("unrecognised heading is kept as prose, not dropped", unknown.sections.length === 1);
t("unrecognised heading is reported", unknown.unrecognised.length === 1, unknown.unrecognised.join(", "));

const empty = parseMarkdownSections("just some text with no headings at all");
t("markdown with no headings warns", empty.warnings.length > 0);

const dashes = parseMarkdownSections("## Executive Summary\nPhase 1 — Stabilise the thing, and it — mostly — works.\n");
t("em dashes are normalised on import",
  !JSON.stringify(dashes.sections).includes("—"), JSON.stringify(dashes.sections).slice(0, 120));

console.log("\n3. Contract and parser agree");
for (const heading of ["Executive Summary", "Understanding the Brief", "Scope", "Phases",
                       "Investment", "Payment Schedule", "Timeline", "Ongoing Partnership", "Next Steps"]) {
  t(`contract documents "${heading}"`, MARKDOWN_CONTRACT.includes(`## ${heading}`));
}

console.log("\n4. Templates carry structure, never content");
const skeleton = stripToSkeleton(CHANF_PROPOSAL);
const skeletonJson = JSON.stringify(skeleton);

t("same section count", skeleton.sections.length === CHANF_PROPOSAL.sections.length);
t("same section order", skeleton.sections.map((s) => s.id).join() === CHANF_PROPOSAL.sections.map((s) => s.id).join());
t("same block kinds",
  skeleton.sections.flatMap((s) => s.blocks.map((b) => b.kind)).join() ===
  CHANF_PROPOSAL.sections.flatMap((s) => s.blocks.map((b) => b.kind)).join());
t("indicative flags preserved", skeleton.sections.filter((s) => s.indicative).length === 2);

t("client name gone", !skeletonJson.includes("CHANF"));
t("client prose gone", !skeletonJson.includes("Kitengela") && !skeletonJson.includes("caregiver in Canada"));
t("real figures gone", !skeletonJson.includes("135,000") && !skeletonJson.includes("100,000 - 150,000"));
t("reference code replaced", skeleton.meta.reference_code === "TEMPLATE");
t("tier prices neutralised", !skeletonJson.includes("KES 20,000 - 35,000"));

const total = documentTotal(skeleton);
t("template totals zero, not a real price", !total || total.min === 0, total ? fmtMoney(total) : "none");

console.log("\n5. Templates still produce valid documents");
const fromTemplate = documentFromTemplate(skeleton, {
  referenceCode: "PROP-2026-999",
  title: "Website rebuild",
  client: { name: "New Client", company: "New Client Ltd", email: "a@b.co" },
});
const validated = parseBlockDocument(fromTemplate);
t("a document from a template validates", validated.ok, (validated.errors ?? []).join(" | "));
t("identity applied", fromTemplate.meta.reference_code === "PROP-2026-999" && fromTemplate.meta.client.name === "New Client");
t("confidential-to set from the client", fromTemplate.meta.confidentialFor === "New Client Ltd");
t("template skeleton not mutated by use", skeleton.meta.reference_code === "TEMPLATE");

console.log("\n6. Imported markdown becomes a valid document");
const asDoc: BlockDocument = {
  version: 2, type: "proposal",
  meta: {
    title: "Imported", coverTag: "Project proposal", coverTitle: "Imported proposal",
    reference_code: "PROP-2026-998", created_at: new Date().toISOString(),
    client: { name: "Demo Ltd" },
  },
  sections: parsed.sections,
  ...(parsed.schedule ? { schedule: parsed.schedule } : {}),
};
const importValidated = parseBlockDocument(asDoc);
t("imported document validates", importValidated.ok, (importValidated.errors ?? []).join(" | "));

console.log(fails === 0 ? "\nALL EDITOR CHECKS PASSED\n" : `\n${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
