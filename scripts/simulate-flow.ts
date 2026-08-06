/**
 * End-to-end simulation of the proposal to signed agreement flow, against the
 * real database and the real mail transport, using the gbrown test client.
 *
 * The client-facing steps are driven over HTTP exactly as a client's browser
 * would drive them, because that is the path that has to work. The one admin
 * step (deriving the agreement) is performed through the same library function
 * the admin route calls, since the route itself is behind a session this script
 * has no way to hold; its guards are covered by scripts/checks/flow.ts instead.
 *
 * Every email goes to the address supplied on the form, and gbrown's
 * client_contacts row copies info.brightexsolutions@gmail.com on everything.
 *
 * Run: npm run simulate:flow
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { deriveAgreement } from "../src/lib/document-html/derive-agreement";
import { parseBlockDocument } from "../src/lib/document-html/block-schema";
import { documentTotal, fmtMoney, needsFigureLock, rangedAmounts } from "../src/lib/document-html/blocks";
import { planKickoff, planDates } from "../src/lib/document-html/kickoff";
import { DEMO_CLIENT_EMAIL, DEMO_CLIENT_NAME, assertDemoRecipient } from "./demo-target";
import type { PaymentSchedule } from "../src/lib/document-html/blocks";

const BASE = process.env.SIM_BASE_URL ?? "http://localhost:3000";
// Emails go TO the client, exactly as they would in life. Brightex is copied
// through gbrown's client_contacts row (cc_scopes = ['all']), which is the same
// routing a real client's finance or director contact would use: worth
// exercising rather than bypassing by mailing ourselves directly.
const TEST_CLIENT_EMAIL = DEMO_CLIENT_EMAIL;
const SIGNER_EMAIL = TEST_CLIENT_EMAIL;
const SIGNER_NAME = DEMO_CLIENT_NAME;

let step = 0;
let failures = 0;
const line = (s = "") => console.log(s);
function heading(text: string) { line(); line(`[1m${++step}. ${text}[0m`); }
function ok(text: string) { line(`   [32mok[0m    ${text}`); }
function bad(text: string) { failures++; line(`   [31mFAIL[0m  ${text}`); }
function check(cond: boolean, text: string, detail = "") {
  if (cond) ok(text);
  else bad(`${text}${detail ? "  :: " + detail : ""}`);
}

/**
 * A photograph of a signature on paper, generated rather than hardcoded.
 *
 * The point is to exercise the real thing: an off-white page (not pure white,
 * as a photo never is) carrying a dark stroke. A hand-written base64 blob is
 * both unreadable and easy to get wrong, which is exactly what happened the
 * first time this ran.
 */
