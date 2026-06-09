"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Megaphone } from "lucide-react";
import { usePathname } from "next/navigation";

interface Announcement {
  id: string;
  title: string;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  display_location?: string[] | null;
}

export function AnnouncementDialog({ announcement }: { announcement: Announcement | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    if (!announcement) return;
    if (sessionStorage.getItem(`bx_ann_dialog_${announcement.id}`)) return;

    const trigger = () => setOpen(true);
    window.addEventListener("scroll", trigger, { once: true, passive: true });
    return () => window.removeEventListener("scroll", trigger);
  }, [announcement, pathname]);

  function close() {
    if (announcement) {
      sessionStorage.setItem(`bx_ann_dialog_${announcement.id}`, "1");
    }
    setOpen(false);
  }

  if (!announcement) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-brand-navy/70 backdrop-blur-sm"
            onClick={close}
          />

          {/* Card wrapper — decorative rings sit outside the card's overflow clip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[420px]"
          >
            {/* Decorative rings */}
            <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full border border-brand-gold/10 pointer-events-none" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full border border-brand-gold/15 pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border border-white/5 pointer-events-none" />

            {/* Card */}
            <div className="relative bg-brand-navy rounded-2xl border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* Gold accent bar */}
              <div className="h-[3px] bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

              {/* Radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(249,168,37,0.07),transparent)] pointer-events-none" />

              <div className="relative p-7 sm:p-8">
                {/* Close button */}
                <button
                  onClick={close}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all"
                  aria-label="Close announcement"
                >
                  <X size={13} />
                </button>

                {/* Icon + badge row */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center shrink-0">
                    <Megaphone size={17} className="text-brand-gold" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-bold tracking-widest uppercase">
                    <span className="w-1 h-1 rounded-full bg-brand-gold animate-pulse" />
                    From Brightex
                  </div>
                </div>

                {/* Title */}
                <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-white leading-tight mb-3">
                  {announcement.title}
                </h2>

                {/* Body */}
                {announcement.body && (
                  <p className="text-white/55 text-sm leading-relaxed mb-6">
                    {announcement.body}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 flex-wrap mt-6">
                  {announcement.cta_label && announcement.cta_url && (
                    <a
                      href={announcement.cta_url}
                      onClick={close}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-bold text-sm hover:bg-brand-gold-hover transition-colors"
                    >
                      {announcement.cta_label}
                      <ArrowRight size={14} />
                    </a>
                  )}
                  <button
                    onClick={close}
                    className="text-xs text-white/35 hover:text-white/60 transition-colors font-medium"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
