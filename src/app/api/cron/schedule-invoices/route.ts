/**
 * GET /api/cron/schedule-invoices
 *
 * Issues the payment stages that were created as drafts at kick-off, once the
 * thing they were contingent on has actually happened.
 *
 * Without this, a phased schedule silently stops after the deposit: the later
 * invoices sit as drafts nobody remembers to send, which is the most expensive
 * kind of forgetting there is. With it, completing the milestone task IS the
 * act of invoicing for it.
 *
 * Registered on cron-job.org, like every other cron in this app, not in
 * vercel.json. Suggested cadence: daily.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { sendAdminPush } from "@/lib/push";
import { logSystemAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorised = verifyCronSecret(request);
  if (unauthorised) return unauthorised;

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: pending, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, status, due_date, schedule_stage, schedule_total, schedule_trigger, schedule_trigger_ref, project_id, client_id")
    .eq("status", "draft")
    .not("schedule_trigger", "is", null)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ checked: 0, issued: 0 });
  }

  // Which gating tasks are done, and which projects have finished. Fetched in
  // two queries rather than per invoice.
  const taskIds = pending.map((i) => i.schedule_trigger_ref).filter(Boolean) as string[];
  const projectIds = [...new Set(pending.map((i) => i.project_id).filter(Boolean))] as string[];

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    taskIds.length
      ? supabase.from("tasks").select("id, status, title").in("id", taskIds)
      : Promise.resolve({ data: [] as { id: string; status: string; title: string }[] }),
    projectIds.length
      ? supabase.from("projects").select("id, name, status").in("id", projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string; status: string }[] }),
  ]);

  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const issued: { invoice_number: string; reason: string }[] = [];

  for (const invoice of pending) {
    let due = false;
    let reason = "";

    if (invoice.schedule_trigger === "on_milestone" && invoice.schedule_trigger_ref) {
      const task = taskById.get(invoice.schedule_trigger_ref);
      if (task?.status === "done") { due = true; reason = `milestone "${task.title}" completed`; }
    } else if (invoice.schedule_trigger === "on_completion" && invoice.project_id) {
      const project = projectById.get(invoice.project_id);
      if (project && (project.status === "live" || project.status === "completed")) {
        due = true; reason = `project "${project.name}" completed`;
      }
    } else if (invoice.schedule_trigger === "on_date") {
      if (invoice.due_date && invoice.due_date <= today) { due = true; reason = "scheduled date reached"; }
    }

    if (!due) continue;

    // Issued, not sent. Putting it in the outbox as 'sent' would have the
    // existing reminder and overdue machinery start chasing a client for an
    // invoice no human has looked at. Godwin sends it from the invoices page.
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("[schedule-invoices]", invoice.invoice_number, updateError.message);
      continue;
    }

    issued.push({ invoice_number: invoice.invoice_number, reason });

    await logSystemAction({
      action: "issued_scheduled_invoice",
      entity_type: "invoice",
      entity_id: invoice.id,
      entity_label: invoice.invoice_number,
      notes:
        `Stage ${invoice.schedule_stage} of ${invoice.schedule_total}, ` +
        `KES ${Number(invoice.total).toLocaleString("en-KE")}, released because ${reason}.`,
    });

    await supabase.from("system_alerts").insert({
      type: "scheduled_invoice_due",
      severity: "info",
      message:
        `${invoice.invoice_number} (stage ${invoice.schedule_stage} of ${invoice.schedule_total}, ` +
        `KES ${Number(invoice.total).toLocaleString("en-KE")}) is now due: ${reason}. Ready to send.`,
      entity_id: invoice.id,
      entity_type: "invoice",
    });
  }

  if (issued.length > 0) {
    await sendAdminPush({
      title: issued.length === 1 ? "A scheduled invoice is due" : `${issued.length} scheduled invoices are due`,
      body: issued.map((i) => `${i.invoice_number}: ${i.reason}`).join(". "),
      url: "/admin/invoices",
      tag: "scheduled-invoices",
    });
  }

  return NextResponse.json({ checked: pending.length, issued: issued.length, details: issued });
}
