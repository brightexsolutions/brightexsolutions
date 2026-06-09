import * as tls from "tls";

export interface SiteCheckInput {
  id: string;
  url: string;
  platform: string;
  integration_level?: string | null;
  health_endpoint?: string | null;
  health_token?: string | null;
}

export interface SiteCheckResult {
  status: string;
  response_time_ms: number;
  ssl_expiry: string | null;
  requires_update: boolean;
  wp_version: string | null;
}

export function checkSslExpiry(urlString: string): Promise<string | null> {
  try {
    const { hostname, protocol } = new URL(urlString);
    if (protocol !== "https:") return Promise.resolve(null);
    return new Promise((resolve) => {
      const socket = tls.connect(
        { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          socket.destroy();
          resolve(cert?.valid_to ? new Date(cert.valid_to).toISOString().split("T")[0] : null);
        }
      );
      socket.setTimeout(6000, () => { socket.destroy(); resolve(null); });
      socket.on("error", () => resolve(null));
    });
  } catch {
    return Promise.resolve(null);
  }
}

export async function checkSite(site: SiteCheckInput): Promise<SiteCheckResult> {
  const start = Date.now();
  let status = "unknown";
  let response_time_ms = 0;
  let ssl_expiry: string | null = null;
  let requires_update = false;
  let wp_version: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(site.url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);

    response_time_ms = Date.now() - start;
    status = res.ok ? "up" : res.status >= 500 ? "down" : "degraded";

    ssl_expiry = await checkSslExpiry(site.url);

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
      } catch { /* WP REST API might be disabled */ }
    }

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
      } catch { /* health endpoint unreachable — passive status stands */ }
    }
  } catch {
    response_time_ms = Date.now() - start;
    status = "down";
  }

  return { status, response_time_ms, ssl_expiry, requires_update, wp_version };
}
