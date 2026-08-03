import { BRIGHTEX_WRITING_RULES } from "@/lib/ai";

/** Shared AI copy rules for Brightex document drafting and refinement: used by
 * both initial generation (documents/generate) and refinement
 * (documents/[id]/refine) so both stay in sync. */
export const DOCUMENT_COPY_RULES = `BRIGHTEX DOCUMENT COPY RULES (follow exactly):
${BRIGHTEX_WRITING_RULES}
- Tone: confident, direct, professional. No filler phrases. Lead with value and outcomes.
- Never write sentences led by a personal contact's name ("John has...", "John mentioned..."). Reference the business name or "the client" instead.
- Currency: KES only, formatted as plain numbers (the template formats currency for you, so give raw numbers).
- Keep client-facing language non-technical: no stack names, no framework names, no acronyms.
- Less is more. Be concise and specific, grounded only in the engagement summary given.`;
