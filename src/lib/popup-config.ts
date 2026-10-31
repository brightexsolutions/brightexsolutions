import { z } from "zod";

/** Pop-up settings stored on an announcement (announcements.popup, migration 043). */
export const PopupConfigSchema = z.object({
  enabled: z.boolean().default(false),
  trigger: z.enum(["load", "delay", "scroll", "exit", "after_contact"]).default("delay"),
  delaySeconds: z.number().int().min(0).max(600).default(8),
  scrollPercent: z.number().int().min(1).max(100).default(50),
  pages: z.array(z.string().trim().regex(/^\//, "Pages start with /").max(200)).max(30).default([]),
  audience: z.enum(["all", "new", "returning"]).default("all"),
  device: z.enum(["all", "mobile", "desktop"]).default("all"),
  frequency: z.enum(["once", "session", "days", "always"]).default("session"),
  frequencyDays: z.number().int().min(1).max(365).default(7),
  style: z.enum(["modal", "slide", "bar"]).default("modal"),
});

export type PopupConfig = z.infer<typeof PopupConfigSchema>;

export const DEFAULT_POPUP: PopupConfig = PopupConfigSchema.parse({});

export const TRIGGER_LABELS: Record<PopupConfig["trigger"], string> = {
  load: "As soon as the page opens",
  delay: "After a few seconds",
  scroll: "After scrolling part of the page",
  exit: "When the visitor is about to leave",
  after_contact: "After they send the contact or booking form",
};

export const FREQUENCY_LABELS: Record<PopupConfig["frequency"], string> = {
  once: "Once per visitor, ever",
  session: "Once per visit",
  days: "Again after a number of days",
  always: "Every page view",
};

export const STYLE_LABELS: Record<PopupConfig["style"], string> = {
  modal: "Centred pop-up",
  slide: "Slide-in card (corner)",
  bar: "Bar across the top",
};

/** Short summary for tables, e.g. "After 8s · Once per visit". */
export function describePopup(p: PopupConfig): string {
  const when =
    p.trigger === "delay" ? `After ${p.delaySeconds}s`
    : p.trigger === "scroll" ? `At ${p.scrollPercent}% scroll`
    : p.trigger === "exit" ? "On exit"
    : p.trigger === "after_contact" ? "After a form"
    : "On load";
  const how = p.frequency === "days" ? `every ${p.frequencyDays} days` : FREQUENCY_LABELS[p.frequency].toLowerCase();
  return `${when} · ${how}`;
}

/** "/blog/*" matches "/blog" and anything under it; other entries match exactly. */
export function matchesPage(pathname: string, pages: string[]): boolean {
  if (pages.length === 0) return true;
  return pages.some((p) => {
    if (p.endsWith("/*")) {
      const base = p.slice(0, -2) || "/";
      return pathname === base || pathname.startsWith(base === "/" ? "/" : base + "/");
    }
    return pathname === p;
  });
}

/** Parses a stored value; anything malformed is treated as "no pop-up". */
export function readPopup(value: unknown): PopupConfig | null {
  if (!value) return null;
  const r = PopupConfigSchema.safeParse(value);
  return r.success ? r.data : null;
}

/** The friendly message when migration 043 has not been run yet. */
export function popupColumnMissing(message: string | undefined): boolean {
  return !!message && /popup/i.test(message) && /column|schema cache/i.test(message);
}
