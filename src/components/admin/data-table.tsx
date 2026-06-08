"use client";

import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
};

export function StatusDot({ status }: { status: string }) {
  const dot = STATUS_STYLES[status.toLowerCase()] ?? "bg-muted-foreground/50";
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", dot)} />
      <span className="capitalize text-sm text-foreground">{status.replace(/_/g, " ")}</span>
    </span>
  );
}

// ─── Column definition ────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  label: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

// ─── Action item ─────────────────────────────────────────────────────────────

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  /** Per-row action menu items */
  actions?: RowAction<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No records found.",
  actions,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
            {actions && <th className="px-4 py-3 w-10" />}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-border/60 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/40",
                  !onRowClick && "hover:bg-muted/20"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5 align-middle", col.className)}>
                    {col.render ? col.render(row) : <span className="text-foreground">{String(row[col.key] ?? "—")}</span>}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <MoreHorizontal size={15} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {actions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => action.onClick(row)}
                            className={action.variant === "destructive" ? "text-red-600 focus:text-red-600" : ""}
                          >
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
  );
}

// ─── Stacked cell helper ──────────────────────────────────────────────────────
// Use in a column's render() to show two lines of text stacked in one cell.

export function StackedCell({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm font-medium text-foreground truncate">{primary}</span>
      {secondary && (
        <span className="text-xs text-muted-foreground truncate">{secondary}</span>
      )}
    </div>
  );
}
