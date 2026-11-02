import type { User } from "@supabase/supabase-js";

/**
 * Local-only login bypass for UI work.
 *
 * Active only when BOTH hold: `next dev` is running and DEV_AUTH_BYPASS=1 is
 * passed on the command line. A production build never enables it, whatever
 * the env says.
 *
 *   DEV_AUTH_BYPASS=1 npm run dev
 */
export const DEV_AUTH_BYPASS =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "1";

export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  aud: "authenticated",
  email: "dev@localhost",
  app_metadata: {},
  user_metadata: { full_name: "Local Dev" },
  created_at: new Date(0).toISOString(),
} as User;
