import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Build a mutable response so session cookies can be refreshed
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.app_role as string | undefined;

  // /admin/* — requires admin role
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!user || role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  // /work/* — subcontractor portal
  if (pathname.startsWith("/work")) {
    if (!user || (role !== "subcontractor" && role !== "admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  // /team/marketing/* — marketing portal
  if (pathname.startsWith("/team/marketing")) {
    if (!user || (role !== "marketing" && role !== "admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  // /team/finance/* — finance portal
  if (pathname.startsWith("/team/finance")) {
    if (!user || (role !== "finance" && role !== "admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  // Public routes are NOT in the matcher — zero middleware overhead on visitor traffic
  matcher: ["/admin/:path*", "/work/:path*", "/team/:path*"],
};
