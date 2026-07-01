import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logSystemAction } from "@/lib/audit";

const STALE_DAYS = 7;

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, client_id, clients(name)")
    .eq("status", "draft")
    .lt("created_at", staleCutoff)
    .is("deleted_at", null);

  if (!staleInvoices?.length) {
    return NextResponse.json({ status: "ok", alerts_created: 0 });
  }

  let alertsCreated = 0;
  for (const invoice of staleInvoices) {
    const client = invoice.clients as { name?: string } | null;

    // Deduplicate — only create alert if none exists for this invoice
    const { count } = await supabase
      .from("system_alerts")
      .select("*", { count: "exact", head: true })
      .eq("entity_id", invoice.id)
      .eq("type", "stale_invoice")
      .eq("acknowledged", false);

    if ((count ?? 0) === 0) {
      const inv = invoice as unknown as { created_at: string };
      const daysStale = Math.floor((Date.now() - new Date(inv.created_at).getTime()) / 86400000);

      await supabase.from("system_alerts").insert({
        type: "stale_invoice",
        severity: daysStale >= 14 ? "warning" : "info",
        message: `Invoice ${invoice.invoice_number ?? invoice.id} for ${client?.name ?? "unknown client"} has been in draft for ${daysStale} day${daysStale !== 1 ? "s" : ""} — KES ${Number(invoice.total).toLocaleString("en-KE")}`,
        entity_id: invoice.id,
        entity_type: "invoice",
      });

      await logSystemAction({
        action: "stale_alert_created",
        entity_type: "invoice",
        entity_id: invoice.id,
        entity_label: invoice.invoice_number ?? invoice.id,
        notes: `Draft invoice unsent for ${daysStale} day${daysStale !== 1 ? "s" : ""}`,
      });

      alertsCreated++;
    }
  }

  return NextResponse.json({ status: "ok", alerts_created: alertsCreated, timestamp: new Date().toISOString() });
}
