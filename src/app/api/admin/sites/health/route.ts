import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface SiteRow {
  id: string;
  url: string;
  platform: string;
  integration_level?: string;
  health_endpoint?: string;
  health_token?: string;
}

async function checkSite(site: SiteRow): Promise<{
  status: string;
  response_time_ms: number;
  ssl_expiry: string | null;
  requires_update: boolean;
  wp_version: string | null;
}> {
  const start = Date.now();
  let status = "unknown";
  let response_time_ms = 0;
  let ssl_expiry: string | null = null;
  let requires_update = false;
  let wp_version: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(site.url, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    response_time_ms = Date.now() - start;
    status = res.ok ? "up" : res.status >= 500 ? "down" : "degraded";

    // Check SSL expiry from response headers if available
    const sslHeader = res.headers.get("x-ssl-expiry");
    if (sslHeader) ssl_expiry = sslHeader;

    // WordPress passive check
    if (site.platform === "wordpress") {
      try {
        const wpRes = await fetch(`${site.url}/wp-json/`, {
          headers: { Accept: "application/json" },
        });
        if (wpRes.ok) {
          const wpData = await wpRes.json() as { generator?: string };
          const match = wpData.generator?.match(/WordPress\s+([\d.]+)/);
          if (match) wp_version = match[1];
        }
      } catch {
        // WP REST API might be disabled — not a failure
      }
    }

    // Active integration check
    if (site.integration_level === "active" || site.integration_level === "wordpress") {
      const endpoint = site.health_endpoint ?? `${site.url}/api/health`;
      try {
        const healthRes = await fetch(endpoint, {
          headers: site.health_token ? { "x-brightex-token": site.health_token } : {},
        });
        if (healthRes.ok) {
          const healthData = await healthRes.json() as {
            status?: string;
            wp_version?: string;
            needs_core_update?: boolean;
          };
          if (healthData.status === "degraded") status = "degraded";
          if (healthData.wp_version) wp_version = healthData.wp_version;
          if (healthData.needs_core_update) requires_update = true;
        }
      } catch {
        // Health endpoint unreachable — passive status stands
      }
    }
  } catch {
    response_time_ms = Date.now() - start;
    status = "down";
  }

  return { status, response_time_ms, ssl_expiry, requires_update, wp_version };
}

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
    (sites as SiteRow[]).map(async (site) => {
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
