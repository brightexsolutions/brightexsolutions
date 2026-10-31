import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { DEV_AUTH_BYPASS, DEV_USER } from "@/lib/dev-auth";

// In local dev with DEV_AUTH_BYPASS=1, every auth.getUser() resolves to a fake owner.
function withDevUser<T extends { auth: { getUser: unknown } }>(client: T): T {
  if (!DEV_AUTH_BYPASS) return client;
  client.auth.getUser = (async () => ({ data: { user: DEV_USER }, error: null })) as T["auth"]["getUser"];
  return client;
}

// Auth-aware SSR client: reads the user's session from cookies.
// Use ONLY for auth.getUser() checks. Never for PostgREST DB queries.
export async function createClient() {
  const cookieStore = await cookies();
  return withDevUser(createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  ));
}

// Admin client: pure service_role, NO cookies, bypasses RLS on every query.
// Use for ALL PostgREST operations (select, insert, update, delete).
// This is safe because it is server-only: the key never reaches the browser.
export function createAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Auth-aware server client: anon key + cookie session (for proxy/middleware).
export async function createAuthClient() {
  const cookieStore = await cookies();
  return withDevUser(createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  ));
}
