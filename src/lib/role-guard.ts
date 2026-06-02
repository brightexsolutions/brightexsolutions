import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Roles that are limited team portals — NOT the business owner / admin.
const TEAM_ROLES = new Set(["finance", "marketing", "support", "subcontractor"]);

/**
 * Returns a 403 response if the user is a team member (not an admin).
 * Returns null if the user is allowed through (admin / owner).
 * Usage: const blocked = forbidTeamMember(user); if (blocked) return blocked;
 */
export function forbidTeamMember(user: User | null | undefined) {
  const role = user?.app_metadata?.app_role as string | undefined;
  if (role && TEAM_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
