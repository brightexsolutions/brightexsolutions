"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
}

interface Props {
  announcement: Announcement | null;
}

export function AnnouncementBanner({ announcement }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (announcement && sessionStorage.getItem(`bx_ann_${announcement.id}`)) {
      setDismissed(true);
    }
  }, [announcement]);

  if (!announcement || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(`bx_ann_${announcement!.id}`, "1");
    setDismissed(true);
  }

  return (
    <div className="bg-[--color-brand-gold] text-[--color-brand-navy] text-sm px-4 py-2.5 flex items-center justify-center gap-3 relative">
      <span className="font-semibold">{announcement.title}</span>
      {announcement.body && (
        <span className="hidden sm:inline text-[--color-brand-navy]/80">
          — {announcement.body}
        </span>
      )}
      {announcement.cta_label && announcement.cta_url && (
        <a
          href={announcement.cta_url}
          className="underline font-semibold hover:opacity-80 transition-opacity"
        >
          {announcement.cta_label}
        </a>
      )}
      <button
        onClick={dismiss}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[--color-brand-navy]/60 hover:text-[--color-brand-navy] transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
