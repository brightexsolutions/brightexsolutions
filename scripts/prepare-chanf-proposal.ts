/**
 * Prepares CHANF's proposal as a real, section-based document in the dashboard.
 *
 * It PREPARES ONLY. Nothing is emailed to CHANF by this script, and there is no
 * flag that makes it. Real client correspondence goes out from the dashboard,
 * by a human, after reading it: the send button belongs where the person
 * pressing it can see what they are sending.
 *
 * What it does:
 *   - imports the CHANF proposal as a validated block document
 *   - leaves it a DRAFT, so it appears in Admin > Documents ready to review,
 *     gate, adjust and send
 *
 * With --preview it also sends the three emails CHANF would receive to the demo
 * account, so the wording can be read in a real inbox before anything goes out
 * for real. Never to CHANF: see scripts/demo-target.ts.
 *
 *   npm run chanf:prepare
 *   npm run chanf:prepare -- --preview
 */
import { createClient } from "@supabase/supabase-js";
import { transporter, SENDERS } from "../src/lib/mail";
import { emailTemplate, emailParagraph, emailInfoCard, emailButton, emailDivider, emailSignoff } from "../src/lib/email-templates";
import { sendIntakeRecap } from "../src/lib/intake-recap";
import { sendCallSummary, type CallSummary } from "../src/lib/call-summary";
import { parseBlockDocument } from "../src/lib/document-html/block-schema";
import { documentTotal, fmtMoney, needsFigureLock } from "../src/lib/document-html/blocks";
import { CHANF_PROPOSAL } from "../src/lib/document-html/fixtures/chanf-proposal";
import { DEMO_CLIENT_EMAIL, assertDemoRecipient } from "./demo-target";
import type { BlockDocument } from "../src/lib/document-html/blocks";

const BASE = process.env.SIM_BASE_URL ?? "http://localhost:3000";
const PREVIEW = process.argv.includes("--preview");

const line = (s = "") => console.log(s);
const ok = (s: string) => line(`   \x1b[32mok\x1b[0m    ${s}`);
const warn = (s: string) => line(`   \x1b[33m!\x1b[0m     ${s}`);

/**
 * What the discovery call covered, drawn from the same material the proposal
 * was written from. Kept here as editable text rather than generated, because
 * it states commitments on both sides and should be read before it is sent.
 */
