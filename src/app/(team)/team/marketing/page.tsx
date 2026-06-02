"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Plus, CheckCircle2, Clock, FileEdit, Eye, Send,
  Camera, Globe, Users, Video, X, Loader2, Calendar,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const tabs = ["My Drafts", "Pending Approval", "Approved", "Scheduled", "Posted"] as const;
type Tab = (typeof tabs)[number];

const STATUS_TAB: Record<string, Tab> = {
  draft: "My Drafts",
  pending_approval: "Pending Approval",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
};

const STATUS_BADGE: Record<string, { label: string; colour: string }> = {
  draft:            { label: "Draft",           colour: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  pending_approval: { label: "Pending",          colour: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved:         { label: "Approved",         colour: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  scheduled:        { label: "Scheduled",        colour: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  posted:           { label: "Posted",           colour: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

const PLATFORM_ICONS: Record<string, typeof Camera> = {
  instagram: Camera,
  facebook: Globe,
  linkedin: Users,
  tiktok: Video,
};

const ALL_PLATFORMS = ["instagram", "facebook", "linkedin", "tiktok"];

type SocialPost = {
  id: string;
  caption: string;
  platforms: string[];
  hashtags: string[];
  scheduled_at: string | null;
  status: string;
  media_urls: string[] | null;
  notes: string | null;
  created_at: string;
  posted_at: string | null;
  created_by: string;
};

type Member = { id: string; name: string; role: string };

const defaultForm = {
  caption: "",
  platforms: [] as string[],
  hashtags: [] as string[],
  scheduled_at: "",
  notes: "",
};

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("My Drafts");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailPost, setDetailPost] = useState<SocialPost | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [hashtagInput, setHashtagInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/social");
      const json = await res.json();
      if (res.ok) {
        setPosts(json.data ?? []);
        setMember(json.member ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const myPosts = posts.filter((p) => p.created_by === member?.id);
  const counts = {
    "My Drafts": posts.filter((p) => p.status === "draft" && p.created_by === member?.id).length,
    "Pending Approval": posts.filter((p) => p.status === "pending_approval").length,
    "Approved": posts.filter((p) => p.status === "approved").length,
    "Scheduled": posts.filter((p) => p.status === "scheduled").length,
    "Posted": posts.filter((p) => p.status === "posted").length,
  };

  function getTabPosts(tab: Tab): SocialPost[] {
    if (tab === "My Drafts") return posts.filter((p) => p.status === "draft" && p.created_by === member?.id);
    const statusKey = Object.entries(STATUS_TAB).find(([, t]) => t === tab)?.[0];
    return statusKey ? posts.filter((p) => p.status === statusKey) : [];
  }

  async function handleSubmitForApproval(post: SocialPost) {
    const res = await fetch(`/api/team/social/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending_approval" }),
    });
    if (res.ok) {
      const json = await res.json();
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, ...json.data } : p));
      setDetailPost((d) => d?.id === post.id ? { ...d, status: "pending_approval" } : d);
    }
  }

  async function handleMarkPosted(post: SocialPost) {
    const res = await fetch(`/api/team/social/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "posted", posted_at: new Date().toISOString() }),
    });
    if (res.ok) {
      const json = await res.json();
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, ...json.data } : p));
      setDetailPost((d) => d?.id === post.id ? { ...d, status: "posted" } : d);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/team/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduled_at: form.scheduled_at || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setPosts((prev) => [json.data, ...prev]);
        setCreateOpen(false);
        setForm(defaultForm);
      }
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  function addHashtag() {
    const tag = hashtagInput.replace(/^#/, "").trim();
    if (tag && !form.hashtags.includes(tag)) {
      setForm((f) => ({ ...f, hashtags: [...f.hashtags, tag] }));
    }
    setHashtagInput("");
  }

  const tabPosts = getTabPosts(activeTab);
  const _ = myPosts.length; // ensure myPosts is not tree-shaken

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Draft posts, submit for approval, and track scheduled content.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
        >
          <Plus size={15} /> New Draft
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: "My Drafts", key: "My Drafts" as Tab, icon: FileEdit, colour: "text-slate-500" },
          { label: "Pending", key: "Pending Approval" as Tab, icon: Clock, colour: "text-amber-500" },
          { label: "Approved", key: "Approved" as Tab, icon: CheckCircle2, colour: "text-emerald-500" },
          { label: "Scheduled", key: "Scheduled" as Tab, icon: Calendar, colour: "text-blue-500" },
          { label: "Posted", key: "Posted" as Tab, icon: BarChart3, colour: "text-purple-500" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            className={cn(
              "rounded-sm border p-3 text-left transition-colors",
              activeTab === s.key
                ? "border-brand-gold/40 bg-brand-gold/5"
                : "border-border bg-card hover:border-brand-gold/20"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={13} className={s.colour} />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-display font-bold text-foreground">{counts[s.key]}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab
                ? "border-brand-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : tabPosts.length === 0 ? (
          <div className="py-12 text-center">
            <BarChart3 size={32} className="mx-auto mb-3 opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {activeTab === "My Drafts" ? "No drafts yet. Create your first post above." : `No ${activeTab.toLowerCase()} posts.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tabPosts.map((post) => {
              const badge = STATUS_BADGE[post.status];
              const isOwn = post.created_by === member?.id;
              return (
                <div key={post.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  {/* Platform icons */}
                  <div className="flex gap-0.5 shrink-0">
                    {(post.platforms ?? []).slice(0, 3).map((p) => {
                      const Icon = PLATFORM_ICONS[p];
                      return Icon ? <Icon key={p} size={13} className="text-muted-foreground" /> : null;
                    })}
                  </div>

                  {/* Caption preview — click to open detail */}
                  <button
                    onClick={() => setDetailPost(post)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm text-foreground truncate">{post.caption}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {post.scheduled_at
                        ? `Scheduled ${new Date(post.scheduled_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}`
                        : new Date(post.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                      {post.hashtags?.length ? ` · ${post.hashtags.length} tags` : ""}
                    </p>
                  </button>

                  {/* Status badge */}
                  <span className={cn("shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold hidden sm:block", badge?.colour)}>
                    {badge?.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setDetailPost(post)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Eye size={13} />
                    </button>
                    {isOwn && post.status === "draft" && (
                      <button
                        onClick={() => void handleSubmitForApproval(post)}
                        className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-brand-gold"
                        title="Submit for approval"
                      >
                        <Send size={13} />
                      </button>
                    )}
                    {post.status === "approved" && (
                      <button
                        onClick={() => void handleMarkPosted(post)}
                        className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-emerald-500"
                        title="Mark as posted"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Sheet ── */}
      <Sheet open={!!detailPost} onOpenChange={(o) => !o && setDetailPost(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {detailPost && (() => {
            const badge = STATUS_BADGE[detailPost.status];
            const isOwn = detailPost.created_by === member?.id;
            return (
              <>
                <SheetHeader className="mb-5">
                  <SheetTitle className="flex items-center gap-2 text-base font-display">
                    <BarChart3 size={16} className="text-brand-gold" />
                    Post Detail
                    <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold", badge?.colour)}>
                      {badge?.label}
                    </span>
                  </SheetTitle>
                </SheetHeader>

                {/* Caption */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Caption</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{detailPost.caption}</p>
                </div>

                {/* Platforms */}
                {detailPost.platforms?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platforms</p>
                    <div className="flex gap-2 flex-wrap">
                      {detailPost.platforms.map((p) => {
                        const Icon = PLATFORM_ICONS[p];
                        return (
                          <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border bg-muted text-xs capitalize">
                            {Icon && <Icon size={12} />} {p}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {detailPost.hashtags?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hashtags</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {detailPost.hashtags.map((h) => (
                        <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                          #{h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule & dates */}
                <div className="mb-5 text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span>{new Date(detailPost.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                  {detailPost.scheduled_at && (
                    <div className="flex justify-between">
                      <span>Scheduled for</span>
                      <span>{new Date(detailPost.scheduled_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  {detailPost.posted_at && (
                    <div className="flex justify-between">
                      <span>Posted at</span>
                      <span>{new Date(detailPost.posted_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {detailPost.notes && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes / Report</p>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-sm p-3 border border-border leading-relaxed">
                      {detailPost.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  {isOwn && detailPost.status === "draft" && (
                    <button
                      onClick={() => void handleSubmitForApproval(detailPost)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
                    >
                      <Send size={14} /> Submit for Approval
                    </button>
                  )}
                  {detailPost.status === "approved" && (
                    <button
                      onClick={() => void handleMarkPosted(detailPost)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 size={14} /> Mark as Posted
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Create Post Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Draft Post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Caption *</Label>
              <Textarea
                placeholder="Write your caption here…"
                rows={4}
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Platforms *</Label>
              <div className="flex gap-2 flex-wrap">
                {ALL_PLATFORMS.map((p) => {
                  const Icon = PLATFORM_ICONS[p];
                  const selected = form.platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors capitalize",
                        selected
                          ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                          : "border-border text-muted-foreground hover:border-brand-gold/40"
                      )}
                    >
                      {Icon && <Icon size={12} />} {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add hashtag (without #)"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
                />
                <button type="button" onClick={addHashtag} className="px-3 rounded-sm border border-border hover:bg-muted text-sm">Add</button>
              </div>
              {form.hashtags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {form.hashtags.map((h) => (
                    <span key={h} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                      #{h}
                      <button type="button" onClick={() => setForm((f) => ({ ...f, hashtags: f.hashtags.filter((x) => x !== h) }))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Schedule Date / Time (optional)</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any context or reporting notes…"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2 rounded-sm border border-border text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || form.platforms.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save Draft
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
