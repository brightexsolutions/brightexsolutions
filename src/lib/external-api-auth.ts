import { NextRequest, NextResponse } from "next/server";

// Auth for machine-to-machine consumers outside this app (e.g. Stride pulling a
// summary) — distinct from CRON_SECRET (internal Vercel/cron-job.org triggers) and
// from admin session cookies (human users). Same bearer-token shape as cron-auth.ts.
export function verifyExternalApiKey(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!process.env.STRIDE_API_KEY || bearer !== process.env.STRIDE_API_KEY) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}
