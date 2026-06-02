"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const typeColor: Record<string, string> = {
  project_milestone: "bg-blue-600",
  task_deadline: "bg-amber-400",
  social_post: "bg-purple-500",
  subscription_renewal: "bg-red-500",
  booking: "bg-emerald-500",
  reminder: "bg-slate-400",
};

const typeLabel: Record<string, string> = {
  project_milestone: "Milestone",
  task_deadline: "Task Deadline",
  social_post: "Social Post",
  subscription_renewal: "Renewal",
  booking: "Booking",
  reminder: "Reminder",
};

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthRange(anchor: Date) {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// ─── Mini Calendar Grid ───────────────────────────────────────────────────────

function CalendarGrid({
  events,
  anchor,
  selectedDate,
  onDateSelect,
  onAnchorChange,
}: {
  events: CalendarEvent[];
  anchor: Date;
  selectedDate: Date | null;
  onDateSelect: (d: Date) => void;
  onAnchorChange: (d: Date) => void;
}) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const today = new Date();

  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const k = dateKey(new Date(ev.start_at));
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(ev);
  }

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; currentMonth: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), currentMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), currentMonth: true });
  for (let d = 1; cells.length < 42; d++)
    cells.push({ date: new Date(year, month + 1, d), currentMonth: false });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { const d = new Date(anchor); d.setMonth(d.getMonth() - 1); onAnchorChange(d); }}
          className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {anchor.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => { const d = new Date(anchor); d.setMonth(d.getMonth() + 1); onAnchorChange(d); }}
          className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell, idx) => {
          const k = dateKey(cell.date);
          const dayEvents = byDate.get(k) ?? [];
          const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
          const isToday = isSameDay(cell.date, today);
          const uniqueTypes = [...new Set(dayEvents.map((e) => e.type))].slice(0, 3);
          const col = idx % 7;
          const tooltipAlign = col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";

          return (
            <div key={idx} className="relative group/cell">
              <button
                onClick={() => onDateSelect(cell.date)}
                className={cn(
                  "w-full flex flex-col items-center justify-center py-1.5 rounded-sm text-[12px] transition-colors select-none",
                  cell.currentMonth ? "text-foreground" : "text-muted-foreground/30",
                  isSelected
                    ? "bg-brand-gold text-brand-navy font-bold"
                    : isToday
                      ? "border border-brand-gold text-brand-gold font-semibold"
                      : dayEvents.length > 0 ? "hover:bg-muted" : "hover:bg-muted/50"
                )}
              >
                <span>{cell.date.getDate()}</span>
                {uniqueTypes.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {uniqueTypes.map((type) => (
                      <span key={type} className={cn("w-1.5 h-1.5 rounded-full", typeColor[type] ?? "bg-muted-foreground")} />
                    ))}
                  </div>
                )}
              </button>

              {dayEvents.length > 0 && (
                <div className={cn("absolute z-50 bottom-full mb-2 hidden group-hover/cell:block pointer-events-none w-52", tooltipAlign)}>
                  <div className="bg-popover border border-border rounded-sm shadow-xl p-2.5 text-left">
                    <p className="text-[11px] font-semibold text-foreground mb-2 border-b border-border pb-1">
                      {cell.date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 5).map((ev) => (
                        <div key={ev.id} className="flex items-start gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", typeColor[ev.type] ?? "bg-muted-foreground")} />
                          <p className="text-[11px] text-foreground leading-tight truncate">{ev.title}</p>
                        </div>
                      ))}
                      {dayEvents.length > 5 && (
                        <p className="text-[11px] text-muted-foreground">+{dayEvents.length - 5} more</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend — only show types present in this month */}
      {(() => {
        const presentTypes = [...new Set(events.map((e) => e.type))];
        if (presentTypes.length === 0) return null;
        return (
          <div className="border-t border-border pt-3 flex flex-wrap gap-x-4 gap-y-1">
            {presentTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0", typeColor[type] ?? "bg-muted-foreground")} />
                <span className="text-[11px] text-muted-foreground">{typeLabel[type] ?? type}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamCalendarView({ title, subtitle }: { title: string; subtitle: string }) {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const { from, to } = monthRange(anchorDate);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const res = await fetch(`/api/team/calendar?${params}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) setEvents(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  function handleAnchorChange(d: Date) {
    setAnchorDate(d);
    setSelectedDate(null);
  }

  function handleDateSelect(d: Date) {
    setSelectedDate((prev) => (prev && isSameDay(prev, d) ? null : d));
  }

  const displayedEvents = selectedDate
    ? events.filter((ev) => isSameDay(new Date(ev.start_at), selectedDate))
    : events;

  const sortedEvents = [...displayedEvents].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const upcomingCount = events.filter((e) => new Date(e.start_at) >= new Date()).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">This month</p>
            <p className="text-2xl font-display font-bold text-foreground">{events.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Upcoming</p>
            <p className="text-2xl font-display font-bold text-foreground">{upcomingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* LEFT — event list (read-only) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Calendar size={16} />
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })
                  : anchorDate.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </span>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} />Clear
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : sortedEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">{selectedDate ? "Nothing scheduled for this day." : "Nothing scheduled this month."}</p>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="mt-3 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    View all
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 px-5 py-4">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", typeColor[ev.type] ?? "bg-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeLabel[ev.type] ?? ev.type.replace(/_/g, " ")}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-0.5">
                      <Clock3 size={11} />
                      {ev.all_day
                        ? "All day"
                        : new Date(ev.start_at).toLocaleString("en-KE", {
                            day: "numeric", month: "short",
                            hour: "numeric", minute: "2-digit",
                            timeZone: "Africa/Nairobi",
                          })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — mini calendar grid */}
        <Card>
          <CardContent className="pt-5 pb-4 overflow-visible">
            <CalendarGrid
              events={events}
              anchor={anchorDate}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onAnchorChange={handleAnchorChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
