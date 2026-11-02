"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal], [data-reveal-stagger]";

/**
 * Adds data-revealed to reveal blocks as they enter the viewport. See fade-in.tsx.
 *
 * Also watches for blocks added after load ("view more", filters, client
 * navigation): without this they would keep their hidden starting state.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revealed = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    );

    // Anything already on screen is revealed at once so it never flashes hidden
    const track = (el: HTMLElement) => {
      if (el.dataset.revealed !== undefined) return;
      if (el.getBoundingClientRect().top < window.innerHeight) el.dataset.revealed = "";
      else io.observe(el);
    };
    const scan = (scope: ParentNode) => {
      if (scope instanceof HTMLElement && scope.matches(SELECTOR)) track(scope);
      scope.querySelectorAll<HTMLElement>(SELECTOR).forEach(track);
    };

    scan(document);
    root.dataset.revealReady = "";

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
