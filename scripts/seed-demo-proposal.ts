/**
 * Seeds a section-based demo proposal for the test client, so the whole
 * proposal to agreement to signing flow can be exercised end to end against
 * the real database before a real client ever sees it.
 *
 * It reuses the CHANF fixture's STRUCTURE deliberately: that document exercises
 * every block kind, ranged pricing, indicative sections and per-section gating,
 * so a demo built from anything simpler would not actually test the flow. The
 * client, title and reference are retargeted to the test client, and the
 * reference code is prefixed DEMO so it can never be mistaken for live work.
 *
 * Run: npm run seed:demo-proposal
 */
import { createClient } from "@supabase/supabase-js";
import { parseBlockDocument } from "../src/lib/document-html/block-schema";
import { documentTotal, needsFigureLock, fmtMoney } from "../src/lib/document-html/blocks";
import { CHANF_PROPOSAL } from "../src/lib/document-html/fixtures/chanf-proposal";
import { DEMO_CLIENT_EMAIL } from "./demo-target";
import type { BlockDocument } from "../src/lib/document-html/blocks";

const TEST_CLIENT_EMAIL = DEMO_CLIENT_EMAIL;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!url || !key) throw new Error("Run with --env-file=.env.local");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, company, email, phone")
    .eq("email", TEST_CLIENT_EMAIL)
    .is("deleted_at", null)
    .maybeSingle();

  if (clientError) throw clientError;
  if (!client) throw new Error(`Test client ${TEST_CLIENT_EMAIL} not found`);

  const doc: BlockDocument = {
    ...structuredClone(CHANF_PROPOSAL),
    meta: {
      ...structuredClone(CHANF_PROPOSAL.meta),
      title: "Website Redesign Proposal: Demo Client",
      coverSub:
        "A demonstration proposal used to test the proposal, agreement and signing flow. Not a real engagement.",
      reference_code: `DEMO-PROP-${new Date().toISOString().slice(0, 10)}`,
      created_at: new Date().toISOString(),
      client: {
        name: client.name,
        company: client.company || null,
        email: client.email,
        phone: client.phone,
      },
      confidentialFor: client.company || client.name,
    },
    // Two schedules, so the client-facing choice is exercised rather than
    // rendering as a single confirmation line.
    scheduleOptions: [
      {
        mode: "standard",
        stages: [
          { label: "Deposit, to commence development", percent: 60, trigger: "on_signature" },
          { label: "On completion and launch", percent: 40, trigger: "on_completion" },
        ],
      },
      {
        mode: "flexible",
        stages: [
          { label: "Deposit, to commence development", percent: 40, trigger: "on_signature" },
          { label: "At the midpoint review", percent: 20, trigger: "on_milestone", milestone_index: 1 },
          { label: "On completion and launch", percent: 40, trigger: "on_completion" },
        ],
      },
    ],
  };

  const validated = parseBlockDocument(doc);
  if (!validated.ok || !validated.doc) {
    console.error("Demo document failed validation:");
    for (const e of validated.errors ?? []) console.error("  " + e);
    process.exit(1);
  }

  // Replace any previous demo rather than accumulating them.
  await supabase
    .from("generated_documents")
    .delete()
    .eq("client_id", client.id)
    .like("reference_code", "DEMO-PROP-%");

  const { data: created, error } = await supabase
    .from("generated_documents")
    .insert({
      type: "proposal",
      client_id: client.id,
      title: validated.doc.meta.title,
      reference_code: validated.doc.meta.reference_code,
      data: validated.doc,
      gated: false,
      status: "draft",
      source: "import",
    })
    .select("id, reference_code, title")
    .single();

  if (error) throw error;

  const total = documentTotal(validated.doc);
  console.log("\nDemo proposal created");
  console.log("  id         :", created.id);
  console.log("  reference  :", created.reference_code);
  console.log("  client     :", client.name, `<${client.email}>`);
  console.log("  sections   :", validated.doc.sections.length);
  console.log("  total      :", total ? `KES ${fmtMoney(total)}` : "none");
  console.log("  figure lock:", needsFigureLock(validated.doc));
  console.log("\n  Public link :", `${siteUrl}/api/public/documents/${created.id}`);
  console.log("  Admin view  :", `${siteUrl}/api/admin/documents/${created.id}/view`);
  console.log("  Print view  :", `${siteUrl}/api/public/documents/${created.id}?print=1`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
