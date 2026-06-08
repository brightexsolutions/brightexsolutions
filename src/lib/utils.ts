import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalises a phone number to E.164 format with a `+` prefix.
 *
 * Rules applied in order:
 *  - Strips all whitespace and common separators (spaces, dashes, dots, parentheses)
 *  - Already starts with `+`  → returned as-is (foreign number, trust the user)
 *  - Starts with `00`         → replace with `+`
 *  - Starts with `07` or `01` → Kenyan mobile/landline → prepend `+254` and drop the leading `0`
 *  - Starts with `254`        → prepend `+`
 *  - Anything else            → returned unchanged (could be a foreign number without country code)
 */
export function normalisePhone(raw: string): string {
  const stripped = raw.replace(/[\s\-.() ]/g, "");
  if (!stripped) return raw;

  if (stripped.startsWith("+")) return stripped;

  if (stripped.startsWith("00")) return `+${stripped.slice(2)}`;

  // Kenyan numbers starting with 07xx or 01xx
  if (/^0[17]\d{8}$/.test(stripped)) return `+254${stripped.slice(1)}`;

  if (stripped.startsWith("254")) return `+${stripped}`;

  return stripped;
}
