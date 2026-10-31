"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal], [data-reveal-stagger]";

/** Adds data-revealed to reveal blocks as they enter the viewport. See fade-in.tsx. */
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

    // Anything already on screen is revealed immediately so the first paint never flashes.
    const vh = window.innerHeight;
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
      if (el.dataset.revealed !== undefined) return;
      if (el.getBoundingClientRect().top < vh) el.dataset.revealed = "";
      else io.observe(el);
    });
    root.dataset.revealReady = "";

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
