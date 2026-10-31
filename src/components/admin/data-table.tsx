"use client";

import { useState, useMemo, useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Search, X, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Check, Download } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Status dot ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  completed:   "bg-emerald-500",
  paid:        "bg-emerald-500",
  active:      "bg-emerald-500",
  confirmed:   "bg-emerald-500",
  accepted:    "bg-emerald-500",
  signed:      "bg-emerald-500",
  viewed:      "bg-blue-500",
  discovery:   "bg-slate-400",
  design:      "bg-sky-500",
  live:        "bg-emerald-500",
  pending:     "bg-amber-400",
  sent:        "bg-amber-400",
  draft:       "bg-slate-400",
  in_progress: "bg-blue-400",
  development: "bg-blue-400",
  review:      "bg-purple-400",
  partial:     "bg-amber-500",
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
  partial:     "Partial Payment",
  new:         "New",
  won:         "Won",
  lost:        "Lost",
};

export function StatusDot({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const dot = STATUS_STYLES[key] ?? "bg-muted-foreground";
  return (
    <span className="relative inline-flex w-fit self-start items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-full isolate">
      {/* Tint: the dot colour at low opacity behind the label */}
      <span aria-hidden className={cn("absolute inset-0 -z-10 rounded-full opacity-15", dot)} />
      <span className={cn("inline-block size-1.5 rounded-full shrink-0", dot)} />
      <span className="text-xs font-medium text-foreground capitalize whitespace-nowrap">
        {STATUS_LABELS[key] ?? status.replace(/_/g, " ")}
      </span>
    </span>
  );
}

// ─── Stacked cell ─────────────────────────────────────────────────────────────

// Stable tint per name, so the same client always gets the same avatar colour
const AVATAR_TINTS = [
  "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  "bg-blue-500/15 text-blue-800 dark:text-blue-200",
  "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const tint = AVATAR_TINTS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <span aria-hidden className={cn("size-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", tint, className)}>
      {initials}
    </span>
  );
}

export function StackedCell({ primary, secondary, mono, avatar }: {
  primary: string;
  secondary?: string;
  mono?: boolean;
  /** Name to draw an initials avatar for */
  avatar?: string;
}) {
  if (avatar) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={avatar} />
        <StackedCell primary={primary} secondary={secondary} mono={mono} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={cn("text-sm font-medium text-foreground truncate leading-snug", mono && "tabular-nums tracking-tight")}>{primary}</span>
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
  /** Right-align numbers so they line up for scanning */
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
}

export interface RowAction<T extends Record<string, unknown>> {
  label: string | ((row: T) => string);
  icon?: React.ReactNode | ((row: T) => React.ReactNode);
  onClick: (row: T) => void;
  destructive?: boolean;
  hidden?: (row: T) => boolean;
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
  /** Searchable keys: if omitted all string values are searched */
  searchKeys?: string[];
  /** Filter chip configs */
  filters?: FilterConfig[];
  /** Active filter value: one per filter key */
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  /** Fixed height container height, e.g. "420px" */
  maxHeight?: string;
  /** Extra toolbar content (rendered to the right of search) */
  toolbar?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
  /** Rows per page. Pass 0 to show everything. */
  pageSize?: number;
  /** Shows a CSV export button; the value is the file name without extension */
  exportName?: string;
  /** Size the table to the space left in the viewport so the page itself does not scroll */
  fill?: boolean;
  /** First load in progress: shows skeleton rows instead of the empty message */
  loading?: boolean;
}

const SKELETON_ROWS = 6;
const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5", "w-1/3"];

const PAGE_SIZES = [10, 25, 50, 100];

