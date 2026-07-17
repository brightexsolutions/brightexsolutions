/** Shared AI copy rules for Brightex document drafting/refinement — used by
 * both initial generation (documents/generate) and refinement
 * (documents/[id]/refine) so both stay in sync. */
export const DOCUMENT_COPY_RULES = `BRIGHTEX DOCUMENT COPY RULES (follow exactly):
- Tone: confident, direct, professional. No filler phrases. Lead with value and outcomes.
- Never use the em dash (—) or double-dash (--). Use a colon, comma, or rewrite the sentence.
- Never write sentences led by a personal contact's name ("John has...", "John mentioned..."). Reference the business name or "the client" instead.
- Currency: KES only, formatted as plain numbers (the template formats currency for you — just give raw numbers).
- Keep client-facing language non-technical: no stack names, no framework names, no acronyms.
- Less is more. Be concise and specific, grounded only in the engagement summary given — never invent client details, figures, or claims not implied by it.`;
