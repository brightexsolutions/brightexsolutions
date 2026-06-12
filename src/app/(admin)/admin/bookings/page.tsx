"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Clock, CheckCircle2, XCircle, Pencil, Trash2, Loader2, Bell, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, StatusDot, type Column, type RowAction } from "@/components/admin/data-table";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";
import { useConfirm } from "@/components/admin/confirm-dialog";

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

const STATUS_FILTER = {
  key: "status",
  label: "Status",
  options: [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ],
};

const filters = ["all", ...Object.keys(statusColors)] as const;
type Filter = (typeof filters)[number];

type Booking = {
  id: string;
  booker_name: string;
  booker_email: string;
  booker_phone?: string | null;
  purpose: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  status: string;
  meeting_link?: string | null;
  notes?: string | null;
  created_at: string;
};

const defaultEditForm = { meeting_link: "", notes: "", status: "" };

export default function BookingsPage() {
  const confirm = useConfirm();
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/bookings");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(json.error ?? "Unable to load bookings."); return; }
      setBookings(json.data ?? []);
    } catch {
      setLoadError("Network error. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patchBooking(id: string, patch: Record<string, string | undefined>) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Failed to update booking");
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, ...data.data } : b));
    return data.data as Booking;
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => { const next = new Set(prev); busy ? next.add(id) : next.delete(id); return next; });
  }

  async function handleStatusChange(booking: Booking, status: string) {
    setBusy(booking.id, true);
    try {
      await patchBooking(booking.id, { status });
    } catch {
      setLoadError("Unable to update booking status.");
    } finally {
      setBusy(booking.id, false);
    }
  }

  async function handleDelete(booking: Booking) {
    if (!await confirm({ message: `Delete booking from ${booking.booker_name}? This cannot be undone.` })) return;
    setBusy(booking.id, true);
    try {
      await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } finally {
      setBusy(booking.id, false);
    }
  }

  async function notifyBooking(booking: Booking, channel: "email" | "whatsapp") {
    setBusy(booking.id, true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const json = await res.json().catch(() => ({}));

      if (channel === "whatsapp") {
        if (json.whatsapp_link) window.open(json.whatsapp_link, "_blank", "noopener,noreferrer");
        return;
      }

      // Email channel
      if (!json.emailSent && json.whatsapp_link) {
        const fallback = window.confirm("Email could not be sent. Open WhatsApp to notify manually?");
        if (fallback) window.open(json.whatsapp_link, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(booking.id, false);
    }
  }

  function openEdit(booking: Booking) {
    setEditTarget(booking);
    setEditForm({
      meeting_link: booking.meeting_link ?? "",
      notes: booking.notes ?? "",
      status: booking.status,
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await patchBooking(editTarget.id, {
        status: editForm.status || undefined,
        meeting_link: editForm.meeting_link || undefined,
        notes: editForm.notes || undefined,
      });
      setEditTarget(null);
    } catch {
      setLoadError("Unable to save booking changes.");
    } finally {
      setSaving(false);
    }
  }

  const filteredBookings = bookings.filter((b) =>
    (activeFilter === "all" || b.status === activeFilter) &&
    (!statusFilter || b.status === statusFilter)
  );
  const now = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(now.getDate() + 7);
  const thisWeek = bookings.filter((b) => {
    const scheduled = new Date(b.scheduled_at);
    return scheduled >= now && scheduled <= weekAhead;
  }).length;

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Pending" value={bookings.filter((b) => b.status === "pending").length} icon={Clock} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Confirmed" value={bookings.filter((b) => b.status === "confirmed").length} icon={CheckCircle2} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="This Week" value={thisWeek} icon={BookOpen} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Completed" value={bookings.filter((b) => b.status === "completed").length} icon={XCircle} />
      </div>

      {loadError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-500 text-center">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "booker_name",
              label: "Booker",
              sortable: true,
              render: (row) => (
                <StackedCell
                  primary={String(row.booker_name)}
                  secondary={String(row.booker_email ?? "")}
                />
              ),
            },
            {
              key: "purpose",
              label: "Purpose",
              render: (row) => (
                <span className="text-sm capitalize">
                  {purposeLabels[String(row.purpose)] ?? String(row.purpose ?? "—").replace(/_/g, " ")}
                </span>
              ),
            },
            {
              key: "scheduled_at",
              label: "Scheduled",
              sortable: true,
              render: (row) => (
                <span className="text-sm whitespace-nowrap">
                  {new Date(String(row.scheduled_at)).toLocaleString("en-KE", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi",
                  })}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusDot status={String(row.status)} />,
            },
            {
              key: "actions_inline",
              label: "",
              className: "w-36",
              render: (row) => {
                const b = row as unknown as Booking;
                return (
                  <div className="flex items-center gap-1">
                    {b.status === "pending" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(b, "confirmed"); }}
                        disabled={busyIds.has(b.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                      >
                        {busyIds.has(b.id) ? <Loader2 size={10} className="animate-spin" /> : null} Confirm
                      </button>
                    )}
                    {b.status === "confirmed" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          disabled={busyIds.has(b.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-brand-gold/10 text-brand-gold border border-brand-gold/20 hover:bg-brand-gold/20 transition-colors disabled:opacity-50"
                        >
                          {busyIds.has(b.id) ? <Loader2 size={10} className="animate-spin" /> : <Bell size={10} />}
                          Notify
                          <ChevronDown size={9} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onSelect={() => notifyBooking(b, "email")} className="gap-2 cursor-pointer">
                            <Mail size={13} className="text-muted-foreground" />
                            Email confirmation
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => notifyBooking(b, "whatsapp")} className="gap-2 cursor-pointer">
                            <MessageCircle size={13} className="text-muted-foreground" />
                            WhatsApp message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filteredBookings as unknown as Record<string, unknown>[]}
          actions={[
            {
              label: "Edit",
              icon: <Pencil size={13} />,
              onClick: (row) => openEdit(row as unknown as Booking),
            },
            {
              label: "Delete",
              icon: <Trash2 size={13} />,
              destructive: true,
              onClick: (row) => handleDelete(row as unknown as Booking),
            },
          ]}
          searchable
          searchPlaceholder="Search bookings…"
          searchKeys={["booker_name", "booker_email", "purpose"]}
          filters={[STATUS_FILTER]}
          activeFilters={{ status: statusFilter }}
          onFilterChange={(_, v) => setStatusFilter(v)}
          maxHeight="520px"
          emptyMessage={loading ? "Loading bookings…" : "No bookings yet."}
        />
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking — {editTarget?.booker_name}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {Object.keys(statusColors).map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-link">Meeting Link</Label>
                <Input
                  id="bk-link"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={editForm.meeting_link}
                  onChange={(e) => setEditForm((f) => ({ ...f, meeting_link: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-notes">Notes</Label>
                <Textarea
                  id="bk-notes"
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
