import { NextRequest, NextResponse } from "next/server";

export function verifyCronSecret(request: NextRequest): NextResponse | null {
  // Accept x-cron-secret (external schedulers) or Authorization: Bearer (Vercel native cron)
  const xSecret    = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearer     = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const provided   = xSecret ?? bearer;

  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}
