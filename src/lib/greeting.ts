/**
 * How a client is addressed at the top of an email.
 *
 * Every send site used to do `client.name.split(" ")[0]`, which is correct
 * only when `name` holds a person. It frequently does not: a client added as
 * "Fawley Enterprises Ltd" with no named contact yet is greeted "Hello Fawley",
 * inventing a person who does not exist. That reads worse than any honest
 * fallback, and it went out on invoices and payment reminders.
 *
 * The rule here is deliberately conservative. A first name is only used when
 * the value really looks like a person's name; anything ambiguous falls back
 * to "there", which is never wrong.
 */

/**
 * Tokens that mark a name as an organisation. Matched whole-word and
 * case-insensitively, so "Institute" catches CHANF Training Institute while
 * "Ltd" does not fire on a surname like "Ltdovic".
 *
 * Weighted towards how Kenyan businesses actually name themselves, which is
 * where this is used.
 */
const BUSINESS_MARKERS = [
  "ltd", "limited", "llc", "plc", "inc", "incorporated", "corp", "corporation",
  "co", "company", "group", "holdings", "enterprise", "enterprises",
  "solutions", "services", "systems", "technologies", "tech",
  "institute", "academy", "college", "school", "university",
  "hospital", "clinic", "pharmacy", "laboratories",
  "agency", "studio", "studios", "consultancy", "consulting", "consultants",
  "partners", "associates", "ventures", "investments", "capital",
  "traders", "trading", "suppliers", "supplies", "contractors", "constructions",
  "sacco", "society", "foundation", "trust", "ministries", "church",
  "logistics", "motors", "properties", "realtors", "insurance", "bank",
  "hotel", "restaurant", "cafe", "salon", "spa", "gym", "fitness",
  "media", "productions", "publishers", "printers", "farm", "farms",
];

/** Titles stripped before a first name is taken. */
const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "eng", "rev", "hon", "sir", "madam"]);

const clean = (value: string) => value.trim().replace(/\s+/g, " ");

/**
 * Whether a name reads as an organisation rather than a person.
 *
 * Also true for anything with no letters, and for very long values, since a
 * five-word "name" is a trading style rather than someone we can greet.
 */
export function isBusinessName(name: string | null | undefined): boolean {
  const value = clean(name ?? "");
  if (!value) return true;
  if (!/[a-z]/i.test(value)) return true;

  // Punctuation that only appears in trading names.
  if (/[&@/]|\b(and|the)\b/i.test(value)) return true;

  const words = value.split(" ");
  if (words.length > 4) return true;

  return words.some((word) => {
    const bare = word.toLowerCase().replace(/[^a-z]/g, "");
    return bare.length > 0 && BUSINESS_MARKERS.includes(bare);
  });
}

/**
 * The name to greet someone by, or "there" when we cannot be confident.
 *
 * @param name    the stored client or contact name
 * @param company the business, when held separately. A `name` identical to it
 *                is a business record whose contact has not been filled in.
 */
export function greetingName(
  name: string | null | undefined,
  company?: string | null
): string {
  const value = clean(name ?? "");
  if (!value) return "there";

  if (company && clean(company).toLowerCase() === value.toLowerCase()) return "there";
  if (isBusinessName(value)) return "there";

  const words = value.split(" ").filter((w) => !TITLES.has(w.toLowerCase().replace(/[^a-z]/g, "")));
  if (words.length === 0) return "there";

  // "J. Kamau" should greet Kamau, not the initial.
  const first = words[0];
  const isInitial = first.replace(/[^a-z]/gi, "").length <= 1;
  const chosen = isInitial && words.length > 1 ? words[1] : first;

  const stripped = chosen.replace(/[^a-z'\-]/gi, "");
  return stripped.length >= 2 ? tidyCase(stripped) : "there";
}

/**
 * People type their names into forms in caps often enough that greeting them
 * "Hello JOHN" is a real outcome. Only touched when the token is entirely one
 * case, so McDonald and O'Brien survive intact.
 */
function tidyCase(word: string): string {
  const uniform = word === word.toUpperCase() || word === word.toLowerCase();
  if (!uniform) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * "Hello Fawley" or "Hello there". The greeting itself rather than the fragment, so
 * call sites cannot reintroduce the bug by interpolating it wrongly.
 */
export function greeting(name: string | null | undefined, company?: string | null): string {
  return `Hello ${greetingName(name, company)}`;
}

/**
 * The business to name in body copy, when naming it adds something.
 *
 * Returns null when the company duplicates the greeting or is absent, so
 * copy can say "what you have in mind for CHANF Training Institute" without
 * ever producing "for Fawley" or a dangling "for ".
 */
export function businessContext(
  name: string | null | undefined,
  company?: string | null
): string | null {
  const business = clean(company ?? "");
  if (!business) return null;
  if (clean(name ?? "").toLowerCase() === business.toLowerCase()) return null;
  return business;
}
