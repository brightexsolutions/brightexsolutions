/**
 * Grounded "what needs attention" candidates — shared between
 * /api/admin/suggested-actions and the admin assistant chat, so both
 * surfaces reason about the exact same real data instead of drifting.
 * Every candidate is built deterministically from real rows; nothing here
 * is AI-generated, so a caller can safely hand this list to an AI to
 * prioritise/narrate without risking a hallucinated entity or link.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Urgency = "high" | "medium" | "low";
export type DraftKind = "invoice_reminder" | "lead_followup" | "client_checkin";

export interface ActionCandidate {
  id: string;
  type: "overdue_invoice" | "stale_lead" | "overdue_task" | "quiet_client" | "stuck_project" | "unresolved_alert" | "content_opportunity";
  title: string;
  detail: string;
  href: string;
  urgency: Urgency;
  /** Present when a client email is draftable for this candidate — see /api/admin/pending-actions. */
  draft?: { kind: DraftKind; clientId: string; invoiceId?: string; saleId?: string };
}

const DAY_MS = 86400000;
export const urgencyRank: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActionCandidates(supabase: SupabaseClient<any, any, any>): Promise<ActionCandidate[]> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleLeadCutoff = new Date(now - 14 * DAY_MS).toISOString();
  const quietClientCutoff = new Date(now - 30 * DAY_MS).toISOString();
  const stuckProjectCutoff = new Date(now - 30 * DAY_MS).toISOString();

  const recentlyLiveCutoff = new Date(now - 21 * DAY_MS).toISOString().slice(0, 10);

  const [invoicesRes, salesRes, tasksRes, clientsRes, projectsRes, alertsRes, recentLiveRes] = await Promise.all([
    supabase.from("invoices")
      .select("id, invoice_number, total, status, due_date, clients(id, name), payments(amount)")
      .in("status", ["sent", "overdue", "partial"])
      .is("deleted_at", null),
    supabase.from("sales")
      .select("id, service, estimated_value, status, created_at, clients(id, name)")
      .in("status", ["lead", "proposal", "negotiation"])
      .lt("created_at", staleLeadCutoff),
    supabase.from("tasks")
      .select("id, title, due_date, status, priority, projects(id, name)")
      .neq("status", "done")
      .not("due_date", "is", null)
      .lt("due_date", nowIso),
    supabase.from("clients")
      .select("id, name, last_contacted_at, classification")
      .eq("classification", "active")
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${quietClientCutoff}`),
    supabase.from("projects")
      .select("id, name, status, start_date, clients(id, name)")
      .neq("status", "live")
      .lt("start_date", stuckProjectCutoff),
    supabase.from("system_alerts")
      .select("id, type, severity, message, entity_type")
      .eq("acknowledged", false)
      .in("severity", ["critical", "warning"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("projects")
      .select("id, name, end_date, clients(id, name)")
      .eq("status", "live")
      .not("end_date", "is", null)
      .gte("end_date", recentlyLiveCutoff),
  ]);

  const candidates: ActionCandidate[] = [];

  for (const inv of invoicesRes.data ?? []) {
    const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
    const overdue = inv.status === "overdue" || (inv.due_date && new Date(inv.due_date).getTime() < now);
    if (!overdue) continue;
    // Flag what's actually still owed, not the invoice's original total — a
    // partially-paid invoice must never be reported as fully outstanding.
    const paidToDate = (inv.payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
    const outstanding = Math.max(0, Number(inv.total) - paidToDate);
    if (outstanding <= 0) continue; // fully paid despite a stale status — nothing to chase
    candidates.push({
      id: `invoice:${inv.id}`,
      type: "overdue_invoice",
      title: `Follow up on invoice ${inv.invoice_number}`,
      detail: `${client?.name ?? "Client"} — KES ${outstanding.toLocaleString()} outstanding${paidToDate > 0 ? ` (of KES ${Number(inv.total).toLocaleString()} total)` : ""}${inv.due_date ? `, due ${new Date(inv.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}` : ""}.`,
      href: "/admin/invoices",
      urgency: "high",
      draft: client?.id ? { kind: "invoice_reminder", clientId: client.id, invoiceId: inv.id } : undefined,
    });
  }

  for (const lead of salesRes.data ?? []) {
    const client = Array.isArray(lead.clients) ? lead.clients[0] : lead.clients;
    const daysOld = Math.floor((now - new Date(lead.created_at).getTime()) / DAY_MS);
    candidates.push({
      id: `sale:${lead.id}`,
      type: "stale_lead",
      title: `Re-engage lead: ${client?.name ?? lead.service ?? "Prospect"}`,
      detail: `${lead.service ?? "Opportunity"} has been "${lead.status}" for ${daysOld} days with no recorded movement.`,
      href: "/admin/sales",
      urgency: "medium",
      draft: client?.id ? { kind: "lead_followup", clientId: client.id, saleId: lead.id } : undefined,
    });
  }

  for (const task of tasksRes.data ?? []) {
    const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
    const daysOverdue = Math.floor((now - new Date(task.due_date).getTime()) / DAY_MS);
    candidates.push({
      id: `task:${task.id}`,
      type: "overdue_task",
      title: `Overdue task: ${task.title}`,
      detail: `${project?.name ?? "Project"} — ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue (${task.priority} priority).`,
      href: "/admin/tasks",
      urgency: task.priority === "high" ? "high" : "medium",
    });
  }

  for (const client of clientsRes.data ?? []) {
    const daysQuiet = client.last_contacted_at
      ? Math.floor((now - new Date(client.last_contacted_at).getTime()) / DAY_MS)
      : null;
    candidates.push({
      id: `client:${client.id}`,
      type: "quiet_client",
      title: `Check in with ${client.name}`,
      detail: daysQuiet ? `No contact in ${daysQuiet} days — still marked active.` : "No contact on record — still marked active.",
      href: `/admin/clients?id=${client.id}`,
      urgency: "low",
      draft: { kind: "client_checkin", clientId: client.id },
    });
  }

  for (const project of projectsRes.data ?? []) {
    const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
    const daysInStatus = project.start_date ? Math.floor((now - new Date(project.start_date).getTime()) / DAY_MS) : null;
    candidates.push({
      id: `project:${project.id}`,
      type: "stuck_project",
      title: `Unblock project: ${project.name}`,
      detail: `${client?.name ?? "Client"} — still "${project.status}"${daysInStatus ? ` after ${daysInStatus} days` : ""}.`,
      href: "/admin/projects",
      urgency: "medium",
    });
  }

  for (const alert of alertsRes.data ?? []) {
    candidates.push({
      id: `alert:${alert.id}`,
      type: "unresolved_alert",
      title: `Resolve: ${alert.type.replace(/_/g, " ")}`,
      detail: alert.message,
      href: "/admin/settings",
      urgency: alert.severity === "critical" ? "high" : "medium",
    });
  }

  for (const project of recentLiveRes.data ?? []) {
    const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
    candidates.push({
      id: `content:${project.id}`,
      type: "content_opportunity",
      title: `Post about newly launched: ${project.name}`,
      detail: `${client?.name ?? "Client"} project went live ${new Date(project.end_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} — worth a social post if not already covered.`,
      href: "/admin/social",
      urgency: "low",
    });
  }

  candidates.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
  return candidates;
}
