import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { checkSite } from "@/lib/site-health";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  const supabase = createAdminClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, url, platform, integration_level, health_endpoint, health_token");

  if (!sites?.length) {
    return NextResponse.json({ status: "ok", checked: 0, timestamp: new Date().toISOString() });
  }

  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const check = await checkSite(site);
      const now = new Date().toISOString();

      await supabase.from("sites").update({
        status: check.status,
        last_checked: now,
        response_time_ms: check.response_time_ms,
        ssl_expiry: check.ssl_expiry,
        requires_update: check.requires_update,
        wp_version: check.wp_version,
      }).eq("id", site.id);

      if (check.status === "down") {
        // Deduplicate: only create alert if no unacknowledged down alert already exists
        const { count: downCount } = await supabase
          .from("system_alerts")
          .select("*", { count: "exact", head: true })
          .eq("entity_id", site.id)
          .eq("type", "site_down")
          .eq("acknowledged", false);

        if ((downCount ?? 0) === 0) {
          await supabase.from("system_alerts").insert({
            type: "site_down",
            severity: "critical",
            message: `${site.url} is DOWN`,
            entity_id: site.id,
            entity_type: "site",
          });
        }
      } else {
        // Site is up — auto-acknowledge any outstanding site_down alerts for this site
        await supabase
          .from("system_alerts")
          .update({ acknowledged: true })
          .eq("entity_id", site.id)
          .eq("type", "site_down")
          .eq("acknowledged", false);
      }

      if (check.ssl_expiry) {
        const daysUntilExpiry = Math.floor(
          (new Date(check.ssl_expiry).getTime() - Date.now()) / 86400000
        );
        if (daysUntilExpiry <= 30) {
          // Deduplicate: only create alert if no unacknowledged SSL alert already exists
          const { count: sslCount } = await supabase
            .from("system_alerts")
            .select("*", { count: "exact", head: true })
            .eq("entity_id", site.id)
            .eq("type", "ssl_expiring")
            .eq("acknowledged", false);

          if ((sslCount ?? 0) === 0) {
            await supabase.from("system_alerts").insert({
              type: "ssl_expiring",
              severity: daysUntilExpiry <= 7 ? "critical" : "warning",
              message: `SSL certificate for ${site.url} expires in ${daysUntilExpiry} days`,
              entity_id: site.id,
              entity_type: "site",
            });
          }
        }
      }

      return { id: site.id, status: check.status };
    })
  );

  const checked = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ status: "ok", checked, timestamp: new Date().toISOString() });
}
