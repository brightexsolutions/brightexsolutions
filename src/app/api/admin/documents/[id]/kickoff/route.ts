/**
 * GET  /api/admin/documents/[id]/kickoff   preview what would be created
 * POST /api/admin/documents/[id]/kickoff   create it
 *
 * The step from "signed" to "running": a signed agreement becomes a project,
 * its delivery phases become tasks, and the payment schedule the client chose
 * becomes invoices.
 *
 * GET first, deliberately. Everything is derived, but a wrong date on a project
 * is recoverable while a wrong invoice already sent to a client is a phone call
 * and a dent in trust, so the last step before money moves is a human looking
 * at what is about to happen.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { isBlockDocument, fmtKes } from "@/lib/document-html/blocks";
import { planKickoff, planDates } from "@/lib/document-html/kickoff";

export const dynamic = "force-dynamic";

/** Names the offending field. A bare "Invalid input" sends whoever hits it
 * reading source to work out which one was wrong. */
function invalid(error: z.ZodError): NextResponse {
  const problems = error.issues.map((i) => `${i.path.join(".") || "request"}: ${i.message}`);
  return NextResponse.json({ error: problems.join("; "), problems }, { status: 400 });
}

type Params = { params: Promise<{ id: string }> };

const CreateSchema = z.object({
  /** Overrides, so the review screen can correct anything before committing. */
  projectName: z.string().min(2).max(200).trim().optional(),
  startDate: z.string().optional(),
  /** Issue the first invoice as 'sent' rather than leaving it a draft. */
  issueFirstInvoice: z.boolean().optional().default(true),
});

async function loadAgreement(id: string) {
  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("generated_documents")
    .select("*, clients(id, name, company, email)")
    .eq("id", id)
    .maybeSingle();
  return { supabase, doc };
}

function guard(doc: Record<string, unknown> | null) {
  if (!doc) return { error: "Agreement not found", status: 404 };
  if (doc.type !== "agreement") return { error: "Only a signed agreement can start a project.", status: 400 };
  if (!doc.accepted_at) return { error: "This agreement has not been signed yet.", status: 409 };
  if (!isBlockDocument(doc.data)) {
    return { error: "This agreement predates section-based documents. Create its project manually.", status: 409 };
  }
  return null;
}

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { supabase, doc } = await loadAgreement(id);
  const bad = guard(doc);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });

  const { data: existing } = await supabase
    .from("projects").select("id, name").eq("source_document_id", id).is("deleted_at", null).maybeSingle();

  const client = doc!.clients as unknown as { name?: string; company?: string } | null;
  const plan = planKickoff(doc!.data, {
    startDate: doc!.accepted_at,
    clientLabel: client?.company?.trim() || client?.name || "Client",
  });
  const dated = planDates(plan);

  return NextResponse.json({
    already: existing ?? null,
    plan: {
      project: plan.project,
      tasks: dated.tasks,
      invoices: dated.invoices.map((i) => ({ ...i, amountLabel: `KES ${fmtKes(i.amount)}` })),
      schedule: plan.schedule,
      warnings: plan.warnings,
    },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalid(parsed.error);

  const { supabase, doc } = await loadAgreement(id);
  const bad = guard(doc);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });

  // One project per agreement. A second is a duplicate, not a second project.
  const { data: existing } = await supabase
    .from("projects").select("id, name").eq("source_document_id", id).is("deleted_at", null).maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `A project ("${existing.name}") already exists for this agreement.`, projectId: existing.id },
      { status: 409 }
    );
  }

  const client = doc!.clients as unknown as { id?: string; name?: string; company?: string } | null;
  const plan = planKickoff(doc!.data, {
    startDate: parsed.data.startDate ?? doc!.accepted_at,
    clientLabel: client?.company?.trim() || client?.name || "Client",
  });
  const dated = planDates(plan);

  // ── Project ──────────────────────────────────────────────────────────────
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      client_id: doc!.client_id,
      name: parsed.data.projectName ?? plan.project.name,
      status: "development",
      budget: plan.project.budget,
      start_date: plan.project.startDate,
      end_date: plan.project.endDate,
      notes: plan.project.notes,
      payment_schedule: plan.schedule,
      source_document_id: id,
    })
    .select()
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

  // ── Tasks ────────────────────────────────────────────────────────────────
  const taskRows = dated.tasks.map((t) => ({
    project_id: project.id,
    title: t.title,
    description: t.description,
    status: "todo",
    priority: t.isPaymentMilestone ? "high" : "normal",
    due_date: t.dueDate,
    is_payment_milestone: t.isPaymentMilestone,
  }));

  let createdTasks: { id: string; title: string }[] = [];
  if (taskRows.length > 0) {
    const { data, error } = await supabase.from("tasks").insert(taskRows).select("id, title");
    if (error) console.error("[kickoff] tasks:", error.message);
    createdTasks = data ?? [];
  }

  // ── Invoices, one per payment stage ──────────────────────────────────────
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01`);

  const invoiceRows = dated.invoices.map((inv, i) => ({
    client_id: doc!.client_id,
    project_id: project.id,
    document_id: id,
    invoice_number: `INV-${year}-${String((count ?? 0) + 1 + i).padStart(4, "0")}`,
    items: [{
      description: `${inv.label} (${inv.stage} of ${inv.stageTotal})`,
      qty: 1,
      unit_price: inv.amount,
    }],
    subtotal: inv.amount,
    tax: 0,
    total: inv.amount,
    // Only the stage triggered by signing is issued now. The rest wait for the
    // milestone or date they are contingent on, so a client is never invoiced
    // for work that has not happened.
    status: inv.issueNow && parsed.data.issueFirstInvoice ? "sent" : "draft",
    due_date: inv.dueDate,
    notes: `${doc!.reference_code}: stage ${inv.stage} of ${inv.stageTotal}.`,
    schedule_stage: inv.stage,
    schedule_total: inv.stageTotal,
    schedule_trigger: inv.trigger,
    schedule_trigger_ref:
      inv.gatedByTaskIndex !== undefined ? createdTasks[inv.gatedByTaskIndex]?.id ?? null : null,
  }));

  const { data: createdInvoices, error: invoiceError } = await supabase
    .from("invoices").insert(invoiceRows).select("id, invoice_number, total, status, due_date");
  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });

  await supabase.from("generated_documents").update({ project_id: project.id }).eq("id", id);

  await supabase.from("system_alerts").insert({
    type: "project_started",
    severity: "info",
    message:
      `Project "${project.name}" created from ${doc!.reference_code} with ${createdTasks.length} tasks ` +
      `and ${(createdInvoices ?? []).length} scheduled invoices. First invoice ` +
      `${parsed.data.issueFirstInvoice ? "issued" : "held as a draft"}.`,
    entity_id: project.id,
    entity_type: "project",
  });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "project",
    entity_id: project.id,
    entity_label: project.name,
    notes: `Kick-off from ${doc!.reference_code}. Budget KES ${fmtKes(plan.project.budget)}.`,
  });

  return NextResponse.json(
    {
      project,
      tasks: createdTasks,
      invoices: createdInvoices,
      warnings: plan.warnings,
    },
    { status: 201 }
  );
}
