/**
 * Puts the demo proposal back to how a client first sees it.
 *
 * Walking the flow leaves the proposal accepted and an agreement, project and
 * invoices behind it, so the next walkthrough starts halfway along. This clears
 * that: unaccepted, unread, ungated, with nothing derived from it.
 *
 * Scoped hard to the demo client and DEMO-PROP references. It deletes real
 * rows, so it must not be able to reach anything else: see the guards below.
 *
 *   npm run demo:reset                    back to before acceptance
 *   npm run demo:reset -- --keep-agreement  leave the agreement to sign
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_CLIENT_EMAIL, assertDemoRecipient } from "./demo-target";

const BASE = process.env.SIM_BASE_URL ?? "http://localhost:3000";
const KEEP_AGREEMENT = process.argv.includes("--keep-agreement");

const line = (s = "") => console.log(s);
const ok = (s: string) => line(`   \x1b[32mok\x1b[0m    ${s}`);

async function main() {
  // The same guard the sending scripts use: this only ever touches the demo
  // account, and there is no flag that changes that.
  assertDemoRecipient(DEMO_CLIENT_EMAIL);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  line("\n\x1b[1m\x1b[36mRESET DEMO PROPOSAL\x1b[0m");

  const { data: client } = await supabase
    .from("clients").select("id, name, email")
    .eq("email", DEMO_CLIENT_EMAIL).is("deleted_at", null).maybeSingle();
  if (!client) throw new Error("Demo client not found.");

  const { data: proposal } = await supabase
    .from("generated_documents")
    .select("id, reference_code, title")
    .eq("client_id", client.id)
    .like("reference_code", "DEMO-PROP-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!proposal) throw new Error("No demo proposal. Run npm run seed:demo-proposal first.");

  // ── Everything derived from it ───────────────────────────────────────────
  if (!KEEP_AGREEMENT) {
    const { data: agreements } = await supabase
      .from("generated_documents")
      .select("id, reference_code")
      .eq("source_document_id", proposal.id)
      .eq("type", "agreement");

    for (const agreement of agreements ?? []) {
      // Order matters: children before parents, or the foreign keys null out
      // and orphans are left behind rather than removed.
      await supabase.from("invoices").delete().eq("document_id", agreement.id);
      await supabase.from("projects").delete().eq("source_document_id", agreement.id);
      await supabase.from("document_signatures").delete().eq("document_id", agreement.id);
      await supabase.from("generated_documents").delete().eq("id", agreement.id);
      ok(`removed ${agreement.reference_code} and everything under it`);
    }
    if ((agreements ?? []).length === 0) ok("no agreement to remove");
  }

  // ── The proposal itself ──────────────────────────────────────────────────
  const { error } = await supabase
    .from("generated_documents")
    .update({
      accepted_at: null,
      accepted_by_name: null,
      accepted_by_email: null,
      accepted_by_role: null,
      accepted_notes: null,
      accepted_ip: null,
      accepted_user_agent: null,
      chosen_schedule: null,
      changes_requested_at: null,
      changes_requested_by: null,
      changes_requested_note: null,
      locked_figures: null,
      figures_locked_at: null,
      figures_locked_by: null,
      // Unread, so the read receipt records properly on the next open.
      first_viewed_at: null,
      view_count: 0,
      // Ungated: gated and gate_mode move together, always.
      gated: false,
      gate_mode: "off",
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", proposal.id);
  if (error) throw error;

  ok(`${proposal.reference_code} reset to unaccepted, unread and ungated`);

  line("");
  line("\x1b[1mOpen it as the client would:\x1b[0m");
  line(`   ${BASE}/api/public/documents/${proposal.id}`);
  line("");
  line("You should see, at the end:");
  line("   · the payment terms stated, not offered as a choice");
  line("   · Accept this proposal");
  line("   · Something needs changing first");
  line("");
  if (!KEEP_AGREEMENT) {
    line("   To get back to a signable agreement: npm run simulate:agreement");
    line("");
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
