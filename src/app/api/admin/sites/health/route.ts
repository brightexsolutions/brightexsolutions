import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { checkSite } from "@/lib/site-health";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("id");

  const query = supabase.from("sites").select("id, url, platform, integration_level, health_endpoint, health_token");
  const { data: sites, error } = siteId ? await query.eq("id", siteId) : await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sites?.length) return NextResponse.json({ data: [] });

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

      // Generate alert if site is down or SSL is expiring soon
      if (check.status === "down") {
        await supabase.from("system_alerts").insert({
          type: "site_down",
          severity: "critical",
          message: `${site.url} is DOWN`,
          entity_id: site.id,
          entity_type: "site",
        });
      }

      if (check.ssl_expiry) {
        const daysUntilExpiry = Math.floor(
          (new Date(check.ssl_expiry).getTime() - Date.now()) / 86400000
        );
        if (daysUntilExpiry <= 30) {
          await supabase.from("system_alerts").insert({
            type: "ssl_expiring",
            severity: daysUntilExpiry <= 7 ? "critical" : "warning",
            message: `SSL certificate for ${site.url} expires in ${daysUntilExpiry} days`,
            entity_id: site.id,
            entity_type: "site",
          });
        }
      }

      return { id: site.id, ...check };
    })
  );

  const data = results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
  return NextResponse.json({ data });
}