function chanfCallSummary(documentUrl: string): CallSummary {
  return {
    clientName: "Fawley",
    attendees: ["Fawley and the CHANF team", "Godwin Ochieng, Brightex Solutions"],
    callDate: "2026-08-01",
    discussed: [
      "The website at chan-f.or.ke is currently offline after a lapsed hosting and subscription issue, and has been for some weeks.",
      "Applications are handled entirely by hand today: enquiries arrive by WhatsApp, phone or in person, and there is no digital record of who applied or where they got to.",
      "Most enquiries come from paid boosting on Facebook, Instagram and TikTok, but the schedule is irregular and a large share of the leads are job seekers rather than prospective students.",
      "There is no analytics on the site and no consistent way to tell which channel or campaign is actually producing enrolments.",
      "CHANF holds strong material already: graduation photography, real placement outcomes including a graduate now working in Canada, and NITA and DOSH accreditation.",
    ],
    agreed: [
      "The problem is conversion rather than visibility: the attention exists and is not being turned into applications.",
      "The work will run in three phases, so the site comes back online and becomes visible in week one rather than at the end.",
      "The rebuild is mobile first, since almost all prospective students arrive on a phone.",
      "An online application form replaces the manual process, with WhatsApp kept as a parallel route rather than removed.",
      "Analytics and Search Console are set up in the final phase so results are measurable from launch.",
      "Payment is 60% to commence and 40% on completion and launch.",
    ],
    neededFromClient: [
      "Access to the domain registrar account for chan-f.or.ke, or to be added as an authorised manager.",
      "Access to the current hosting account, or confirmation of the provider, so the outage can be diagnosed.",
      "Logo files, brand colours and fonts if they exist. If not, a simple brand identity can be scoped separately before the build.",
      "The current course list with fees, requirements and durations.",
      "Updated photography, replacing the outdated hospital images currently in use.",
      "Testimonials, graduate stories, accreditation documents and trainer bios.",
      "A single point of contact for content sign-off during the build.",
    ],
    notCovered: [
      "Social media management and paid ad strategy. Brightex does not offer this in house and can recommend a specialist.",
      "Multi-platform content strategy beyond the website's own blog and SEO content.",
      "Video production for graduate testimonials, which can be scoped separately.",
    ],
    nextSteps: [
      "Read the proposal linked below, covering scope, phasing, timeline and investment.",
      "Come back with anything that needs changing, or accept it as it stands.",
      "Once the agreement is signed and the deposit received, Phase 1 begins with bringing the site back online.",
    ],
    documentUrl,
    documentLabel: "Read the proposal",
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  line("\n\x1b[1m\x1b[36mCHANF: PREPARE PROPOSAL\x1b[0m");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, company, email")
    .ilike("company", "%chanf%")
    .is("deleted_at", null)
    .maybeSingle();
  if (!client) throw new Error("CHANF client not found.");

  line(`   client: ${client.company}`);
  line(`   nothing is emailed to this client by this script.\n`);

  // ── The document ─────────────────────────────────────────────────────────
  line("\x1b[1m1. Proposal document\x1b[0m");

  const doc: BlockDocument = {
    ...structuredClone(CHANF_PROPOSAL),
    meta: {
      ...structuredClone(CHANF_PROPOSAL.meta),
      created_at: new Date().toISOString(),
      // Contact details are read from the client record at send time by the
      // dashboard, so updating CHANF's email and CC there is all that is
      // needed: nothing is baked into the document.
      client: { name: client.name, company: client.company, email: client.email, phone: null },
      confidentialFor: client.company ?? client.name,
    },
  };

  const validated = parseBlockDocument(doc);
  if (!validated.ok || !validated.doc) {
    line("   \x1b[31mFAILED validation\x1b[0m");
    for (const e of validated.errors ?? []) line("     " + e);
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("generated_documents")
    .select("id, status")
    .eq("client_id", client.id)
    .eq("reference_code", validated.doc.meta.reference_code)
    .maybeSingle();

  let proposalId: string;
  if (existing) {
    // Never silently overwrite something already sent to a client.
    if (existing.status === "sent" || existing.status === "accepted" || existing.status === "final") {
      warn(`${validated.doc.meta.reference_code} is already ${existing.status}: leaving it untouched.`);
      proposalId = existing.id;
    } else {
      await supabase.from("generated_documents")
        .update({ data: validated.doc, title: validated.doc.meta.title })
        .eq("id", existing.id);
      proposalId = existing.id;
      ok(`updated draft ${validated.doc.meta.reference_code}`);
    }
  } else {
    const { data: created, error } = await supabase.from("generated_documents").insert({
      type: "proposal",
      client_id: client.id,
      title: validated.doc.meta.title,
      reference_code: validated.doc.meta.reference_code,
      data: validated.doc,
      gated: false,
      status: "draft",
      source: "import",
    }).select("id").single();
    if (error) throw error;
    proposalId = created.id;
    ok(`created draft ${validated.doc.meta.reference_code}`);
  }

  const proposalUrl = `${BASE}/api/public/documents/${proposalId}`;
  const total = documentTotal(validated.doc);
  ok(`${validated.doc.sections.length} sections, KES ${total ? fmtMoney(total) : "?"}`);
  if (needsFigureLock(validated.doc)) {
    warn("quotes ranges: figures are confirmed after acceptance, before the agreement");
  }

  // ── Optional preview, to the demo account only ───────────────────────────
  if (PREVIEW) {
    line("\n\x1b[1m2. Preview emails\x1b[0m");
    assertDemoRecipient(DEMO_CLIENT_EMAIL);
    const to = DEMO_CLIENT_EMAIL;

    const { data: intake } = await supabase
      .from("client_intakes").select("*").eq("client_id", client.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (intake) {
      await sendIntakeRecap(intake, { to, editUrl: null, editsRemaining: 0 });
      ok("submission recap");
    } else {
      warn("no intake on file, skipping the recap");
    }

    const summary = chanfCallSummary(proposalUrl);
    await sendCallSummary(summary, { to });
    ok(`call summary: ${summary.agreed.length} agreed, ${summary.neededFromClient.length} needed from them`);

    await transporter.sendMail({
      from: SENDERS.info,
      to,
      subject: `[PREVIEW] Proposal for ${client.company}: ${validated.doc.meta.title}`,
      html: emailTemplate({
        title: "Your proposal",
        subtitle: validated.doc.meta.reference_code,
        preheader: "Preview of the proposal email",
        heroLabel: "Proposal ready",
        heroTitle: "Here is the plan\nwe put together.",
        body:
          emailParagraph(`Hello ${summary.clientName}, following our call, here is the full proposal: what we would do, in what order, over what timeline, and what it would cost.`) +
          emailInfoCard("📄", "Proposal", `${validated.doc.meta.title} (${validated.doc.meta.reference_code})`) +
          (total ? emailInfoCard("💰", "Investment", `KES ${fmtMoney(total)}`) : "") +
          emailInfoCard("🗓️", "Timeline", "6 to 8 weeks, across 3 phases") +
          emailButton("Read the proposal", proposalUrl) +
          emailDivider() +
          emailParagraph("At the end you can accept it, or tell us what needs changing and we will set up a call to work through it. Nothing is committed either way, and the final figure within each phase is confirmed with you before anything is signed.") +
          emailSignoff(),
      }),
      text: `Preview of the CHANF proposal email.\n\nRead it here: ${proposalUrl}`,
    });
    ok(`proposal email, previewed to ${to}`);
    warn("these are previews: nothing was sent to CHANF and nothing was logged against them");
  }

  line("");
  line(`   Ready in Admin > Documents as a draft.`);
  line(`   Update CHANF's email and CC contacts on the client record, then send from there.`);
  line(`   Link: ${proposalUrl}`);
  line("");
}

main().catch((err) => { console.error(err); process.exit(1); });
