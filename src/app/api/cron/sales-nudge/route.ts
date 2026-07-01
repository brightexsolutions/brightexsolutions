import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logSystemAction } from "@/lib/audit";

// Alert when a sales lead has been in an active (non-terminal) stage for this many days
const NUDGE_DAYS = 14;

const ACTIVE_STAGES = ["lead", "proposal", "negotiation"];

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - NUDGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleSales } = await supabase
    .from("sales")
    .select("id, service, status, estimated_value, created_at, clients(name)")
    .in("status", ACTIVE_STAGES)
    .lt("created_at", cutoff)
    .is("deleted_at", null);

  if (!staleSales?.length) {
    return NextResponse.json({ status: "ok", alerts_created: 0 });
  }

  let alertsCreated = 0;
  for (const sale of staleSales) {
    const client = sale.clients as { name?: string } | null;

    const { count } = await supabase
      .from("system_alerts")
      .select("*", { count: "exact", head: true })
      .eq("entity_id", sale.id)
      .eq("type", "sales_stale")
      .eq("acknowledged", false);

    if ((count ?? 0) === 0) {
      const daysStale = Math.floor((Date.now() - new Date(sale.created_at as string).getTime()) / 86400000);
      const label = `${sale.service ?? "Service"} — ${client?.name ?? "Unknown client"}`;

      await supabase.from("system_alerts").insert({
        type: "sales_stale",
        severity: daysStale >= 30 ? "warning" : "info",
        message: `Sales lead "${label}" has been in "${sale.status}" for ${daysStale} day${daysStale !== 1 ? "s" : ""} — needs follow-up${sale.estimated_value ? ` (KES ${Number(sale.estimated_value).toLocaleString("en-KE")})` : ""}`,
        entity_id: sale.id,
        entity_type: "sale",
      });

      await logSystemAction({
        action: "sales_nudge_created",
        entity_type: "sale",
        entity_id: sale.id,
        entity_label: label,
        notes: `In "${sale.status}" stage for ${daysStale} day${daysStale !== 1 ? "s" : ""}`,
      });

      alertsCreated++;
    }
  }

  return NextResponse.json({ status: "ok", alerts_created: alertsCreated, timestamp: new Date().toISOString() });
}
