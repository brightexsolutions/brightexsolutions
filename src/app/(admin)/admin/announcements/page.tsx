"use client";

import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  info: "bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  offer: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  promo: "bg-brand-gold/10 text-brand-gold border-brand-gold/30",
  alert: "bg-red-400/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
};

const locationLabels: Record<string, string> = {
  banner: "Site Banner",
  home_hero: "Home Hero",
  contact_page: "Contact Page",
};

export default function AnnouncementsPage() {
  const [activeOnly, setActiveOnly] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage banners, offers, and promos on the public site.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value="—" icon={Megaphone} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Scheduled" value="—" icon={Megaphone} iconColor="text-blue-400" iconBg="bg-brand-gold/10" />
        <StatCard title="Offers" value="—" icon={Megaphone} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Total" value="—" icon={Megaphone} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveOnly(false)}
          className={cn(
            "px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
            !activeOnly ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        <button
          onClick={() => setActiveOnly(true)}
          className={cn(
            "px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
            activeOnly ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Active Only
        </button>
      </div>

      {/* Display locations guide */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Locations:</span>
        {Object.entries(locationLabels).map(([key, label]) => (
          <span key={key} className="px-2.5 py-1 rounded-sm text-xs font-medium border border-border bg-muted text-muted-foreground">
            {label}
          </span>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone size={16} />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No announcements yet.</p>
            <p className="text-xs mt-1">Create an announcement to display a banner or offer on the public site.</p>
          </div>
        </CardContent>
      </Card>

      {/* Type legend */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Types:</span>
        {Object.entries(typeColors).map(([type, color]) => (
          <span key={type} className={`px-2.5 py-1 rounded-sm text-xs font-medium border capitalize ${color}`}>{type}</span>
        ))}
      </div>
    </div>
  );
}
