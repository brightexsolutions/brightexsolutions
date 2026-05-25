import type { Metadata } from "next";
import { BookOpen, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Bookings | Admin" };

const statusColors: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  confirmed: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  cancelled: "bg-red-400/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
  completed: "bg-muted text-muted-foreground border-border",
};

const purposeLabels: Record<string, string> = {
  intro_call: "Intro Call",
  project_review: "Project Review",
  consultation: "Consultation",
  other: "Other",
};

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage incoming meeting requests from the public booking page.</p>
        </div>
        <a
          href="/book"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-brand-gold/40 text-brand-gold font-semibold text-sm hover:bg-brand-gold/10 transition-colors"
        >
          <BookOpen size={15} />
          View /book page
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Pending" value="—" icon={Clock} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Confirmed" value="—" icon={CheckCircle2} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="This Week" value="—" icon={BookOpen} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Completed" value="—" icon={XCircle} />
      </div>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        <button className="px-3 py-1.5 rounded-sm text-xs font-medium bg-muted text-foreground border-transparent border">All</button>
        {Object.keys(statusColors).map((s) => (
          <button key={s} className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground capitalize transition-colors">
            {s}
          </button>
        ))}
      </div>

      {/* Booking list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen size={16} />
            Upcoming Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No bookings yet.</p>
            <p className="text-xs mt-1">Share <strong>/book</strong> to start receiving meeting requests.</p>
          </div>
        </CardContent>
      </Card>

      {/* Status + purpose legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusColors).map(([status, color]) => (
                <span key={status} className={`px-2.5 py-1 rounded-sm text-xs font-medium border capitalize ${color}`}>{status}</span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Meeting Purposes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.values(purposeLabels).map((label) => (
                <span key={label} className="px-2.5 py-1 rounded-sm text-xs font-medium border border-border bg-muted text-muted-foreground">{label}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
