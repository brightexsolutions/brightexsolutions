"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Clock, CheckCircle2, XCircle, Pencil, Trash2, Loader2, Bell, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

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
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
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
    if (!confirm(`Delete booking from ${booking.booker_name}? This cannot be undone.`)) return;
    setBusy(booking.id, true);
    try {
      await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } finally {
      setBusy(booking.id, false);
    }
  }

  async function notifyBooking(booking: Booking) {
    setBusy(booking.id, true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/notify`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (json.whatsapp_link) {
        window.open(json.whatsapp_link, "_blank", "noopener,noreferrer");
      }
      if (!json.emailSent) {
        alert("Email could not be sent — WhatsApp opened so you can notify manually.");
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

  const filteredBookings = bookings.filter((b) => activeFilter === "all" || b.status === activeFilter);
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

      <div className="flex gap-1 flex-wrap">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-3 py-1.5 rounded-sm text-xs font-medium border capitalize transition-colors",
              activeFilter === filter
                ? "bg-muted text-foreground border-transparent"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen size={16} />
            Bookings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Loading bookings…</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No bookings yet.</p>
              <p className="text-xs mt-1">Share <strong>/book</strong> to start receiving meeting requests.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 flex items-start gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-foreground">{booking.booker_name}</p>
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium border capitalize ${statusColors[booking.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {booking.booker_email}
                      {booking.booker_phone ? ` · ${booking.booker_phone}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {purposeLabels[booking.purpose] ?? booking.purpose} ·{" "}
                      {new Date(booking.scheduled_at).toLocaleString("en-KE", {
                        dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi",
                      })}
                    </p>
                    {booking.meeting_link && (
                      <a href={booking.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-brand-gold mt-1 inline-block">
                        Open meeting link
                      </a>
                    )}
                    {booking.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{booking.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    {booking.status === "pending" && (
                      <button
                        onClick={() => handleStatusChange(booking, "confirmed")}
                        disabled={busyIds.has(booking.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {busyIds.has(booking.id) ? <Loader2 size={10} className="animate-spin" /> : null}
                        Confirm
                      </button>
                    )}
                    {booking.status === "confirmed" && (
                      <>
                        <button
                          onClick={() => notifyBooking(booking)}
                          disabled={busyIds.has(booking.id)}
                          title="Send confirmation email + open WhatsApp"
                          className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium bg-brand-gold/10 text-brand-navy dark:text-brand-gold border border-brand-gold/30 hover:bg-brand-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busyIds.has(booking.id) ? <Loader2 size={10} className="animate-spin" /> : <Bell size={10} />}
                          Notify
                        </button>
                        <button
                          onClick={() => handleStatusChange(booking, "completed")}
                          disabled={busyIds.has(booking.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busyIds.has(booking.id) ? <Loader2 size={10} className="animate-spin" /> : null}
                          Complete
                        </button>
                      </>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {booking.status === "confirmed" && booking.booker_phone && (
                        <a
                          href={`https://wa.me/${booking.booker_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${booking.booker_name}, just a reminder about your booking with ${SITE_NAME}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="WhatsApp booker"
                        >
                          <MessageCircle size={13} />
                        </a>
                      )}
                      <button onClick={() => openEdit(booking)} disabled={busyIds.has(booking.id)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(booking)} disabled={busyIds.has(booking.id)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                        {busyIds.has(booking.id) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
