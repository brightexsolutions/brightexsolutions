"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, ArrowRight, LayoutDashboard, Users, FolderOpen,
  FileText, CreditCard, DollarSign, Rss, Package, BookOpen,
  BarChart3, Megaphone, Globe, UserCheck, MessageSquare,
  ScrollText, Calendar, TrendingUp, User, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Quick nav shown when query is empty ─────────────────────────────────────

const QUICK_NAV = [
  { label: "Dashboard",      href: "/admin",               icon: LayoutDashboard },
  { label: "Clients",        href: "/admin/clients",        icon: Users },
  { label: "Sales Pipeline", href: "/admin/sales",          icon: TrendingUp },
  { label: "Bookings",       href: "/admin/bookings",       icon: BookOpen },
  { label: "Projects",       href: "/admin/projects",       icon: FolderOpen },
  { label: "Invoices",       href: "/admin/invoices",       icon: FileText },
  { label: "Payments",       href: "/admin/payments",       icon: CreditCard },
  { label: "Finance",        href: "/admin/finance",        icon: DollarSign },
  { label: "Subscriptions",  href: "/admin/subscriptions",  icon: Rss },
  { label: "Products",       href: "/admin/products",       icon: Package },
  { label: "Social Media",   href: "/admin/social",         icon: BarChart3 },
  { label: "Announcements",  href: "/admin/announcements",  icon: Megaphone },
  { label: "Portfolio",      href: "/admin/portfolio",      icon: Globe },
  { label: "Brixo Chat",     href: "/admin/chat",           icon: MessageSquare },
  { label: "Team",           href: "/admin/team",           icon: UserCheck },
  { label: "Site Monitoring",href: "/admin/sites",          icon: Globe },
  { label: "Calendar",       href: "/admin/calendar",       icon: Calendar },
  { label: "Activity Log",   href: "/admin/logs",           icon: ScrollText },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResultItem {
  id: string;
  label: string;
  sub?: string;
  href: string;
  group: string;
  icon: React.ElementType;
  badge?: string;
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
    group: "Social Posts",
    icon: Hash,
    badge: p.status?.replace(/_/g, " "),
  }));

  return items;
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

  // ── Flat navigable list ──
  const quickFiltered = query.trim()
    ? QUICK_NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_NAV;

  const allItems: Array<{ label: string; sub?: string; href: string; icon: React.ElementType; badge?: string; group?: string }> =
    query.trim() && query.length >= 2
      ? results
      : quickFiltered.map((n) => ({ ...n, group: "Quick Navigation" }));

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
  const groups: Record<string, typeof allItems> = {};
  allItems.forEach((item) => {
    const g = ("group" in item && item.group) ? item.group : "Results";
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  let flatIdx = 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePalette} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to…"
            className="flex-1 py-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-border border-t-brand-gold rounded-full animate-spin shrink-0" />
          )}
          {!loading && query && (
            <button onClick={() => { setQuery(""); setActiveIdx(0); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground shrink-0">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono border border-border shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto scrollbar-overlay max-h-[400px] py-1">
          {allItems.length === 0 && query.length >= 2 && !loading && (
            <p className="text-center text-sm text-muted-foreground py-10">
              No results for &quot;{query}&quot;
            </p>
          )}

          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {groupName}
              </p>
              {items.map((item) => {
                const idx = flatIdx++;
                const isActive = activeIdx === idx;
                return (
                  <button
                    key={("id" in item ? String(item.id) : item.href)}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isActive ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      isActive ? "bg-brand-gold/20" : "bg-muted"
                    )}>
                      <item.icon size={13} className={isActive ? "text-brand-gold" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.label}</p>
                      {item.sub && <p className="text-xs text-muted-foreground truncate">{item.sub}</p>}
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground font-medium capitalize shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ArrowRight size={13} className="text-brand-gold shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint bar */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="bg-muted border border-border px-1 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted border border-border px-1 py-0.5 rounded font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted border border-border px-1 py-0.5 rounded font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
