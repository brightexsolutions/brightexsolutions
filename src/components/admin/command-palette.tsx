"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft, FolderOpen, FileText, User, Hash } from "lucide-react";
import { ADMIN_HUBS } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

// ─── Jump list: every hub tab, grouped like the sidebar ─────────────────────

const JUMP_ITEMS: ResultItem[] = ADMIN_HUBS.flatMap((hub) =>
  hub.tabs.map((tab) => ({
    id: `nav-${tab.href}`,
    label: tab.label === hub.label || hub.tabs.length === 1 ? hub.label : tab.label,
    href: tab.href,
    group: hub.label,
    icon: hub.icon,
    keywords: `${hub.label} ${tab.label}`.toLowerCase(),
  })),
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResultItem {
  id: string;
  label: string;
  sub?: string;
  href: string;
  group: string;
  icon: React.ElementType;
  badge?: string;
  keywords?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildResults(data: {
  clients: Array<{ id: string; name: string; email?: string | null; company?: string | null; classification?: string }>;
  projects: Array<{ id: string; name: string; status?: string; clients?: { name: string } | null }>;
  invoices: Array<{ id: string; invoice_number?: string | null; status?: string; total?: number | null; clients?: { name: string } | null }>;
  posts: Array<{ id: string; caption: string; status?: string; platforms?: string[] | null }>;
}): ResultItem[] {
  const items: ResultItem[] = [];

  data.clients.forEach((c) => items.push({
    id: `client-${c.id}`,
    label: c.name,
    sub: [c.company, c.email].filter(Boolean).join(" · "),
    href: `/admin/clients`,
    group: "Clients",
    icon: User,
    badge: c.classification,
  }));

  data.projects.forEach((p) => items.push({
    id: `project-${p.id}`,
    label: p.name,
    sub: p.clients?.name,
    href: `/admin/projects`,
    group: "Projects",
    icon: FolderOpen,
    badge: p.status,
  }));

  data.invoices.forEach((inv) => items.push({
    id: `invoice-${inv.id}`,
    label: inv.invoice_number ?? inv.id.slice(0, 8),
    sub: inv.clients?.name,
    href: `/admin/invoices`,
    group: "Invoices",
    icon: FileText,
    badge: inv.status,
  }));

  data.posts.forEach((p) => items.push({
    id: `post-${p.id}`,
    label: p.caption.slice(0, 70) + (p.caption.length > 70 ? "…" : ""),
    sub: (p.platforms ?? []).join(", "),
    href: `/admin/social`,
    group: "Social posts",
    icon: Hash,
    badge: p.status?.replace(/_/g, " "),
  }));

  return items;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-md border border-border bg-background text-[10px] font-medium text-muted-foreground font-sans">
      {children}
    </kbd>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Open/close ──
  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setActiveIdx(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  // ── Global shortcuts & custom event ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => { if (prev) { closePalette(); return false; } openPalette(); return true; });
      }
      if (e.key === "Escape") closePalette();
    }
    function onCustom() { openPalette(); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onCustom);
    };
  }, [openPalette, closePalette]);

  // ── Focus input when opened ──
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok) {
          setResults(buildResults(data));
          setActiveIdx(0);
        }
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Flat navigable list: matching pages first, then records ──
  const q = query.trim().toLowerCase();
  const pages = q ? JUMP_ITEMS.filter((n) => n.keywords?.includes(q)).map((n) => ({ ...n, group: "Pages" })) : JUMP_ITEMS;
  const allItems: ResultItem[] = q.length >= 2 ? [...pages, ...results] : pages;

  // ── Keyboard navigation ──
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allItems[activeIdx];
      if (item) navigate(item.href);
    }
  }

  // ── Scroll active item into view ──
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function navigate(href: string) {
    router.push(href);
    closePalette();
  }

  // ── Group results ──
  const groups: Record<string, ResultItem[]> = {};
  allItems.forEach((item) => {
    (groups[item.group] ??= []).push(item);
  });

  let flatIdx = 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[3px] animate-in fade-in duration-150" onClick={closePalette} />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search or jump to"
        className="relative w-full max-w-xl bg-popover text-popover-foreground rounded-2xl ring-1 ring-border shadow-[0_24px_64px_-16px_rgba(11,17,32,0.45)] overflow-hidden flex flex-col animate-in fade-in zoom-in-[0.98] slide-in-from-top-2 duration-150"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            data-slot="command-input"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search clients, projects, invoices or jump to a page"
            aria-label="Search"
            className="flex-1 h-full min-w-0 bg-transparent border-0 text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading && (
            <div className="size-4 border-2 border-border border-t-brand-gold rounded-full animate-spin shrink-0" />
          )}
          {!loading && query && (
            <button
              onClick={() => { setQuery(""); setActiveIdx(0); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            >
              <X size={14} />
            </button>
          )}
          <button onClick={closePalette} className="hidden sm:inline-flex shrink-0" aria-label="Close">
            <Kbd>esc</Kbd>
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto scrollbar-overlay max-h-[min(440px,60vh)] p-2">
          {allItems.length === 0 && (q.length < 2 || !loading) && (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-foreground">No matches for &quot;{query}&quot;</p>
              <p className="text-xs text-muted-foreground mt-1">Try a client name, project or invoice number.</p>
            </div>
          )}

          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="mb-1 last:mb-0">
              <p className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {groupName}
              </p>
              {items.map((item) => {
                const idx = flatIdx++;
                const isActive = activeIdx === idx;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    onMouseMove={() => { if (!isActive) setActiveIdx(idx); }}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "group w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors",
                      isActive ? "bg-brand-gold/12 dark:bg-white/[0.06]" : "hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isActive ? "bg-brand-gold text-brand-navy" : "bg-muted text-muted-foreground"
                    )}>
                      <item.icon size={15} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">{item.label}</span>
                      {item.sub && <span className="block text-xs text-muted-foreground truncate">{item.sub}</span>}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize shrink-0">
                        {item.badge}
                      </span>
                    )}
                    <CornerDownLeft size={14} className={cn("shrink-0 text-muted-foreground", isActive ? "opacity-100" : "opacity-0")} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint bar */}
        <div className="hidden sm:flex border-t border-border bg-muted/40 px-4 h-10 items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> to open</span>
          <span className="flex items-center gap-1.5 ml-auto"><Kbd>⌘</Kbd><Kbd>K</Kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
}