function compareValues(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const na = Number(a), nb = Number(b);
  if (a !== "" && b !== "" && a != null && b != null && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

function csvCell(v: unknown) {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Height left for the table inside #admin-main, so long lists scroll inside
 * the table and the header, toolbar and pagination stay on screen.
 */
function useFillHeight(enabled: boolean, layoutKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    const main = document.getElementById("admin-main");
    if (!el || !main) return;

    function measure() {
      if (!el || !main) return;
      // Phones get stacked cards and normal page scrolling instead
      if (window.innerWidth < 768) { setHeight(null); return; }
      const mainRect = main.getBoundingClientRect();
      const top = el.getBoundingClientRect().top - mainRect.top + main.scrollTop;
      const padBottom = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      // Footer (pagination) sits below the scroll area inside the same card
      const footer = el.nextElementSibling as HTMLElement | null;
      const footerH = footer?.offsetHeight ?? 0;
      // Whatever the page renders after the table (card borders, padding, notes) also has to fit
      const below = Math.max(0, main.scrollHeight - padBottom - (top + el.offsetHeight + footerH));
      const available = main.clientHeight - top - padBottom - footerH - below;
      setHeight(Math.max(available, 280));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [enabled, layoutKey]);

  return { ref, height };
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, actions, emptyMessage = "No results.",
  searchable, searchPlaceholder = "Search…", searchKeys,
  filters, activeFilters, onFilterChange,
  maxHeight, toolbar, onRowClick, className,
  pageSize: initialPageSize = 25, exportName, fill = true, loading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(0);

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
        const c = compareValues(a[sort.key], b[sort.key]);
        return sort.dir === "asc" ? c : -c;
      });
    }
    return rows;
  }, [data, search, searchable, searchKeys, sort]);

  // Back to the first page when the query changes (not on data refreshes, so
  // editing a row on page 3 keeps you on page 3). Adjusting state during
  // render is React's recommended alternative to a resetting effect.
  const queryKey = `${search}|${sort?.key}:${sort?.dir}|${pageSize}|${JSON.stringify(activeFilters ?? {})}`;
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (lastQueryKey !== queryKey) {
    setLastQueryKey(queryKey);
    setPage(0);
  }

  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visible = pageSize > 0 ? filtered.slice(safePage * pageSize, safePage * pageSize + pageSize) : filtered;
  const { ref: scrollRef, height: fillHeight } = useFillHeight(fill && !maxHeight, `${visible.length}:${filters?.length ?? 0}:${loading}`);

  function exportCsv() {
    const header = columns.map((c) => csvCell(c.label)).join(",");
    const lines = filtered.map((row) => columns.map((c) => csvCell(row[c.key])).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === "asc" ? { key, dir: "desc" } : null
        : { key, dir: "asc" }
    );
  }

  const hasToolbar = searchable || (filters && filters.length > 0) || toolbar || exportName;

  return (
    <div data-table="" className={cn("flex flex-col", className)}>
      {/* ── Toolbar ── */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-3">
          {searchable && (
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full h-10 pl-9 pr-8 rounded-full bg-muted/70 text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring focus:bg-background transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Filter chips */}
          {filters?.map((f) => (
            <div key={f.key} role="group" aria-label={f.label} className="flex items-center gap-1.5 flex-wrap">
                {f.options.map((opt) => {
                  const isActive = activeFilters?.[f.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onFilterChange?.(f.key, isActive ? "" : opt.value)}
                      aria-pressed={isActive}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors",
                        isActive
                          ? "bg-brand-gold/20 text-foreground border-transparent"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {isActive && <Check size={14} className="-ml-0.5" />}
                      {opt.label}
                    </button>
                  );
                })}
            </div>
          ))}

          {(toolbar || exportName) && (
            <div className="ml-auto flex items-center gap-2">
              {toolbar}
              {exportName && (
                <button
                  onClick={exportCsv}
                  disabled={filtered.length === 0}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  <Download size={14} /> Export
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Phone layout: one card per row ── */}
      <ul className="md:hidden border-t border-border divide-y divide-border" aria-busy={loading && data.length === 0}>
        {loading && data.length === 0 ? (
          Array.from({ length: 4 }, (_, i) => (
            <li key={`sk-${i}`} className="px-4 py-3.5 space-y-2.5">
              <Skeleton className="h-4 w-2/3" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))
        ) : visible.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : emptyMessage}
          </li>
        ) : visible.map((row, idx) => {
          const [first, ...rest] = columns;
          const rowActions = actions?.filter((a) => !a.hidden?.(row)) ?? [];
          return (
            <li
              key={String(row.id ?? idx)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("px-4 py-3", onRowClick && "active:bg-muted/60")}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {first.render ? first.render(row) : <span className="text-sm font-medium">{String(row[first.key] ?? "-")}</span>}
                </div>
                {rowActions.length > 0 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="Row actions" className="size-9 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <MoreHorizontal size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {rowActions.map((action, ai) => (
                          <DropdownMenuItem
                            key={ai}
                            onClick={() => action.onClick(row)}
                            className={cn(action.destructive && "text-destructive focus:text-destructive")}
                          >
                            {typeof action.label === "function" ? action.label(row) : action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              {rest.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {rest.filter((c) => c.label).map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground truncate">{col.label}</dt>
                      <dd className="text-sm min-w-0 truncate">
                        {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Table ── */}
      <div
        ref={scrollRef}
        className="hidden md:block overflow-auto scrollbar-overlay border-t border-border"
        style={maxHeight ? { maxHeight } : fillHeight ? { maxHeight: fillHeight } : undefined}
      >
        <table className="w-full min-w-[480px] text-sm table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/70 backdrop-blur supports-[backdrop-filter]:bg-muted/60 shadow-[inset_0_-1px_0_var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 sm:px-4 h-11 text-xs font-semibold text-muted-foreground whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                    col.className
                  )}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  aria-sort={sort?.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
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
              {actions && <th className="w-12 px-3 sm:px-4 py-2.5" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody aria-busy={loading && data.length === 0}>
            {loading && data.length === 0 ? (
              Array.from({ length: SKELETON_ROWS }, (_, r) => (
                <tr key={`sk-${r}`} className="border-b border-border/60 last:border-0">
                  {columns.map((col, c) => (
                    <td key={col.key} className={cn("px-3 sm:px-4 py-3.5", col.className)}>
                      {col.label ? (
                        <div className="space-y-1.5">
                          <Skeleton className={cn("h-3.5", SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length])} />
                          {c === 0 && <Skeleton className="h-3 w-1/3" />}
                        </div>
                      ) : null}
                    </td>
                  ))}
                  {actions && <td className="px-3 sm:px-4" />}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {search ? `No results for "${search}"` : emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr
                  key={String(row.id ?? idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-0",
                    // Gold accent bar on the hovered row, drawn without shifting layout
                    "hover:shadow-[inset_3px_0_0_var(--color-brand-gold)]",
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-3 sm:px-4 py-3 align-middle", col.align === "right" && "text-right tabular-nums", col.className)}>
                      {col.render ? col.render(row) : (
                        <span className="text-sm text-foreground">
                          {String(row[col.key] ?? "-")}
                        </span>
                      )}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <MoreHorizontal size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {actions.filter((a) => !a.hidden?.(row)).map((action, ai) => (
                            <DropdownMenuItem
                              key={ai}
                              onClick={() => action.onClick(row)}
                              className={cn(action.destructive && "text-destructive focus:text-destructive")}
                            >
                              {(() => {
                                const icon = typeof action.icon === "function" ? action.icon(row) : action.icon;
                                return icon ? <span className="mr-2 flex items-center">{icon}</span> : null;
                              })()}
                              {typeof action.label === "function" ? action.label(row) : action.label}
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

      {/* ── Footer: count + pagination ── */}
      {data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 h-11 px-4 border-t border-border text-xs text-muted-foreground">
          <span>
            {filtered.length === data.length
              ? `${data.length} record${data.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${data.length} records`}
          </span>
          {pageSize > 0 && (
            <div className="flex items-center gap-3">
              <label className="hidden sm:flex items-center gap-1.5">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded-full border border-border bg-background pl-2.5 pr-1 text-xs text-foreground"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <span className="tabular-nums">
                {filtered.length === 0 ? "0" : `${safePage * pageSize + 1}–${Math.min(filtered.length, (safePage + 1) * pageSize)}`} of {filtered.length}
              </span>
              <div className="flex items-center">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                  className="size-7 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= pageCount - 1}
                  aria-label="Next page"
                  className="size-7 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
