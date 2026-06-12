/**
 * AI model catalogues — pure data, no SDK imports.
 * Safe to import in Client Components and Server Components alike.
 * SDK-dependent logic lives in ai.ts (server-only).
 */

export const AI_MODELS = {
  // Anthropic
  haiku:  "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus:   "claude-opus-4-8",
  // Gemini (free-tier first)
  gemini_flash:    "gemini-2.0-flash",
  gemini_flash_15: "gemini-1.5-flash",
  gemini_pro_15:   "gemini-1.5-pro",
} as const;

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export const CLAUDE_MODEL_OPTIONS = [
  { value: AI_MODELS.haiku,  label: "Claude Haiku 4.5  (fast · cheapest)" },
  { value: AI_MODELS.sonnet, label: "Claude Sonnet 4.6 (balanced)" },
  { value: AI_MODELS.opus,   label: "Claude Opus 4.8   (most capable)" },
] as const;

export const GEMINI_MODEL_OPTIONS = [
  { value: AI_MODELS.gemini_flash,    label: "Gemini 2.0 Flash  (free · fast)" },
  { value: AI_MODELS.gemini_flash_15, label: "Gemini 1.5 Flash  (free · fast)" },
  { value: AI_MODELS.gemini_pro_15,   label: "Gemini 1.5 Pro    (free · limited RPM)" },
] as const;
