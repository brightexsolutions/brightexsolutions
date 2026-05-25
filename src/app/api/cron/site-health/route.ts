import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ status: "skipped", reason: "Supabase not configured" });
  }

  // Delegate to the admin health check route by calling it internally
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${siteUrl}/api/admin/sites/health`, {
    headers: {
      // Provide a dummy auth token — the health route requires auth
      // In production, use a service-role call directly instead of fetch
      cookie: request.headers.get("cookie") ?? "",
    },
  });

  const supabase = await createClient();
  const { data: sites } = await supabase.from("sites").select("id, url, platform, integration_level, health_endpoint, health_token");

  if (!sites?.length) {
    return NextResponse.json({ status: "ok", checked: 0, timestamp: new Date().toISOString() });
  }

  // Run health checks directly
  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const start = Date.now();
      try {
        const siteRes = await fetch(site.url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
        const responseTime = Date.now() - start;
        const status = siteRes.ok ? "up" : siteRes.status >= 500 ? "down" : "degraded";

        await supabase.from("sites").update({
          status,
          last_checked: new Date().toISOString(),
          response_time_ms: responseTime,
        }).eq("id", site.id);

        if (status === "down") {
          await supabase.from("system_alerts").insert({
            type: "site_down",
            severity: "critical",
            message: `${site.url} is DOWN`,
            entity_id: site.id,
            entity_type: "site",
          });
        }

        return { id: site.id, status, response_time_ms: responseTime };
      } catch {
        await supabase.from("sites").update({
          status: "down",
          last_checked: new Date().toISOString(),
          response_time_ms: Date.now() - start,
        }).eq("id", site.id);

        return { id: site.id, status: "down" };
      }
    })
  );

  const checked = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ status: "ok", checked, timestamp: new Date().toISOString() });
}
