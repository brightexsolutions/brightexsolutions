import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_BYPASS } from "@/lib/dev-auth";

const TEAM_PORTALS: Record<string, string> = {
  finance: "/team/finance",
  marketing: "/team/marketing",
  support: "/team/support",
  subcontractor: "/portal",
};

/**
 * Admin subdomain. Set ADMIN_HOST (e.g. admin.brightexsolutions.co.ke) once the
 * DNS record exists. The same deployment then serves both hosts:
 *   admin.<domain>/            -> /admin
 *   admin.<domain>/<public>    -> www.<domain>/<public>
 *   www.<domain>/admin/...     -> admin.<domain>/admin/...
 * Unset, nothing changes and /admin keeps working on the main domain.
 */
const ADMIN_HOST = process.env.ADMIN_HOST;
// Everything that needs the admin session cookie, including the invite landing
// page, so a new team member signs in on the same host as their portal.
const APP_PREFIXES = ["/admin", "/portal", "/team", "/auth", "/join"];

function adminHostRedirect(request: NextRequest): NextResponse | null {
  if (!ADMIN_HOST) return null;
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;
  const isAppPath = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (host === ADMIN_HOST) {
    if (pathname === "/") return NextResponse.redirect(new URL("/admin", request.url));
    if (!isAppPath) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brightexsolutions.co.ke";
      return NextResponse.redirect(new URL(pathname + search, site));
    }
    return null;
  }
  if (isAppPath) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${search}`);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hostRedirect = adminHostRedirect(request);
  if (hostRedirect) return hostRedirect;

  // Admin maintenance mode: locks /admin/* but leaves public routes untouched
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    process.env.ADMIN_MAINTENANCE === "true"
  ) {
    return NextResponse.rewrite(new URL("/admin/maintenance", request.url));
  }

  // Local UI work: skip the login wall entirely (never active in production builds)
  if (DEV_AUTH_BYPASS) {
    return NextResponse.next({ request: { headers: request.headers } });
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

  // Refresh the session: required to keep the cookie alive
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

    // Team members trying to reach admin: send them to their portal
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
      return response; // correct role: allow through
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
  // Public routes are NOT in the matcher: zero proxy overhead on visitor traffic.
  // The last entry only runs on the admin subdomain.
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/team/:path*",
    "/join",
    { source: "/((?!_next/|api/|.*\\.).*)", has: [{ type: "host", value: "admin\\..+" }] },
  ],
};
