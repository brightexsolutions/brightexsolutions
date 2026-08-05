/**
 * Leaves an UNSIGNED agreement waiting for you, so signing can be tested by
 * actually signing it rather than by reading about it.
 *
 * simulate-flow.ts signs programmatically and asserts on the result, which
 * proves the mechanism works but never shows you the page. This walks the steps
 * up to the signing screen and stops:
 *
 *   1. ungates and resets the demo proposal
 *   2. accepts it as the client would
 *   3. pins the figures (the proposal quotes ranges)
 *   4. derives the agreement, countersigned by Brightex
 *   5. prints the link and stops
 *
 * Open the link, scroll to the end, and sign it. Everything the client sees is
 * the real thing.
 *
 * Run: npm run simulate:agreement
 */
import { createClient } from "@supabase/supabase-js";
import { deriveAgreement } from "../src/lib/document-html/derive-agreement";
import { parseBlockDocument } from "../src/lib/document-html/block-schema";
import { scheduleOf, fmtMoney, documentTotal } from "../src/lib/document-html/blocks";
import { DEMO_CLIENT_EMAIL, DEMO_CLIENT_NAME, assertDemoRecipient } from "./demo-target";
import type { PaymentSchedule } from "../src/lib/document-html/blocks";

const BASE = process.env.SIM_BASE_URL ?? "http://localhost:3000";

const line = (s = "") => console.log(s);
const ok = (s: string) => line(`   \x1b[32mok\x1b[0m    ${s}`);
const warn = (s: string) => line(`   \x1b[33m!\x1b[0m     ${s}`);

async function main() {
  assertDemoRecipient(DEMO_CLIENT_EMAIL);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  line("\n\x1b[1m\x1b[36mAGREEMENT READY TO SIGN\x1b[0m");

  const { data: client } = await supabase
    .from("clients").select("id, name, company, email")
    .eq("email", DEMO_CLIENT_EMAIL).is("deleted_at", null).maybeSingle();
  if (!client) throw new Error("Demo client not found.");

  const { data: proposal } = await supabase
    .from("generated_documents").select("*")
    .eq("client_id", client.id).like("reference_code", "DEMO-PROP-%")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!proposal) throw new Error("No demo proposal. Run npm run seed:demo-proposal first.");

  // ── Clear anything from a previous run ───────────────────────────────────
  const { data: old } = await supabase
    .from("generated_documents").select("id")
    .eq("source_document_id", proposal.id).eq("type", "agreement");
  for (const a of old ?? []) {
    await supabase.from("invoices").delete().eq("document_id", a.id);
    await supabase.from("projects").delete().eq("source_document_id", a.id);
    await supabase.from("document_signatures").delete().eq("document_id", a.id);
    await supabase.from("generated_documents").delete().eq("id", a.id);
  }

  // Ungated, so the accept control is offered rather than the teaser.
  await supabase.from("generated_documents").update({
    gated: false, gate_mode: "off",
    accepted_at: new Date().toISOString(),
    accepted_by_name: DEMO_CLIENT_NAME,
    accepted_by_email: DEMO_CLIENT_EMAIL,
    accepted_by_role: "Director",
    chosen_schedule: scheduleOf(proposal.data),
    status: "accepted",
  }).eq("id", proposal.id);
  ok(`${proposal.reference_code} accepted as ${DEMO_CLIENT_NAME}`);

  // ── Pin the figures: the proposal quotes ranges ──────────────────────────
  const LOCKED = [
    { blockId: "inv-table", rowIndex: 0, amount: 18000 },
    { blockId: "inv-table", rowIndex: 1, amount: 130000 },
    { blockId: "inv-table", rowIndex: 2, amount: 32000 },
  ];
  const quoted = documentTotal(proposal.data);
  ok(`figures pinned: quoted ${quoted ? fmtMoney(quoted) : "?"}, agreed 180,000`);

  // ── Countersignature from settings ───────────────────────────────────────
  const { data: settingsRows } = await supabase
    .from("settings").select("key, value")
    .in("key", ["signatory_name", "signatory_title", "signature_path"]);
  const settings = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const hasImage = !!settings.signature_path;

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("generated_documents").select("id", { count: "exact", head: true })
    .eq("type", "agreement").gte("created_at", `${year}-01-01`);
  const ref = `AGR-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const schedule = scheduleOf(proposal.data) as PaymentSchedule;
  const derived = deriveAgreement(proposal.data, {
    referenceCode: ref,
    schedule,
    locked: LOCKED,
    brightexSignatory: {
      name: settings.signatory_name || "Godwin",
      title: settings.signatory_title || "Lead at Brightex Solutions",
      imageUrl: hasImage ? "PENDING" : null,
    },
  });
  if (!derived.ok || !derived.doc) throw new Error(derived.error);

  const validated = parseBlockDocument(derived.doc);
  if (!validated.ok || !validated.doc) throw new Error((validated.errors ?? []).join("; "));

  const { data: agreement, error } = await supabase.from("generated_documents").insert({
    type: "agreement", client_id: client.id,
    title: validated.doc.meta.title, reference_code: ref,
    data: validated.doc, gated: false, gate_mode: "off",
    status: "draft", source: "derived", source_document_id: proposal.id,
    chosen_schedule: schedule,
  }).select("id").single();
  if (error) throw error;

  // Point the in-document signature at the real id, now that it exists.
  if (hasImage) {
    const patched = JSON.parse(
      JSON.stringify(validated.doc).replaceAll("PENDING", `/api/public/documents/${agreement.id}/signature/brightex`)
    );
    await supabase.from("generated_documents").update({ data: patched }).eq("id", agreement.id);
  }

  await supabase.from("document_signatures").insert({
    document_id: agreement.id, party: "brightex",
    signer_name: settings.signatory_name || "Godwin",
    signer_title: settings.signatory_title || "Lead at Brightex Solutions",
    method: hasImage ? "drawn" : "typed",
    image_path: settings.signature_path ?? null,
  });

  ok(`${ref} created, countersigned by ${settings.signatory_name || "Godwin"}`);
  ok(`contract value KES ${derived.total ? fmtMoney(derived.total) : "?"}, terms ${schedule.stages.map((s) => `${s.percent}%`).join("/")}`);
  if (!hasImage) {
    warn("no signature image on file: our side shows a typed name.");
    warn("Add one at Admin > Settings > Signature to see the real thing.");
  }

  line("");
  line("\x1b[1mOpen this and sign it:\x1b[0m");
  line(`   ${BASE}/api/public/documents/${agreement.id}`);
  line("");
  line("What to expect:");
  line("   · our signature, name, title and date already on it");
  line("   · your side shown as an empty space marked Awaiting signature");
  line("   · Download PDF locked until it is signed");
  line("   · the sign button stays disabled until you scroll to the end,");
  line("     fill in name, title, organisation and email, tick all six terms,");
  line("     and draw or upload a signature");
  line("");
  line(`   Proposal for reference: ${BASE}/api/public/documents/${proposal.id}`);
  line("");
}

main().catch((err) => { console.error(err); process.exit(1); });
