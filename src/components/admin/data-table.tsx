"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Status dot ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  completed:   "bg-emerald-500",
  paid:        "bg-emerald-500",
  active:      "bg-emerald-500",
  confirmed:   "bg-emerald-500",
  live:        "bg-emerald-500",
  pending:     "bg-amber-400",
  sent:        "bg-amber-400",
  draft:       "bg-slate-400",
  in_progress: "bg-blue-400",
  development: "bg-blue-400",
  review:      "bg-purple-400",
  overdue:     "bg-red-500",
  cancelled:   "bg-red-400",
  lost:        "bg-red-400",
  new:         "bg-brand-gold",
  qualified:   "bg-blue-500",
  won:         "bg-emerald-500",
  ghost:       "bg-slate-300",
  unknown:     "bg-slate-400",
  down:        "bg-red-500",
  degraded:    "bg-amber-400",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  new:         "New",
  won:         "Won",
  lost:        "Lost",
};

export function StatusDot({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", STATUS_STYLES[key] ?? "bg-muted-foreground")} />
      <span className="text-xs text-foreground capitalize">
        {STATUS_LABELS[key] ?? status.replace(/_/g, " ")}
      </span>
    </span>
  );
}

// ─── Stacked cell ─────────────────────────────────────────────────────────────

export function StackedCell({ primary, secondary, mono }: {
  primary: string;
  secondary?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={cn("text-sm font-medium text-foreground truncate leading-snug", mono && "font-mono")}>{primary}</span>
      {secondary && <span className="text-xs text-muted-foreground truncate leading-snug">{secondary}</span>}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T extends Record<string, unknown>> {
  key: string;
  label: string;
  className?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface RowAction<T extends Record<string, unknown>> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  destructive?: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

// ─── DataTable ────────────────────────────────────────────────────────────────

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  actions?: RowAction<T>[];
  emptyMessage?: string;
  /** Enable client-side search across all string values */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Searchable keys — if omitted all string values are searched */
  searchKeys?: string[];
  /** Filter chip configs */
  filters?: FilterConfig[];
  /** Active filter value — one per filter key */
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  /** Fixed height container height, e.g. "420px" */
  maxHeight?: string;
  /** Extra toolbar content (rendered to the right of search) */
  toolbar?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, actions, emptyMessage = "No results.",
  searchable, searchPlaceholder = "Search…", searchKeys,
  filters, activeFilters, onFilterChange,
  maxHeight, toolbar, onRowClick, className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  // Client-side search
  const filtered = useMemo(() => {
    let rows = data;
    if (searchable && search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((row) => {
        const keys = searchKeys ?? Object.keys(row);
        return keys.some((k) => {
          const v = row[k];
          return typeof v === "string" && v.toLowerCase().includes(q);
        });
      });
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const va = String(a[sort.key] ?? "").toLowerCase();
        const vb = String(b[sort.key] ?? "").toLowerCase();
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return rows;
  }, [data, search, searchable, searchKeys, sort]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === "asc" ? { key, dir: "desc" } : null
        : { key, dir: "asc" }
    );
  }

  const hasToolbar = searchable || (filters && filters.length > 0) || toolbar;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* ── Toolbar ── */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
          {searchable && (
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Filter chips */}
          {filters?.map((f) => (
            <div key={f.key} className="flex items-center gap-0">
              <span className="text-xs text-muted-foreground mr-1.5">{f.label}:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {f.options.map((opt) => {
                  const isActive = activeFilters?.[f.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onFilterChange?.(f.key, isActive ? "" : opt.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                        isActive
                          ? "bg-brand-gold/15 text-brand-gold border-brand-gold/30"
                          : "bg-transparent text-muted-foreground border-border hover:border-brand-gold/30 hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* ── Table ── */}
      <div
        className={cn("overflow-y-auto", maxHeight && "overflow-y-auto")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/60 dark:bg-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                    col.className
                  )}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sort?.key === col.key
                        ? sort.dir === "asc"
                          ? <ChevronUp size={11} className="text-brand-gold" />
                          : <ChevronDown size={11} className="text-brand-gold" />
                        : <ChevronsUpDown size={11} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              {actions && <th className="w-12 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {search ? `No results for "${search}"` : emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr
                  key={String(row.id ?? idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-0",
                    onRowClick ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/20"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 align-middle", col.className)}>
                      {col.render ? col.render(row) : (
                        <span className="text-sm text-foreground">
                          {String(row[col.key] ?? "—")}
                        </span>
                      )}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <MoreHorizontal size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {actions.map((action, ai) => (
                            <DropdownMenuItem
                              key={ai}
                              onClick={() => action.onClick(row)}
                              className={cn(action.destructive && "text-destructive focus:text-destructive")}
                            >
                              {action.icon && <span className="mr-2 flex items-center">{action.icon}</span>}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer: result count ── */}
      {searchable && data.length > 0 && (
        <div className="px-4 py-2 border-t border-border/60 text-[11px] text-muted-foreground">
          {filtered.length === data.length
            ? `${data.length} record${data.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${data.length} records`}
        </div>
      )}
    </div>
  );
}
