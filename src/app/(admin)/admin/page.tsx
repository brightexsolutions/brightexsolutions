import type { Metadata } from "next";
import {
  FolderOpen, Users, FileText, AlertTriangle, CheckCircle2,
  TrendingUp, DollarSign, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard | Admin" };

const kpiCards = [
  {
    title: "Active Projects",
    value: "—",
    icon: FolderOpen,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    sub: "Connect Supabase to populate",
  },
  {
    title: "Active Clients",
    value: "—",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-400/10",
    sub: "Total active engagements",
  },
  {
    title: "Open Invoices",
    value: "—",
    icon: FileText,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    sub: "Awaiting payment",
  },
  {
    title: "MRR",
    value: "KES —",
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    sub: "Monthly recurring revenue",
  },
];

const recentActivity = [
  { icon: CheckCircle2, color: "text-green-400", text: "Admin dashboard initialised", time: "just now" },
  { icon: TrendingUp, color: "text-blue-400", text: "Connect Supabase to see live data", time: "" },
  { icon: Clock, color: "text-amber-400", text: "Configure cron-job.org for monitoring", time: "" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* System health strip */}
      <div className="flex items-center gap-3 p-4 rounded-sm bg-emerald-950/40 border border-emerald-800/40 text-sm">
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        <span className="text-emerald-300 font-medium">All systems operational</span>
        <span className="text-muted-foreground ml-auto text-xs">
          Connect Supabase to enable live monitoring
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-sm ${card.bg} flex items-center justify-center`}>
                <card.icon size={15} className={card.color} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold text-foreground mb-1">
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon size={15} className={`${item.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.text}</p>
                  {item.time && <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Live activity log available once Supabase is connected.
            </p>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Project", href: "/admin/projects" },
                { label: "New Invoice", href: "/admin/invoices" },
                { label: "Add Client", href: "/admin/clients" },
                { label: "Check Sites", href: "/admin/sites" },
                { label: "Record Payment", href: "/admin/payments" },
                { label: "Invite Team", href: "/admin/team" },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-center px-3 py-2.5 rounded-sm border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-brand-gold/40 transition-colors"
                >
                  {action.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup notice */}
      <Card className="border-amber-800/30 bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300 mb-1">Setup required</p>
              <p className="text-sm text-muted-foreground">
                Add Supabase URL and keys to <code className="text-amber-300 text-xs bg-amber-950/60 px-1.5 py-0.5 rounded">.env.local</code> to enable database features. Until then, the dashboard renders in preview mode.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
