import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const token = request.headers.get("x-brightex-token");
  const start = Date.now();

  // Basic ping — always responds, no token needed
  if (!token || token !== process.env.BRIGHTEX_HEALTH_TOKEN) {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  // Detailed check — authenticated Brightex dashboard only
  const checks: Record<string, string> = {};

  // DB check — uncomment once Supabase is connected
  // try {
  //   const supabase = await createClient()
  //   await supabase.from('contacts').select('id').limit(1)
  //   checks.database = 'ok'
  // } catch {
  //   checks.database = 'error'
  // }

  const status = Object.values(checks).includes("error") ? "degraded" : "ok";

  return NextResponse.json({
    status,
    site: process.env.NEXT_PUBLIC_SITE_NAME ?? "brightex-solutions",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    checks,
    response_time_ms: Date.now() - start,
  });
}
