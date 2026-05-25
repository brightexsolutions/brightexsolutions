"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const eventTypeColors = [
  { type: "Project milestones", color: "bg-brand-navy dark:bg-brand-navy-light" },
  { type: "Task deadlines", color: "bg-brand-gold" },
  { type: "Social posts", color: "bg-purple-500" },
  { type: "Subscriptions", color: "bg-red-500" },
  { type: "Bookings", color: "bg-emerald-500" },
  { type: "Reminders", color: "bg-slate-400" },
];

const views = ["Month", "Week", "Day"] as const;
type View = (typeof views)[number];

export default function CalendarPage() {
  const [view, setView] = useState<View>("Month");

  const now = new Date();
  const monthName = now.toLocaleString("en-KE", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Unified view of all deadlines, bookings, and events.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          Add Event
        </button>
      </div>

      {/* View toggle + navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-sm border border-border hover:bg-muted transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center">{monthName}</span>
          <button className="p-2 rounded-sm border border-border hover:bg-muted transition-colors">
            <ChevronRight size={14} />
          </button>
          <button className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-2">
            Today
          </button>
        </div>

        <div className="flex gap-1">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
                view === v
                  ? "bg-muted text-foreground border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={16} />
            {view} View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-muted-foreground">
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Calendar renders here</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              FullCalendar will populate with task due dates, project milestones, bookings, subscription renewals, and social post schedules once Supabase is connected.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Event type legend */}
      <div className="flex gap-3 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Legend:</span>
        {eventTypeColors.map((e) => (
          <div key={e.type} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", e.color)} />
            <span className="text-xs text-muted-foreground">{e.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
