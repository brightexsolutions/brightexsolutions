import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const TEAM_PORTALS: Record<string, string> = {
  finance: "/team/finance",
  marketing: "/team/marketing",
  support: "/team/support",
  subcontractor: "/portal",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin maintenance mode — locks /admin/* but leaves public routes untouched
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    process.env.ADMIN_MAINTENANCE === "true"
  ) {
    return NextResponse.rewrite(new URL("/admin/maintenance", request.url));
  }

  // If Supabase is not configured, allow all protected routes through (local dev)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Build a mutable response so session cookies can be refreshed
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — required to keep the cookie alive
  const { data: { user } } = await supabase.auth.getUser();

  // app_metadata.app_role is set by /api/team/register after first password set.
  // Fallback to user_metadata.role for the window between invite acceptance and
  // register completing (first-time login before USER_UPDATED fires fully).
  const role =
    (user?.app_metadata?.app_role as string | undefined) ??
    (user?.user_metadata?.role as string | undefined);

  // ── Admin routes ─────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return response;

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Team members trying to reach admin — send them to their portal
    if (role && TEAM_PORTALS[role]) {
      return NextResponse.redirect(new URL(TEAM_PORTALS[role], request.url));
    }

    return response;
  }

  // ── Team portals ─────────────────────────────────────────────────────────────
  const portalRoutes: Array<{ prefix: string; role: string }> = [
    { prefix: "/team/finance",   role: "finance" },
    { prefix: "/team/marketing", role: "marketing" },
    { prefix: "/team/support",   role: "support" },
    { prefix: "/portal",         role: "subcontractor" },
  ];

  for (const route of portalRoutes) {
    if (!pathname.startsWith(route.prefix)) continue;

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (role === route.role) {
      return response; // correct role — allow through
    }

    // Wrong role: redirect to their own portal (or admin if no role = owner)
    if (!role || !TEAM_PORTALS[role]) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL(TEAM_PORTALS[role], request.url));
  }

  return response;
}

export const config = {
  // Public routes are NOT in the matcher — zero proxy overhead on visitor traffic
  matcher: ["/admin/:path*", "/portal/:path*", "/team/:path*"],
};
