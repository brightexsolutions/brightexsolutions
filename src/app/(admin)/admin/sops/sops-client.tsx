"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Search, ExternalLink, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SopListEntry {
  key: string;
  label: string;
  summary: string;
  category: string;
  area: string;
  revision: string;
  reference: string;
  searchText: string;
}

const CATEGORY_BLURB: Record<string, string> = {
  Lifecycle: "How every engagement runs, start to finish.",
  Commercial: "Quoting, agreements and getting paid.",
  Delivery: "How the work itself is run, per type of project.",
};

export function SopsPageClient({ entries, categories }: { entries: SopListEntry[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (category && e.category !== category) return false;
      if (!q) return true;
      return e.searchText.includes(q);
    });
  }, [entries, query, category]);

  const grouped = categories
    .map((c) => ({ category: c, items: filtered.filter((e) => e.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Standard Operating Procedures</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How Brightex handles clients and runs each kind of project. These are the standing procedures, version
          controlled and always current.
        </p>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search procedures, e.g. data migration, revisions, overdue..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCategory("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              !category ? "border-brand-gold bg-brand-gold/10 text-brand-navy dark:text-brand-gold" : "border-border text-muted-foreground hover:border-foreground/30"
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? "" : c)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                category === c ? "border-brand-gold bg-brand-gold/10 text-brand-navy dark:text-brand-gold" : "border-border text-muted-foreground hover:border-foreground/30"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No procedure matches that search.</p>
        </Card>
      )}

      {grouped.map((group) => (
        <div key={group.category} className="space-y-3">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-brand-gold">{group.category}</h2>
            {CATEGORY_BLURB[group.category] && (
              <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_BLURB[group.category]}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map((entry) => (
              <Card key={entry.key} className="p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <ClipboardList size={14} className="text-brand-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">{entry.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                      {entry.reference} · Rev {entry.revision}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-1">
                  <a
                    href={`/api/admin/sops/${entry.key}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink size={12} />Read
                  </a>
                  <a
                    href={`/api/admin/sops/${entry.key}/view?print=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download size={12} />PDF
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
