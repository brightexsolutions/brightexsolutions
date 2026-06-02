"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Plus, Pencil, Trash2, CheckCircle2, Clock, Loader2, Eye, Calendar, Hash, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = ["All Posts", "Pending Approval", "Approved", "Posted"] as const;
type Tab = (typeof tabs)[number];

const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin"] as const;

const defaultForm = { caption: "", hashtags: "", platforms: [] as string[], scheduled_at: "", notes: "" };

const statusColors: Record<string, string> = {
  draft: "bg-slate-400/10 text-slate-500 border-slate-200 dark:border-slate-700",
  pending_approval: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  approved: "bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  posted: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  archived: "bg-muted text-muted-foreground border-border",
};

type SocialPost = {
  id: string;
  caption: string;
  platforms: string[];
  hashtags?: string[] | null;
  scheduled_at?: string | null;
  status: string;
  notes?: string | null;
  posted_at?: string | null;
  created_at: string;
};

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SocialMediaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("All Posts");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SocialPost | null>(null);
  const [detailPost, setDetailPost] = useState<SocialPost | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/social");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setPosts(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setError("");
    setOpen(true);
  }

  function openEdit(post: SocialPost) {
    setEditTarget(post);
    setForm({
      caption: post.caption,
      hashtags: (post.hashtags ?? []).join(" "),
      platforms: post.platforms ?? [],
      scheduled_at: toLocalDatetime(post.scheduled_at),
      notes: post.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const hashtags = form.hashtags
        .split(/[\s,]+/)
        .map((h) => h.trim().replace(/^#+/, ""))
        .filter(Boolean)
        .map((h) => `#${h}`);

      const payload = {
        caption: form.caption,
        platforms: form.platforms,
        hashtags,
        notes: form.notes || undefined,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
      };

      const url = editTarget ? `/api/admin/social/${editTarget.id}` : "/api/admin/social";
      const method = editTarget ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) { setError(json.error ?? "Failed to save post"); return; }

      if (editTarget) {
        setPosts((prev) => prev.map((p) => p.id === editTarget.id ? { ...p, ...json.data } : p));
      } else {
        setPosts((prev) => [json.data, ...prev]);
      }
      setOpen(false);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => { const next = new Set(prev); busy ? next.add(id) : next.delete(id); return next; });
  }

  async function handleDelete(post: SocialPost) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setBusy(post.id, true);
    try {
      await fetch(`/api/admin/social/${post.id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } finally {
      setBusy(post.id, false);
    }
  }

  async function handleStatusChange(post: SocialPost, status: string) {
    setBusy(post.id, true);
    try {
      const res = await fetch(`/api/admin/social/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const json = await res.json();
        setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, ...json.data } : p));
      }
    } finally {
      setBusy(post.id, false);
    }
  }

  // Derived
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const scheduled = posts.filter((p) => p.scheduled_at && new Date(p.scheduled_at) > now && p.status !== "posted");
  const pending = posts.filter((p) => p.status === "pending_approval");
  const postedRecent = posts.filter((p) => p.status === "posted" && p.posted_at && new Date(p.posted_at) > thirtyDaysAgo);
  const drafts = posts.filter((p) => p.status === "draft");

  const filtered = posts.filter((p) => {
    if (activeTab === "All Posts") return true;
    if (activeTab === "Pending Approval") return p.status === "pending_approval";
    if (activeTab === "Approved") return p.status === "approved";
    if (activeTab === "Posted") return p.status === "posted";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Social Media</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan, approve, and track content across platforms.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />New Post
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Scheduled" value={scheduled.length} icon={Clock} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Pending Approval" value={pending.length} icon={BarChart3} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Posted (30d)" value={postedRecent.length} icon={CheckCircle2} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Drafts" value={drafts.length} icon={BarChart3} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab ? "border-brand-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{tab}</button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 size={16} />{activeTab}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading posts…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No posts{activeTab !== "All Posts" ? ` in ${activeTab.toLowerCase()}` : ""} yet.</p>
              {activeTab === "All Posts" && (
                <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors">
                  <Plus size={13} />New Post
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((post) => (
                <div key={post.id} className="px-6 py-3.5 flex items-center gap-4 group hover:bg-muted/20 transition-colors">
                  {/* Status + platforms */}
                  <div className="w-28 shrink-0">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-medium border capitalize ${statusColors[post.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {post.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {/* Caption preview */}
                  <button onClick={() => setDetailPost(post)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{post.caption}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(post.platforms ?? []).join(", ")}
                      {post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}` : ""}
                      {post.notes ? " · has notes" : ""}
                    </p>
                  </button>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setDetailPost(post)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View details">
                      <Eye size={13} />
                    </button>
                    {post.status === "draft" && (
                      <button onClick={() => handleStatusChange(post, "pending_approval")} disabled={busyIds.has(post.id)} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-medium border border-amber-200 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors disabled:opacity-50">
                        {busyIds.has(post.id) && <Loader2 size={10} className="animate-spin" />}Submit
                      </button>
                    )}
                    {post.status === "pending_approval" && (
                      <button onClick={() => handleStatusChange(post, "approved")} disabled={busyIds.has(post.id)} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors disabled:opacity-50">
                        {busyIds.has(post.id) && <Loader2 size={10} className="animate-spin" />}Approve
                      </button>
                    )}
                    {post.status === "approved" && (
                      <button onClick={() => handleStatusChange(post, "posted")} disabled={busyIds.has(post.id)} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-medium border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-50">
                        {busyIds.has(post.id) && <Loader2 size={10} className="animate-spin" />}Mark Posted
                      </button>
                    )}
                    <button onClick={() => openEdit(post)} disabled={busyIds.has(post.id)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(post)} disabled={busyIds.has(post.id)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                      {busyIds.has(post.id) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <span key={status} className={`px-2.5 py-1 rounded-sm text-xs font-medium border capitalize ${color}`}>
            {status.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {/* Post detail sheet */}
      <Sheet open={!!detailPost} onOpenChange={(v) => !v && setDetailPost(null)}>
        <SheetContent className="w-full sm:max-w-3xl flex flex-col overflow-hidden">
          {detailPost && (
            <>
              {/* Identity header */}
              <div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
                <SheetTitle className="flex items-center gap-2 mb-2">
                  <BarChart3 size={15} className="text-brand-gold" />
                  Post Details
                </SheetTitle>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-medium border capitalize ${statusColors[detailPost.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {detailPost.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(detailPost.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {/* Platforms */}
                <section className="px-6 py-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    {(detailPost.platforms ?? []).map((p) => (
                      <span key={p} className="px-2.5 py-1 rounded-sm text-xs font-medium bg-muted text-muted-foreground capitalize">{p}</span>
                    ))}
                  </div>
                </section>

                {/* Caption */}
                <section className="px-6 py-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Caption</h3>
                  <div className="p-4 rounded-sm bg-muted/40 border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {detailPost.caption}
                  </div>
                </section>

                {/* Hashtags */}
                {detailPost.hashtags && detailPost.hashtags.length > 0 && (
                  <section className="px-6 py-4">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Hash size={11} />Hashtags
                    </h3>
                    <p className="text-sm text-blue-500 dark:text-blue-400 leading-relaxed">{detailPost.hashtags.join(" ")}</p>
                  </section>
                )}

                {/* Schedule */}
                <section className="px-6 py-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Calendar size={11} />Schedule
                  </h3>
                  {detailPost.scheduled_at ? (
                    <p className="text-sm text-foreground">
                      {new Date(detailPost.scheduled_at).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No schedule set</p>
                  )}
                  {detailPost.posted_at && (
                    <p className="text-xs text-emerald-500 mt-1.5">
                      Posted {new Date(detailPost.posted_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </section>

                {/* Notes */}
                {detailPost.notes && (
                  <section className="px-6 py-4">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FileText size={11} />Internal Notes
                    </h3>
                    <div className="p-3 rounded-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {detailPost.notes}
                    </div>
                  </section>
                )}
              </div>

              {/* Sticky footer — actions */}
              <div className="px-6 py-4 border-t border-border bg-card shrink-0 space-y-2">
                {detailPost.status === "draft" && (
                  <button onClick={() => { handleStatusChange(detailPost, "pending_approval"); setDetailPost(null); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-amber-200 text-amber-600 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
                    Submit for Approval
                  </button>
                )}
                {detailPost.status === "pending_approval" && (
                  <button onClick={() => { handleStatusChange(detailPost, "approved"); setDetailPost(null); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                    Approve Post
                  </button>
                )}
                {detailPost.status === "approved" && (
                  <button onClick={() => { handleStatusChange(detailPost, "posted"); setDetailPost(null); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-emerald-200 text-emerald-600 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
                    Mark as Posted
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { openEdit(detailPost); setDetailPost(null); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors">
                    <Pencil size={13} />Edit Post
                  </button>
                  <button onClick={() => { handleDelete(detailPost); setDetailPost(null); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-red-200 dark:border-red-800/30 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                    <Trash2 size={13} />Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Caption *</Label>
              <Textarea rows={4} placeholder="Write your caption…" value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Hashtags <span className="text-muted-foreground font-normal">(space or comma separated)</span></Label>
              <Input placeholder="#brightex #tech #nairobi" value={form.hashtags} onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Platforms *</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button key={p} type="button" onClick={() => togglePlatform(p)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border capitalize transition-colors",
                      form.platforms.includes(p) ? "bg-brand-gold/15 border-brand-gold text-brand-navy dark:text-white" : "border-border text-muted-foreground hover:border-brand-gold/40"
                    )}>{p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled Date &amp; Time</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Internal notes…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.caption || form.platforms.length === 0} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Save as Draft"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
