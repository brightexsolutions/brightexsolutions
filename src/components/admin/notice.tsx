import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  info:    { icon: Info,          cls: "bg-blue-500/10 text-blue-900 dark:text-blue-200" },
  warning: { icon: AlertTriangle, cls: "bg-amber-500/12 text-amber-900 dark:text-amber-200" },
  error:   { icon: AlertCircle,   cls: "bg-red-500/10 text-red-800 dark:text-red-200" },
} as const;

/** One-line tonal banner for page-level messages. Keeps notices compact instead of card-sized. */
export function Notice({
  tone = "info", children, action, className,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-center gap-3 min-h-11 px-4 py-2 rounded-2xl text-sm", cls, className)}>
      <Icon size={16} className="shrink-0" />
      <p className="flex-1 min-w-0">{children}</p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
