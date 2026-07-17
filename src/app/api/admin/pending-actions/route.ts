/**
 * Human-in-the-loop AI action queue.
 *   GET  — list pending (or all) actions
 *   POST — draft a new one (AI-first, rule-based fallback) from a suggested-actions candidate
 * Nothing here ever sends anything — see [id]/route.ts PATCH for the explicit
 * approve step, which is the only path that actually emails a client.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { callAI, ADMIN_SYSTEM_PROMPT, AI_MODELS, isAIAvailable, GeminiRateLimitedError } from "@/lib/ai";
import { recordAiFailure, recordAiRecovery } from "@/lib/ai-monitor";
import type { AIProvider } from "@/types";

const DraftSchema = z.object({
  kind: z.enum(["invoice_reminder", "lead_followup", "client_checkin"]),
  clientId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  let query = supabase.from("pending_ai_actions").select("*, clients(id, name, company, email)").order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = DraftSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  const payload = result.data;

  const supabase = createAdminClient();
  const { data: client } = await supabase.from("clients").select("id, name, company, email").eq("id", payload.clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  let title = "";
  let rationale = "";
  let ruleSubject = "";
  let ruleBody = "";
  let userPrompt = "";
  let invoiceId: string | null = null;
  let saleId: string | null = null;

  if (payload.kind === "invoice_reminder") {
    if (!payload.invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    const { data: invoice } = await supabase.from("invoices").select("id, invoice_number, total, due_date, payments(amount)").eq("id", payload.invoiceId).maybeSingle();
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    invoiceId = invoice.id;
    const daysOverdue = invoice.due_date ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)) : 0;
    // Remind for what's actually still owed, not the invoice's original total — a
    // partially-paid invoice must never ask the client to pay the full amount again.
    const paidToDate = (invoice.payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
    const outstanding = Math.max(0, Number(invoice.total) - paidToDate);
    const totalStr = `KES ${outstanding.toLocaleString()}`;
    title = `Payment reminder — Invoice ${invoice.invoice_number}`;
    rationale = `${client.name} — invoice ${invoice.invoice_number} is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue (KES ${outstanding.toLocaleString()} outstanding).`;
    ruleSubject = `Payment reminder — Invoice ${invoice.invoice_number}`;
    ruleBody = `Hi ${client.name.split(" ")[0]},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} has an outstanding balance of ${totalStr}${paidToDate > 0 ? ` (KES ${paidToDate.toLocaleString()} already received, thank you)` : ""}, and is ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : "now due"}.\n\nPlease arrange payment at your earliest convenience, or reply if there's anything to discuss.\n\n— The Brightex Team`;
    const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "not on file";
    userPrompt = `Write a firm but professional payment reminder email. Only reference facts given below — never invent or ask the reader to fill in a placeholder.\n\nClient: ${client.name}\nInvoice: ${invoice.invoice_number}\nOutstanding balance owed: ${totalStr}${paidToDate > 0 ? ` (KES ${paidToDate.toLocaleString()} already paid toward the original KES ${Number(invoice.total).toLocaleString()} total — only ask for the outstanding balance, never the original total)` : ""}\nOriginal due date: ${dueDateStr}\nDays overdue: ${daysOverdue}\n\nKeep it respectful but clear. Sign off as "The Brightex Solutions Team". Write only the email body.`;
  } else if (payload.kind === "lead_followup") {
    if (!payload.saleId) return NextResponse.json({ error: "saleId required" }, { status: 400 });
    const { data: sale } = await supabase.from("sales").select("id, service, status, created_at").eq("id", payload.saleId).maybeSingle();
    if (!sale) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    saleId = sale.id;
    const daysOld = Math.floor((Date.now() - new Date(sale.created_at).getTime()) / 86400000);
    title = `Re-engage lead: ${client.name}`;
    rationale = `${sale.service ?? "Opportunity"} has been "${sale.status}" for ${daysOld} days.`;
    ruleSubject = `Following up — ${sale.service ?? "your project"}`;
    ruleBody = `Hi ${client.name.split(" ")[0]},\n\nJust checking in on ${sale.service ?? "the project we discussed"} — happy to answer any questions or pick things back up whenever suits you.\n\n— The Brightex Team`;
    userPrompt = `Draft a warm, brief re-engagement email to a lead who has gone quiet.\n\nClient: ${client.name}\nOpportunity: ${sale.service ?? "a project"}\nStatus: ${sale.status}, no movement in ${daysOld} days\n\nTone: warm, low-pressure. Write only the email body, sign off as "The Brightex Solutions Team".`;
  } else {
    title = `Check in with ${client.name}`;
    rationale = "No recent contact on record — still marked as an active client.";
    ruleSubject = "Checking in";
    ruleBody = `Hi ${client.name.split(" ")[0]},\n\nIt's been a little while — just checking in to see how things are going and whether there's anything we can help with.\n\n— The Brightex Team`;
    userPrompt = `Draft a warm, brief check-in email to an active client we haven't spoken to in a while, with no specific agenda beyond staying in touch.\n\nClient: ${client.name}\n\nWrite only the email body, sign off as "The Brightex Solutions Team".`;
  }

  const { data: settingsRows } = await supabase.from("settings").select("key, value").in("key", ["ai_enabled", "ai_provider", "ai_model"]);
  const settingsMap: Record<string, string> = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const aiEnabled = settingsMap.ai_enabled !== "false";
  const aiProvider: AIProvider = (settingsMap.ai_provider as AIProvider) ?? "anthropic";
  const aiModel: string = settingsMap.ai_model ?? AI_MODELS.haiku;

  let draftBody = ruleBody;
  let source: "ai" | "rule-based" = "rule-based";

  if (aiEnabled && isAIAvailable(aiProvider)) {
    try {
      draftBody = await callAI({ messages: [{ role: "user", content: userPrompt }], system: ADMIN_SYSTEM_PROMPT, model: aiModel, maxTokens: 350, provider: aiProvider, feature: `pending_action:${payload.kind}` });
      source = "ai";
      void recordAiRecovery();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!(err instanceof GeminiRateLimitedError)) {
        void recordAiFailure({ route: "/api/admin/pending-actions", intent: payload.kind, provider: aiProvider, reason: errorMessage });
      }
      // falls through to rule-based draftBody already set above
    }
  }

  const { data: saved, error } = await supabase
    .from("pending_ai_actions")
    .insert({
      kind: payload.kind,
      status: "pending",
      client_id: client.id,
      invoice_id: invoiceId,
      sale_id: saleId,
      title,
      rationale,
      draft_subject: ruleSubject,
      draft_body: draftBody,
      sender: "info",
      created_by: user.id,
    })
    .select("*, clients(id, name, company, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: saved, source }, { status: 201 });
}
