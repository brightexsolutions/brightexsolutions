import { createBrowserClient } from "@supabase/ssr";

// Browser client — anon key only, used solely for reading auth session.
// Never use this for data queries.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
