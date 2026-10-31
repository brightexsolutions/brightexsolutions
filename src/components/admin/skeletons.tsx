import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Placeholder for a list of rows (avatar, two lines, trailing meta) while it loads. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border/60", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn("h-3.5", i % 2 ? "w-1/2" : "w-2/3")} />
            <Skeleton className={cn("h-3", i % 3 ? "w-1/3" : "w-2/5")} />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a row of kanban columns. */
export function BoardSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border p-3 space-y-2.5">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-16 w-full rounded-xl" />
          {i % 2 === 0 && <Skeleton className="h-16 w-full rounded-xl" />}
        </div>
      ))}
    </div>
  );
}
