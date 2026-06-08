"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const eventTypes = [
  { value: "project_milestone", label: "Project Milestone" },
  { value: "task_deadline", label: "Task Deadline" },
  { value: "social_post", label: "Social Post" },
  { value: "subscription_renewal", label: "Subscription Renewal" },
  { value: "booking", label: "Booking" },
  { value: "reminder", label: "Reminder / Personal" },
];

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
  task_deadline: "Task",
  social_post: "Post",
  subscription_renewal: "Renewal",
  booking: "Booking",
  reminder: "Reminder",
};

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const emptyForm = {
  title: "", description: "", type: "reminder", start_at: "", end_at: "", all_day: false,
};

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

type FormState = typeof emptyForm;

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

// Append +03:00 (EAT) to a bare datetime-local value so Zod's offset: true parses it
function toDateTimeValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00+03:00` : value;
}

// Convert a date-only string (YYYY-MM-DD) to EAT noon for storage
function toDateOnlyValue(value: string) {
  return `${value}T12:00:00+03:00`;
}

// Extract YYYY-MM-DD for a date input from an ISO string
function toDateInputValue(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

// Extract YYYY-MM-DDTHH:MM for a datetime-local input from an ISO string
function toDateTimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tz = Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", minute: "numeric", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const parts = Object.fromEntries(tz.map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${pad(parseInt(parts.hour))}:${parts.minute}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

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

  // Group events by normalised date key
  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const k = dateKey(new Date(ev.start_at));
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(ev);
  }

  // Build grid cells (42 = 6 rows × 7 cols, always)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; currentMonth: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), currentMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), currentMonth: true });
  for (let d = 1; cells.length < 42; d++)
    cells.push({ date: new Date(year, month + 1, d), currentMonth: false });

  const prevMonth = () => {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() - 1);
    onAnchorChange(d);
  };
  const nextMonth = () => {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + 1);
    onAnchorChange(d);
  };

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {anchor.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell, idx) => {
          const k = dateKey(cell.date);
          const dayEvents = byDate.get(k) ?? [];
          const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
          const isToday = isSameDay(cell.date, today);
          const uniqueTypes = [...new Set(dayEvents.map((e) => e.type))].slice(0, 3);
          const col = idx % 7;
          const tooltipAlign = col <= 1
            ? "left-0 translate-x-0"
            : col >= 5
              ? "right-0 translate-x-0"
              : "left-1/2 -translate-x-1/2";

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
                      : dayEvents.length > 0
                        ? "hover:bg-muted"
                        : "hover:bg-muted/50"
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

              {/* Hover tooltip */}
              {dayEvents.length > 0 && (
                <div
                  className={cn(
                    "absolute z-50 bottom-full mb-2 hidden group-hover/cell:block pointer-events-none w-52",
                    tooltipAlign,
                  )}
                >
                  <div className="bg-popover border border-border rounded-sm shadow-xl p-2.5 text-left">
                    <p className="text-[11px] font-semibold text-foreground mb-2 border-b border-border pb-1">
                      {cell.date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 6).map((ev) => (
                        <div key={ev.id} className="flex items-start gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", typeColor[ev.type] ?? "bg-muted-foreground")} />
                          <div className="min-w-0">
                            <p className="text-[11px] text-foreground leading-tight truncate">{ev.title}</p>
                            <p className="text-[10px] text-muted-foreground">{typeLabel[ev.type] ?? ev.type}</p>
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 6 && (
                        <p className="text-[11px] text-muted-foreground pt-0.5">+{dayEvents.length - 6} more</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-border pt-3 grid grid-cols-2 gap-1">
        {Object.entries(typeLabel).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", typeColor[type] ?? "bg-muted-foreground")} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Event Form ───────────────────────────────────────────────────────────────

function EventForm({
  form,
  setForm,
  onSubmit,
  saving,
  error,
  submitLabel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error: string;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-2">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-sm">{error}</div>
      )}
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          placeholder="Event title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {eventTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* All-day toggle */}
      <div className="flex items-center gap-2">
        <input
          id="all_day"
          type="checkbox"
          checked={form.all_day}
          onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked, start_at: "", end_at: "" }))}
          className="rounded border-input"
        />
        <Label htmlFor="all_day" className="font-normal">All-day event</Label>
      </div>

      {/* Date / time inputs — adapt based on all_day */}
      {form.all_day ? (
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={form.start_at}
            onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
            required
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Start</Label>
            <Input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>End <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          rows={2}
          placeholder="Any additional details…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving || !form.title || !form.start_at} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { from, to } = monthRange(anchorDate);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`/api/admin/calendar?${params}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) setEvents(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [from.toISOString(), to.toISOString(), refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  function handleAnchorChange(d: Date) {
    setAnchorDate(d);
    setSelectedDate(null);
  }

  function handleDateSelect(d: Date) {
    setSelectedDate((prev) => (prev && isSameDay(prev, d) ? null : d));
  }

  // Events shown in the list panel
  const displayedEvents = selectedDate
    ? events.filter((ev) => isSameDay(new Date(ev.start_at), selectedDate))
    : events;

  const sortedEvents = [...displayedEvents].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  // ── Add ────────────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError("");
    try {
      const payload = {
        ...addForm,
        start_at: addForm.all_day ? toDateOnlyValue(addForm.start_at) : toDateTimeValue(addForm.start_at),
        end_at: addForm.end_at ? toDateTimeValue(addForm.end_at) : undefined,
      };
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(json.error ?? "Failed to save event");
        return;
      }
      setAddForm(emptyForm);
      setAddOpen(false);
      setRefreshToken((c) => c + 1);
    } finally {
      setAddSaving(false);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function openEdit(ev: CalendarEvent) {
    setEditingEvent(ev);
    setEditForm({
      title: ev.title,
      description: ev.description ?? "",
      type: ev.type,
      all_day: ev.all_day,
      start_at: ev.all_day
        ? toDateInputValue(ev.start_at)
        : toDateTimeInputValue(ev.start_at),
      end_at: ev.end_at ? toDateTimeInputValue(ev.end_at) : "",
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setEditSaving(true);
    setEditError("");
    try {
      const payload = {
        ...editForm,
        start_at: editForm.all_day ? toDateOnlyValue(editForm.start_at) : toDateTimeValue(editForm.start_at),
        end_at: editForm.end_at ? toDateTimeValue(editForm.end_at) : null,
      };
      const res = await fetch(`/api/admin/calendar/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(json.error ?? "Failed to update event");
        return;
      }
      setEditOpen(false);
      setRefreshToken((c) => c + 1);
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/calendar/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      setRefreshToken((c) => c + 1);
    } finally {
      setDeleting(false);
    }
  }

  const upcomingCount = events.filter((e) => new Date(e.start_at) >= new Date()).length;
  const bookingCount = events.filter((e) => e.type === "booking").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Unified view of all deadlines, bookings, and events.</p>
        </div>
        <button
          onClick={() => { setAddForm(emptyForm); setAddError(""); setAddOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
        >
          <Plus size={15} />Add Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Events this month", value: events.length },
          { label: "Upcoming", value: upcomingCount },
          { label: "Bookings", value: bookingCount },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-display font-bold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* LEFT — event list */}
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
              <div className="py-12 text-center text-sm text-muted-foreground">Loading events…</div>
            ) : sortedEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  {selectedDate ? "No events on this day." : "No events this month."}
                </p>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="mt-3 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
                  >
                    View all events
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 px-5 py-4 group/row">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", typeColor[ev.type] ?? "bg-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {typeLabel[ev.type] ?? ev.type.replace(/_/g, " ")}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 size={11} />
                        {ev.all_day
                          ? "All day"
                          : new Date(ev.start_at).toLocaleString("en-KE", {
                              day: "numeric", month: "short",
                              hour: "numeric", minute: "2-digit",
                              timeZone: "Africa/Nairobi",
                            })}
                      </div>
                      {/* Edit / delete — appear on row hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(ev)}
                          className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit event"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteId(ev.id)}
                          className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete event"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — visual calendar grid */}
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

      {/* Add Event dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setAddError(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <EventForm
            form={addForm}
            setForm={setAddForm}
            onSubmit={handleAdd}
            saving={addSaving}
            error={addError}
            submitLabel="Add Event"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Event dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditError(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          <EventForm
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleEdit}
            saving={editSaving}
            error={editError}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Event</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">This event will be permanently removed. This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
