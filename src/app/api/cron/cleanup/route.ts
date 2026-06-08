import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const stats: Record<string, number> = {};

  // Archive old replied contacts (> 90 days)
  const contact90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: archivedContacts } = await supabase
    .from("contacts")
    .update({ status: "archived" })
    .eq("status", "replied")
    .lt("created_at", contact90d)
    .select("id");
  stats.contacts_archived = archivedContacts?.length ?? 0;

  // Delete stale draft invoices (> 60 days)
  const invoice60d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: deletedInvoices } = await supabase
    .from("invoices")
    .delete()
    .eq("status", "draft")
    .lt("created_at", invoice60d)
    .select("id");
  stats.draft_invoices_deleted = deletedInvoices?.length ?? 0;

  // Remove acknowledged system alerts older than 30 days
  const alert30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: deletedAlerts } = await supabase
    .from("system_alerts")
    .delete()
    .eq("acknowledged", true)
    .lt("created_at", alert30d)
    .select("id");
  stats.alerts_pruned = deletedAlerts?.length ?? 0;

  return NextResponse.json({ status: "ok", stats, timestamp: new Date().toISOString() });
}
