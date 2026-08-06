/**
 * CC scope vocabulary and pure helpers.
 *
 * Kept separate from cc-recipients.ts (which reaches into Supabase) so that
 * client components can import the scope list and labels without dragging the
 * server-only Supabase admin client into the browser bundle.
 */

export const CC_SCOPES = [
  "invoices",
  "payments",
  "documents",
  "projects",
  "bookings",
  "intake",
  "general",
] as const;

export type CcScope = (typeof CC_SCOPES)[number];

/** Human labels for the admin contact editor. */
export const CC_SCOPE_LABELS: Record<CcScope, string> = {
  invoices:  "Invoices & reminders",
  payments:  "Payments & receipts",
  documents: "Proposals & agreements",
  projects:  "Project updates",
  bookings:  "Bookings & meetings",
  intake:    "Onboarding & requirements",
  general:   "General correspondence",
};

/** Scope wildcard stored on a contact that should see everything. */
export const CC_SCOPE_ALL = "all";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Canonical stored form of an address.
 *
 * Uniqueness of a client's contacts is enforced by a plain unique constraint on
 * (client_id, email) rather than a functional index on lower(email), because
 * PostgREST cannot use a functional index as an upsert conflict target (see
 * migration 035). Case-insensitivity therefore has to be applied here, on every
 * write, or "Jane@x.com" and "jane@x.com" become two contacts.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

const normalise = normaliseEmail;

/**
 * Cleans a CC list: drops blanks, invalid addresses, duplicates, and anything
 * already in the To line (a recipient CC'd on their own email gets two copies
 * and, in some clients, two threads).
 */
export function dedupeCc(cc: (string | null | undefined)[], to?: string | string[] | null): string[] {
  const toSet = new Set(
    (Array.isArray(to) ? to : to ? [to] : []).map(normalise)
  );
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of cc) {
    if (!raw) continue;
    const email = raw.trim();
    if (!isValidEmail(email)) continue;
    const key = normalise(email);
    if (toSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

/**
 * What to display for a CC contact.
 *
 * A name is optional, because plenty of the addresses worth copying are not
 * people: accounts@, billing@, a shared ops inbox. Forcing a name onto those
 * only produces a label someone invented on the spot. Where there is no name,
 * the address is the identity.
 */
export function contactLabel(contact: { name?: string | null; email: string }): string {
  return contact.name?.trim() || contact.email;
}

/** Renders a CC list for the communications log, so the trail shows who else received it. */
export function describeCc(cc: string[]): string {
  if (cc.length === 0) return "";
  return `Copied to: ${cc.join(", ")}`;
}
