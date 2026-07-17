import type { SopData } from "@/lib/document-types";
import {
  documentShell, sectionHeader, clauseParagraph, respTable, stepsList, splitTitleForCover,
  chipRow, noteBox,
} from "@/lib/document-html";

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}

export function renderSopHtml(data: SopData): string {
  const sections: string[] = [];
  let n = 1;
  const num = () => String(n++).padStart(2, "0");

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Overview", "Purpose")}
    ${clauseParagraph(data.purpose)}
  </section>`);

  sections.push(`<section class="section">
    ${sectionHeader(num(), "Overview", "Scope")}
    ${clauseParagraph(data.scope)}
  </section>`);

  if (data.responsibilities.length > 0) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Ownership", "Roles & Responsibilities")}
      ${respTable(data.responsibilities)}
    </section>`);
  }

  sections.push(`<section class="section">
    ${sectionHeader(num(), "How-to", "Procedure")}
    ${stepsList(data.procedure_steps.map((s) => ({ title: s.step, desc: s.description })))}
  </section>`);

  if (data.tools_systems.length > 0) {
    sections.push(`<section class="section">
      ${sectionHeader(num(), "Reference", "Tools & Systems Used")}
      ${chipRow(data.tools_systems)}
    </section>`);
  }

  sections.push(`<section class="section">
    ${sectionHeader(num(), "If Something's Wrong", "Escalation")}
    ${clauseParagraph(data.escalation)}
    ${noteBox("Internal document — not for external distribution. AI-assisted draft; confirm accuracy against actual practice before treating this as the definitive procedure.")}
  </section>`);

  const tocLabels = [
    "Purpose",
    "Scope",
    data.responsibilities.length ? "Roles & Responsibilities" : null,
    "Procedure",
    data.tools_systems.length ? "Tools & Systems Used" : null,
    "Escalation",
  ].filter((x): x is string => !!x);

  return documentShell({
    title: `${data.title} — SOP ${data.sop_number}`,
    dlBarLabel: `INTERNAL SOP · ${data.area.toUpperCase()}`,
    coverTag: `Internal · Standard Operating Procedure · Rev ${data.revision}`,
    coverTitleLines: splitTitleForCover(data.title),
    coverSub: data.area,
    metaFields: [
      { label: "Area", value: data.area },
      { label: "Effective Date", value: fmtDate(data.effective_date) },
      { label: "Revision", value: data.revision },
      { label: "Reference", value: data.sop_number },
    ],
    confidentialFor: null,
    tocItems: tocLabels.map((label, i) => ({ num: String(i + 1).padStart(2, "0"), label })),
    bodyHtml: sections.join("\n"),
  });
}