async function paperSignaturePng(): Promise<string> {
  const w = 420, h = 140;
  const px = Buffer.alloc(w * h * 3);

  // Slightly warm, slightly uneven paper.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const shade = 232 + ((x * 7 + y * 13) % 12);
      px[i] = shade; px[i + 1] = shade - 2; px[i + 2] = shade - 6;
    }
  }

  // A stroke with some thickness and curvature, so trimming and the ink ratio
  // both have something real to measure.
  const ink = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3;
    px[i] = 28; px[i + 1] = 32; px[i + 2] = 48;
  };
  for (let x = 40; x < w - 40; x++) {
    const y = Math.round(h / 2 + Math.sin((x - 40) / 26) * 30 - (x - 40) * 0.05);
    for (let t = -3; t <= 3; t++) { ink(x, y + t); ink(x + 1, y + t); }
  }
  for (let y = 40; y < 110; y++) {
    const x = 120 + Math.round((y - 40) * 0.35);
    ink(x, y);
    ink(x + 1, y);
  }

  const png = await sharp(px, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** A photo of a blank sheet: processes without error, contains no signature. */
async function blankPaperPng(): Promise<string> {
  const png = await sharp({ create: { width: 300, height: 100, channels: 3, background: "#f4f2ee" } })
    .png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function json(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text.slice(0, 300) }; }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  line("[1m[36mBRIGHTEX DOCUMENT FLOW SIMULATION[0m");
  line(`   base: ${BASE}`);
  assertDemoRecipient(SIGNER_EMAIL);
  line(`   signer: ${SIGNER_EMAIL}`);

  // ── Locate the seeded demo proposal ──────────────────────────────────────
  heading("Demo proposal");
  const { data: client } = await supabase
    .from("clients").select("id, name, email").eq("email", TEST_CLIENT_EMAIL).is("deleted_at", null).maybeSingle();
  if (!client) throw new Error("Test client not found. Run npm run seed:demo-proposal first.");

  const { data: proposal } = await supabase
    .from("generated_documents")
    .select("*")
    .eq("client_id", client.id)
    .like("reference_code", "DEMO-PROP-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!proposal) throw new Error("No demo proposal found. Run npm run seed:demo-proposal.");

  ok(`${proposal.reference_code} for ${client.name}`);
  const total = documentTotal(proposal.data);
  ok(`quoted ${total ? "KES " + fmtMoney(total) : "?"}, ${rangedAmounts(proposal.data).length} ranged lines`);

  // Reset lifecycle so a re-run starts clean rather than tripping the
  // already-accepted guards.
  await supabase.from("generated_documents").update({
    accepted_at: null, accepted_by_name: null, accepted_by_email: null, accepted_by_role: null,
    accepted_notes: null, chosen_schedule: null, changes_requested_at: null,
    changes_requested_by: null, changes_requested_note: null, status: "draft",
  }).eq("id", proposal.id);
  await supabase.from("generated_documents").delete().eq("source_document_id", proposal.id).eq("type", "agreement");

  const publicUrl = `${BASE}/api/public/documents/${proposal.id}`;

  // ── The client opens the link ────────────────────────────────────────────
  heading("Client opens the proposal link");
  const viewRes = await fetch(publicUrl);
  const html = await viewRes.text();
  check(viewRes.status === 200, "link returns the document", String(viewRes.status));
  check(html.includes("brxAcceptProposal"), "accept control is offered");
  check(html.includes("brxRequestChanges"), "request-changes control is offered");
  check(!html.includes('name="brxSched"'), "payment terms are stated, not offered as a choice");
  check(html.includes("sched-fixed"), "the stated terms are shown before accepting");
  check(!html.includes("—"), "no em dashes in what the client sees");
  check(/@page\{size:A4/.test(html), "prints to A4");
  check(!/@media\s*\(max-width:720px\)/.test(html), "no unscoped breakpoint leaking into print");
  check(html.includes('onclick="window.print()"'), "download button is live");

  const { data: afterView } = await supabase
    .from("generated_documents").select("first_viewed_at, view_count").eq("id", proposal.id).maybeSingle();
  check(!!afterView?.first_viewed_at, "read receipt recorded", JSON.stringify(afterView));

  // ── The client asks for changes ──────────────────────────────────────────
  heading("Client requests changes (notify only)");
  const changeRes = await fetch(`${publicUrl}/request-changes`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: SIGNER_NAME, email: SIGNER_EMAIL,
      message: "This looks good overall. Could we start after the November intake, and could Phase 3 wait until the new year? Also please confirm whether the hosting cost is annual or monthly.",
    }),
  });
  const changeBody = await json(changeRes);
  check(changeRes.status === 200, "request accepted", JSON.stringify(changeBody).slice(0, 160));

  const { data: afterChange } = await supabase
    .from("generated_documents")
    .select("changes_requested_at, changes_requested_by, changes_requested_note")
    .eq("id", proposal.id).maybeSingle();
  check(!!afterChange?.changes_requested_at, "recorded against the document");
  check((afterChange?.changes_requested_note ?? "").includes("November intake"), "the client's own words are kept");
  ok("emails sent: full note to Brightex, acknowledgement to the client");

  // ── The client accepts ───────────────────────────────────────────────────
  heading("Client accepts on the stated 60/40 terms");
  const acceptRes = await fetch(`${publicUrl}/accept-proposal`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: SIGNER_NAME, role: "Director", email: SIGNER_EMAIL,
      notes: "Happy to proceed.",
    }),
  });
  const acceptBody = await json(acceptRes);
  check(acceptRes.status === 200, "acceptance recorded", JSON.stringify(acceptBody).slice(0, 160));
  check(acceptBody.pending_figures === true, "flagged that figures still need confirming");

  const { data: accepted } = await supabase
    .from("generated_documents")
    .select("accepted_at, accepted_by_name, accepted_by_role, accepted_notes, chosen_schedule, status")
    .eq("id", proposal.id).maybeSingle();
  check(!!accepted?.accepted_at, "acceptance timestamped");
  check(accepted?.accepted_by_role === "Director", "role captured", String(accepted?.accepted_by_role));
  check(accepted?.status === "accepted", "status is accepted, not final", String(accepted?.status));
  const chosen = accepted?.chosen_schedule as PaymentSchedule | null;
  // Recorded, not chosen: the client is never offered payment options.
  check(chosen?.stages?.length === 2, "the stated schedule was recorded on acceptance",
    JSON.stringify(chosen?.stages?.map((s) => s.percent)));
  check(chosen?.stages?.[0]?.percent === 60, "the house 60/40 terms applied",
    String(chosen?.stages?.[0]?.percent));
  ok("emails sent: confirmation to the client, alert and push to Brightex");

  // Accepting twice must be idempotent, not a second acceptance.
  const twice = await json(await fetch(`${publicUrl}/accept-proposal`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: SIGNER_NAME, role: "Director", email: SIGNER_EMAIL }),
  }));
  check(twice.already === true, "accepting twice is idempotent");

  // ── Godwin pins the figures and derives the agreement ────────────────────
  heading("Brightex confirms figures and derives the agreement");
  check(needsFigureLock(proposal.data), "derivation is blocked until figures are pinned");
  const blocked = deriveAgreement(proposal.data, {
    referenceCode: "AGR-SIM-000", schedule: chosen!, brightexSignatory: { name: "Godwin Ochieng", title: "Lead at Brightex Solutions" },
  });
  check(!blocked.ok, "unpinned derivation refused", blocked.error?.slice(0, 90) ?? "");

  const LOCKED = [
    { blockId: "inv-table", rowIndex: 0, amount: 18000 },
    { blockId: "inv-table", rowIndex: 1, amount: 130000 },
    { blockId: "inv-table", rowIndex: 2, amount: 32000 },
  ];
  const signatory = { name: "Godwin Ochieng", title: "Lead at Brightex Solutions" };
  const year = new Date().getFullYear();
  const { count } = await supabase.from("generated_documents")
    .select("id", { count: "exact", head: true }).eq("type", "agreement").gte("created_at", `${year}-01-01`);
  const agrRef = `AGR-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const derived = deriveAgreement(proposal.data, {
    referenceCode: agrRef, schedule: chosen!, locked: LOCKED, brightexSignatory: signatory,
  });
  check(derived.ok, "agreement derived", derived.error ?? "");
  check(derived.total?.min === 180000, "contract total is the pinned sum", String(derived.total?.min));

  const validated = parseBlockDocument(derived.doc);
  check(validated.ok, "derived agreement passes validation", (validated.errors ?? []).join(" | "));

  const { data: agreement, error: agrError } = await supabase.from("generated_documents").insert({
    type: "agreement", client_id: proposal.client_id,
    title: validated.doc!.meta.title, reference_code: agrRef, data: validated.doc,
    gated: false, status: "draft", source: "derived", source_document_id: proposal.id,
    chosen_schedule: chosen,
  }).select().single();
  if (agrError) throw agrError;
  ok(`${agrRef} created and linked to ${proposal.reference_code}`);

  await supabase.from("generated_documents").update({
    locked_figures: LOCKED, figures_locked_at: new Date().toISOString(),
  }).eq("id", proposal.id);

  const { error: csError } = await supabase.from("document_signatures").insert({
    document_id: agreement.id, party: "brightex",
    signer_name: signatory.name, signer_title: signatory.title, method: "typed",
  });
  check(!csError, "Brightex countersignature stamped at creation", csError?.message ?? "");

  // ── The client opens and signs the agreement ─────────────────────────────
  heading("Client opens the agreement");
  const agrUrl = `${BASE}/api/public/documents/${agreement.id}`;
  const agrHtml = await (await fetch(agrUrl)).text();
  check(agrHtml.includes("brxSignAgreement"), "signing control offered");
  check(agrHtml.includes("Already signed by Godwin Ochieng"), "client can see we already signed");
  check(agrHtml.includes("dl-btn-locked"), "unsigned agreement is not downloadable");
  check((agrHtml.match(/data-term="/g) ?? []).length === 6, "six terms confirmed individually",
    String((agrHtml.match(/data-term="/g) ?? []).length));
  check(agrHtml.includes("40% on signature"), "the term names the schedule they chose");
  check(agrHtml.includes("KES 180,000"), "contract value shown");
  check(!agrHtml.includes("Ongoing Partnership"), "retainer tiers absent from the contract");

  heading("Signature background removal");
  const previewRes = await fetch(`${agrUrl}/signature-preview`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: await paperSignaturePng() }),
  });
  const preview = await json(previewRes);
  check(previewRes.status === 200, "photo processed", JSON.stringify(preview).slice(0, 140));
  check(typeof preview.image === "string" && preview.image.startsWith("data:image/png"), "returns a transparent PNG preview");

  const blankRes = await fetch(`${agrUrl}/signature-preview`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: await blankPaperPng() }),
  });
  check(blankRes.status === 422, "a blank image is refused", String(blankRes.status));

  heading("Client signs");
  const terms = [
    { key: "payment_schedule", label: "I agree to the payment schedule" },
    { key: "scope", label: "I have read the scope of work" },
    { key: "timeline", label: "I understand the timeline runs from the first payment" },
    { key: "ip", label: "Ownership transfers on full payment" },
    { key: "cancellation", label: "14 days notice, deposit non-refundable once started" },
    { key: "authority", label: "I have authority to sign" },
  ];
  const signRes = await fetch(`${agrUrl}/sign`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: SIGNER_NAME, title: "Director", email: SIGNER_EMAIL,
      entity: "Demo Client Ltd", method: "upload", image: await paperSignaturePng(), terms,
    }),
  });
  const signBody = await json(signRes);
  check(signRes.status === 200, "signature accepted", JSON.stringify(signBody).slice(0, 160));

  const { data: sigRow } = await supabase
    .from("document_signatures")
    .select("party, signer_name, signer_title, entity, method, image_path, terms_accepted, ip")
    .eq("document_id", agreement.id).eq("party", "client").maybeSingle();
  check(!!sigRow, "evidence row written");
  check(sigRow?.entity === "Demo Client Ltd", "binding entity recorded", String(sigRow?.entity));
  check(Array.isArray(sigRow?.terms_accepted) && sigRow!.terms_accepted.length === 6,
    "all six confirmations stored with timestamps");
  check(!!sigRow?.image_path, "signature image stored privately", String(sigRow?.image_path));

  const { data: signedDoc } = await supabase
    .from("generated_documents").select("status, accepted_at, accepted_by_name").eq("id", agreement.id).maybeSingle();
  check(signedDoc?.status === "final", "agreement is final", String(signedDoc?.status));

  const signedHtml = await (await fetch(agrUrl)).text();
  check(!signedHtml.includes("brxSignAgreement"), "signing control gone once signed");
  check(signedHtml.includes('onclick="window.print()"'), "signed agreement IS downloadable");
  ok("emails sent: signed copy to the client, alert and push to Brightex");

  // ── Kick-off: the signed agreement becomes real work ─────────────────────
  heading("Kick-off: project, tasks and invoice stages");
  const { data: signedAgreement } = await supabase
    .from("generated_documents").select("*").eq("id", agreement.id).maybeSingle();

  const plan = planKickoff(signedAgreement!.data, {
    startDate: signedAgreement!.accepted_at,
    clientLabel: client.name,
  });
  const dated = planDates(plan);

  check(plan.warnings.length === 0, "plan has no warnings", plan.warnings.join(" | "));
  check(plan.project.budget === 180000, "project budget is the contract total", String(plan.project.budget));
  check(plan.tasks.length === 3, "one task per delivery phase", String(plan.tasks.length));
  check(plan.invoices.length === 2, "one invoice per payment stage", String(plan.invoices.length));

  const invoiceSum = plan.invoices.reduce((n, i) => n + i.amount, 0);
  check(invoiceSum === 180000, "invoices sum exactly to the contract", String(invoiceSum));
  check(plan.invoices.filter((i) => i.issueNow).length === 1,
    "only the deposit is billed now; the rest wait for their trigger");
  // With 60/40 there is no mid-project milestone stage, so no task gates a payment.
  check(!plan.tasks.some((t) => t.isPaymentMilestone),
    "60/40 has no mid-project milestone, so no task gates a payment");

  for (const inv of dated.invoices) {
    line(`   · stage ${inv.stage}/${inv.stageTotal}  KES ${inv.amount.toLocaleString("en-KE")}  ${inv.trigger}  due ${inv.dueDate}  ${inv.issueNow ? "[issue now]" : "[draft]"}`);
  }
  for (const t of dated.tasks) {
    line(`   · task: ${t.title}  due ${t.dueDate ?? "no date"}${t.isPaymentMilestone ? "  [payment milestone]" : ""}`);
  }

  // Write it, the same shape the kickoff route writes.
  await supabase.from("projects").delete().eq("source_document_id", agreement.id);

  const { data: project, error: projErr } = await supabase.from("projects").insert({
    client_id: signedAgreement!.client_id,
    name: plan.project.name,
    status: "development",
    budget: plan.project.budget,
    start_date: plan.project.startDate,
    end_date: plan.project.endDate,
    notes: plan.project.notes,
    payment_schedule: plan.schedule,
    source_document_id: agreement.id,
  }).select().single();
  check(!projErr, "project created", projErr?.message ?? "");
  if (projErr) throw projErr;

  const { data: createdTasks, error: taskErr } = await supabase.from("tasks").insert(
    dated.tasks.map((t) => ({
      project_id: project.id, title: t.title, description: t.description,
      status: "todo", priority: t.isPaymentMilestone ? "high" : "normal",
      due_date: t.dueDate, is_payment_milestone: t.isPaymentMilestone,
    }))
  ).select("id, title");
  check(!taskErr && (createdTasks ?? []).length === 3, "tasks created", taskErr?.message ?? "");

  const year2 = new Date().getFullYear();
  const { count: invCount } = await supabase
    .from("invoices").select("id", { count: "exact", head: true }).gte("created_at", `${year2}-01-01`);

  const { data: createdInvoices, error: invErr } = await supabase.from("invoices").insert(
    dated.invoices.map((inv, i) => ({
      client_id: signedAgreement!.client_id, project_id: project.id, document_id: agreement.id,
      invoice_number: `INV-${year2}-${String((invCount ?? 0) + 1 + i).padStart(4, "0")}`,
      items: [{ description: `${inv.label} (${inv.stage} of ${inv.stageTotal})`, qty: 1, unit_price: inv.amount }],
      subtotal: inv.amount, tax: 0, total: inv.amount,
      status: inv.issueNow ? "sent" : "draft",
      due_date: inv.dueDate,
      notes: `${signedAgreement!.reference_code}: stage ${inv.stage} of ${inv.stageTotal}.`,
      schedule_stage: inv.stage, schedule_total: inv.stageTotal, schedule_trigger: inv.trigger,
      schedule_trigger_ref: inv.gatedByTaskIndex !== undefined ? (createdTasks ?? [])[inv.gatedByTaskIndex]?.id ?? null : null,
    }))
  ).select("id, invoice_number, total, status, schedule_stage, schedule_trigger");
  check(!invErr && (createdInvoices ?? []).length === 2, "invoices created", invErr?.message ?? "");

  const dbSum = (createdInvoices ?? []).reduce((n, i) => n + Number(i.total), 0);
  check(dbSum === 180000, "invoices in the database sum to the contract", String(dbSum));
  check((createdInvoices ?? []).filter((i) => i.status === "sent").length === 1,
    "exactly one invoice is live; the balance waits for completion");

  // ── The completion stage is released by the cron ────────────────────────
  heading("Completion: the balance invoice is released");
  await supabase.from("projects").update({ status: "live" }).eq("id", project.id);
  ok("marked the project live");

  const cronRes = await fetch(`${BASE}/api/cron/schedule-invoices`, {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  const cronBody = await json(cronRes);
  check(cronRes.status === 200, "cron ran", JSON.stringify(cronBody).slice(0, 200));
  check(cronBody.issued >= 1, "the balance invoice was released", JSON.stringify(cronBody.details ?? cronBody));

  const { data: nowLive } = await supabase
    .from("invoices").select("invoice_number, status, schedule_stage")
    .eq("project_id", project.id).order("schedule_stage");
  for (const i of nowLive ?? []) line(`   · ${i.invoice_number}  stage ${i.schedule_stage}  ${i.status}`);
  check((nowLive ?? []).filter((i) => i.status === "sent").length === 2,
    "both invoices now live");

  // ── What Godwin will see ─────────────────────────────────────────────────
  heading("Trail");
  const { data: comms } = await supabase
    .from("communications").select("subject, direction, cc_emails")
    .in("document_id", [proposal.id, agreement.id]).order("sent_at", { ascending: true });
  for (const c of comms ?? []) line(`   · [${c.direction}] ${c.subject}`);
  check((comms ?? []).length >= 3, "communications logged", String((comms ?? []).length));

  const { data: alerts } = await supabase
    .from("system_alerts").select("type, severity")
    .in("entity_id", [proposal.id, agreement.id]).order("created_at", { ascending: true });
  for (const a of alerts ?? []) line(`   · alert: ${a.type} (${a.severity})`);
  check((alerts ?? []).length >= 3, "alerts raised", String((alerts ?? []).length));

  line();
  line(`   Proposal : ${publicUrl}`);
  line(`   Agreement: ${agrUrl}`);
  line();
  line(failures === 0
    ? "[1m[32mSIMULATION PASSED[0m"
    : `[1m[31mSIMULATION: ${failures} CHECK(S) FAILED[0m`);
  line();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
