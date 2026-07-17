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
  // Gemini (free-tier first) — 2.0-flash and the 1.5 line were deprecated by
  // Google and now 404 on generateContent; 2.5 is the current generation.
  gemini_flash:      "gemini-2.5-flash",
  gemini_flash_lite: "gemini-2.5-flash-lite",
  gemini_pro:        "gemini-2.5-pro",
} as const;

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export const CLAUDE_MODEL_OPTIONS = [
  { value: AI_MODELS.haiku,  label: "Claude Haiku 4.5  (fast · cheapest)" },
  { value: AI_MODELS.sonnet, label: "Claude Sonnet 4.6 (balanced)" },
  { value: AI_MODELS.opus,   label: "Claude Opus 4.8   (most capable)" },
] as const;

export const GEMINI_MODEL_OPTIONS = [
  { value: AI_MODELS.gemini_flash,      label: "Gemini 2.5 Flash       (free tier · fast)" },
  { value: AI_MODELS.gemini_flash_lite, label: "Gemini 2.5 Flash Lite  (free tier · fastest)" },
  { value: AI_MODELS.gemini_pro,        label: "Gemini 2.5 Pro         (higher quality · limited RPM)" },
] as const;
