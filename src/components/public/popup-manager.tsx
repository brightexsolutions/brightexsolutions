"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ArrowRight } from "lucide-react";
import { matchesPage, type PopupConfig } from "@/lib/popup-config";
import { cn } from "@/lib/utils";

export interface SitePopup {
  id: string;
  title: string;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  popup: PopupConfig;
}

/** Fired by the contact and booking forms after a successful submit. */
export const LEAD_EVENT = "bx:lead";

const VISITS_KEY = "bx_visits";
const SEEN_KEY = (id: string) => `bx_popup_${id}`;

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

/** Counts visits (one per browser session) so pop-ups can target new or returning visitors. */
function visitCount(): number {
  return safe(() => {
    if (!sessionStorage.getItem("bx_session")) {
      sessionStorage.setItem("bx_session", "1");
      localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) ?? 0) + 1));
    }
    return Number(localStorage.getItem(VISITS_KEY) ?? 1);
  }, 1);
}

function alreadySeen(p: SitePopup): boolean {
  const { frequency, frequencyDays } = p.popup;
  return safe(() => {
    if (frequency === "always") return false;
    if (frequency === "session") return !!sessionStorage.getItem(SEEN_KEY(p.id));
    const at = Number(localStorage.getItem(SEEN_KEY(p.id)) ?? 0);
    if (!at) return false;
    if (frequency === "once") return true;
    return Date.now() - at < frequencyDays * 864e5;
  }, false);
}

function markSeen(p: SitePopup) {
  safe(() => {
    if (p.popup.frequency === "session") sessionStorage.setItem(SEEN_KEY(p.id), "1");
    else if (p.popup.frequency !== "always") localStorage.setItem(SEEN_KEY(p.id), String(Date.now()));
  }, undefined);
}

function eligible(p: SitePopup, pathname: string, visits: number, isMobile: boolean): boolean {
  const c = p.popup;
  if (!c.enabled || !matchesPage(pathname, c.pages)) return false;
  if (c.device === "mobile" && !isMobile) return false;
  if (c.device === "desktop" && isMobile) return false;
  if (c.audience === "new" && visits > 1) return false;
  if (c.audience === "returning" && visits < 2) return false;
  return !alreadySeen(p);
}

/**
 * Shows admin-configured pop-ups on the public site. Each one waits for its
 * own trigger; only one is on screen at a time.
 */
export function PopupManager({ popups }: { popups: SitePopup[] }) {
  const pathname = usePathname();
  const [current, setCurrent] = useState<SitePopup | null>(null);
  const showing = useRef(false);

  useEffect(() => {
    if (popups.length === 0) return;
    const visits = visitCount();
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const queue = popups.filter((p) => eligible(p, pathname, visits, isMobile));
    if (queue.length === 0) return;

    const cleanups: Array<() => void> = [];
    const show = (p: SitePopup) => {
      if (showing.current || alreadySeen(p)) return;
      showing.current = true;
      markSeen(p);
      setCurrent(p);
    };

    for (const p of queue) {
      const c = p.popup;
      if (c.trigger === "load") {
        const t = window.setTimeout(() => show(p), 600);
        cleanups.push(() => clearTimeout(t));
      } else if (c.trigger === "delay") {
        const t = window.setTimeout(() => show(p), c.delaySeconds * 1000);
        cleanups.push(() => clearTimeout(t));
      } else if (c.trigger === "scroll") {
        const onScroll = () => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          if (max <= 0 || (window.scrollY / max) * 100 >= c.scrollPercent) {
            show(p);
            window.removeEventListener("scroll", onScroll);
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
      } else if (c.trigger === "exit") {
        if (isMobile) {
          // Phones have no exit gesture to detect: fall back to a long dwell
          const t = window.setTimeout(() => show(p), 30_000);
          cleanups.push(() => clearTimeout(t));
        } else {
          const onLeave = (e: MouseEvent) => { if (e.clientY <= 0 && !e.relatedTarget) show(p); };
          document.addEventListener("mouseout", onLeave);
          cleanups.push(() => document.removeEventListener("mouseout", onLeave));
        }
      } else if (c.trigger === "after_contact") {
        const onLead = () => window.setTimeout(() => show(p), 1200);
        window.addEventListener(LEAD_EVENT, onLead);
        cleanups.push(() => window.removeEventListener(LEAD_EVENT, onLead));
      }
    }
    return () => cleanups.forEach((fn) => fn());
  }, [popups, pathname]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setCurrent(null);
    showing.current = false;
  }

  if (!current) return null;
  const { style } = current.popup;
  const cta = current.cta_label && current.cta_url ? (
    current.cta_url.startsWith("/") ? (
      <Link href={current.cta_url} onClick={close} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors">
        {current.cta_label} <ArrowRight size={15} />
      </Link>
    ) : (
      <a href={current.cta_url} target="_blank" rel="noopener" onClick={close} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors">
        {current.cta_label} <ArrowRight size={15} />
      </a>
    )
  ) : null;

  const closeButton = (light = true) => (
    <button
      onClick={close}
      autoFocus
      aria-label="Close"
      className={cn("size-9 rounded-full flex items-center justify-center shrink-0 transition-colors", light ? "text-white/70 hover:text-white hover:bg-white/10" : "text-brand-navy/70 hover:bg-brand-navy/10")}
    >
      <X size={18} />
    </button>
  );

  if (style === "bar") {
    return (
      <div role="region" aria-label={current.title} className="fixed top-0 inset-x-0 z-[60] bg-brand-gold text-brand-navy shadow-lg animate-in slide-in-from-top duration-300">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
          <p className="flex-1 text-sm"><span className="font-semibold">{current.title}</span>{current.body ? <span className="hidden sm:inline"> {current.body}</span> : null}</p>
          {current.cta_label && current.cta_url && (
            <Link href={current.cta_url} onClick={close} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-navy text-white text-xs font-semibold">
              {current.cta_label} <ArrowRight size={13} />
            </Link>
          )}
          {closeButton(false)}
        </div>
      </div>
    );
  }

  if (style === "slide") {
    return (
      <div role="dialog" aria-label={current.title} className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] sm:w-[380px] rounded-3xl bg-brand-navy text-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="h-1 bg-gradient-to-r from-brand-gold to-brand-gold-hover" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <p className="flex-1 font-display text-lg font-bold leading-snug">{current.title}</p>
            {closeButton()}
          </div>
          {current.body && <p className="text-white/75 text-sm leading-relaxed mt-1 mb-4">{current.body}</p>}
          {cta}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-brand-navy/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label={current.title} className="relative w-full max-w-[440px] rounded-3xl bg-brand-navy text-white border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />
        <div aria-hidden className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full border border-brand-gold/15" />
        <div className="relative p-7 sm:p-8">
          <div className="absolute top-4 right-4">{closeButton()}</div>
          <p className="font-display text-2xl font-bold leading-tight pr-10 mb-3">{current.title}</p>
          {current.body && <p className="text-white/75 leading-relaxed mb-6">{current.body}</p>}
          <div className="flex flex-wrap items-center gap-3">
            {cta}
            <button onClick={close} className="text-sm text-white/70 hover:text-white px-2 py-2">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
