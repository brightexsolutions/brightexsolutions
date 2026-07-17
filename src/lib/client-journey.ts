import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Compact, factual summary of a client's real state across projects,
 * invoices/payments, and open tasks — grounding for AI document generation
 * so a proposal/agreement never contradicts what's already true (an
 * existing active project, an outstanding balance, etc.). Deterministic:
 * every line comes straight from real rows, nothing here is AI-authored.
 * Returns "" for a client with no history yet (nothing to ground on).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getClientJourneySummary(supabase: SupabaseClient<any, any, any>, clientId: string): Promise<string> {
  const [projectsRes, invoicesRes, docsRes] = await Promise.all([
    supabase.from("projects").select("id, name, status").eq("client_id", clientId).is("deleted_at", null),
    supabase.from("invoices").select("invoice_number, total, status, payments(amount)").eq("client_id", clientId).is("deleted_at", null),
    supabase.from("generated_documents").select("type, reference_code, status").eq("client_id", clientId),
  ]);

  const projects: { id: string; name: string; status: string }[] = projectsRes.data ?? [];
  const invoices: { invoice_number: string; total: number; status: string; payments?: { amount: number }[] }[] = invoicesRes.data ?? [];
  const docs: { type: string; reference_code: string; status: string }[] = docsRes.data ?? [];

  const lines: string[] = [];

  if (projects.length) {
    lines.push(`Existing projects: ${projects.map((p) => `"${p.name}" (${p.status})`).join(", ")}.`);
  }

  const outstanding = invoices
    .filter((inv) => ["sent", "overdue", "partial"].includes(inv.status))
    .map((inv) => {
      const paid = (inv.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Math.max(0, Number(inv.total) - paid);
      return { ...inv, balance };
    })
    .filter((inv) => inv.balance > 0);

  if (outstanding.length) {
    const total = outstanding.reduce((sum, inv) => sum + inv.balance, 0);
    lines.push(`Outstanding balance owed: KES ${total.toLocaleString()} across ${outstanding.length} invoice(s) (${outstanding.map((i) => i.invoice_number).join(", ")}).`);
  }

  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  if (paidInvoices.length) {
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    lines.push(`Total previously paid: KES ${totalPaid.toLocaleString()} across ${paidInvoices.length} settled invoice(s).`);
  }

  if (docs.length) {
    lines.push(`Prior documents on file: ${docs.map((d) => `${d.type} ${d.reference_code} (${d.status})`).join(", ")}.`);
  }

  return lines.join("\n");
}
