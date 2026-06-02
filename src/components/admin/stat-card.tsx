import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({ title, value, sub, icon: Icon, trend, iconColor = "text-brand-gold", iconBg = "bg-brand-gold/10" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-display font-bold text-foreground leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center shrink-0", iconBg)}>
            <Icon size={16} className={iconColor} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
