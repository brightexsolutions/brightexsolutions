import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const token = request.headers.get("x-brightex-token");
  const start = Date.now();

  // Basic ping — always fast, no auth needed
  if (!token || token !== process.env.BRIGHTEX_HEALTH_TOKEN) {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  // Authenticated detail check — for Brightex dashboard and monitoring
  const checks: Record<string, string> = {};

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      const supabase = createAdminClient();
      await supabase.from("contacts").select("id").limit(1);
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }
  } else {
    checks.database = "unconfigured";
  }

  const status = Object.values(checks).includes("error") ? "degraded" : "ok";

  return NextResponse.json({
    status,
    site:            process.env.NEXT_PUBLIC_SITE_NAME    ?? "brightex-solutions",
    version:         process.env.NEXT_PUBLIC_APP_VERSION  ?? "1.0.0",
    environment:     process.env.NODE_ENV,
    timestamp:       new Date().toISOString(),
    checks,
    response_time_ms: Date.now() - start,
  });
}
