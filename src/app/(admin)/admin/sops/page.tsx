import { SOP_LIBRARY, SOP_CATEGORIES } from "@/lib/sop-library";
import { SopsPageClient } from "./sops-client";

export const metadata = { title: "SOPs" };

export default function SopsPage() {
  // The library is code-defined, so the list is built on the server and the
  // client component only handles search and filtering.
  const entries = SOP_LIBRARY.map((s) => ({
    key: s.key,
    label: s.label,
    summary: s.summary,
    category: s.category,
    area: s.data.area,
    revision: s.data.revision,
    reference: s.data.sop_number,
    // Flattened so search covers the procedure text, not just the title.
    searchText: [
      s.label, s.summary, s.data.area, s.data.purpose, s.data.scope,
      ...s.data.procedure_steps.map((p) => `${p.step} ${p.description}`),
    ].join(" ").toLowerCase(),
  }));

  return <SopsPageClient entries={entries} categories={[...SOP_CATEGORIES]} />;
}
