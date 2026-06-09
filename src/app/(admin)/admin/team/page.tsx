"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Shield, MoreVertical, CheckCircle2,
  AlertTriangle, Power, Trash2, Phone, Mail,
  ExternalLink, Tag, DollarSign, Calendar,
  ChevronRight, Clock, RefreshCw, X, LogIn,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TeamInviteModal } from "@/components/admin/team-invite-modal";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";

// ─── Permission definitions ────────────────────────────────────────────────────

type PermGroup = { label: string; key: string; defaultValue: boolean; description: string };

const ROLE_PERMISSIONS: Record<string, { heading: string; groups: PermGroup[] }> = {
  subcontractor: {
    heading: "What can this subcontractor access?",
    groups: [
      { key: "upload_deliverables", label: "Upload deliverables", defaultValue: true, description: "Can attach files and URLs to their assigned tasks" },
      { key: "see_project_brief", label: "View project brief", defaultValue: true, description: "Can read the project description and notes" },
      { key: "see_project_budget", label: "View project budget", defaultValue: false, description: "Can see the budget figure on their projects" },
      { key: "see_other_tasks", label: "See all project tasks", defaultValue: false, description: "Can view tasks assigned to others on the same project" },
    ],
  },
  marketing: {
    heading: "What can this marketing member access?",
    groups: [
      { key: "create_post_drafts", label: "Create social post drafts", defaultValue: true, description: "Can write and submit posts for approval" },
      { key: "approve_posts", label: "Approve posts", defaultValue: false, description: "Can approve and schedule posts (usually admin-only)" },
      { key: "create_announcements", label: "Draft announcements", defaultValue: true, description: "Can create announcement drafts for admin review" },
      { key: "view_analytics", label: "View analytics data", defaultValue: false, description: "Can see site analytics and engagement metrics" },
    ],
  },
  finance: {
    heading: "What can this finance member access?",
    groups: [
      { key: "view_income", label: "View income records", defaultValue: true, description: "Can see all income and payment records" },
      { key: "view_expenses", label: "View expense records", defaultValue: true, description: "Can see all business expenses" },
      { key: "add_expenses", label: "Add expenses", defaultValue: true, description: "Can record new business expenses with receipts" },
      { key: "add_income", label: "Add manual income", defaultValue: false, description: "Can manually record income not tied to an invoice" },
      { key: "view_invoices", label: "View invoices", defaultValue: true, description: "Can see invoice details (read-only, cannot send)" },
      { key: "view_payments", label: "View payment records", defaultValue: true, description: "Can see client payment records" },
      { key: "export_reports", label: "Export reports", defaultValue: true, description: "Can download P&L and tax summary reports" },
    ],
  },
  support: {
    heading: "What can this support member access?",
    groups: [
      { key: "view_clients", label: "View client directory", defaultValue: true, description: "Can see the full client list and contact details" },
      { key: "view_pipeline", label: "View sales pipeline", defaultValue: true, description: "Can see deals and their current stage" },
      { key: "send_communications", label: "Send communications", defaultValue: true, description: "Can send emails to clients and log WhatsApp messages" },
      { key: "log_calls", label: "Log calls and meetings", defaultValue: true, description: "Can add call and meeting notes to client records" },
      { key: "update_pipeline", label: "Update deal notes", defaultValue: false, description: "Can add follow-up notes to deals (cannot change stage)" },
      { key: "view_bookings", label: "View bookings", defaultValue: true, description: "Can see scheduled bookings and meeting details" },
    ],
  },
};

const ROLE_PORTAL: Record<string, { path: string; colour: string; bg: string }> = {
  subcontractor: { path: "/work", colour: "text-blue-500 dark:text-blue-400", bg: "bg-blue-400/10" },
  marketing: { path: "/team/marketing", colour: "text-purple-500 dark:text-purple-400", bg: "bg-purple-400/10" },
  finance: { path: "/team/finance", colour: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-400/10" },
  support: { path: "/team/support", colour: "text-rose-500 dark:text-rose-400", bg: "bg-rose-400/10" },
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  skill_tags?: string[];
  rate_type?: string;
  default_rate?: number;
  notes?: string;
  active: boolean;
  permissions?: Record<string, boolean>;
  user_id?: string | null;
  created_at: string;
};

type PendingInvite = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
};

export default function AdminTeamPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<"members" | "invites">("members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [permMember, setPermMember] = useState<TeamMember | null>(null);
  const [detailMember, setDetailMember] = useState<TeamMember | null>(null);
  const [permEdits, setPermEdits] = useState<Record<string, boolean>>({});
  const [permSaving, setPermSaving] = useState(false);
  const [permSaved, setPermSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/team");
      const json = await res.json();
      if (res.ok) setMembers(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const res = await fetch("/api/admin/team/invite");
      const json = await res.json();
      if (res.ok) setInvites(json.data ?? []);
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadInvites(); }, [load, loadInvites]);

  async function resendInvite(invite: PendingInvite) {
    setResendingId(invite.id);
    try {
      await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: invite.name, email: invite.email, role: invite.role }),
      });
      await loadInvites();
    } finally {
      setResendingId(null);
    }
  }

  async function revokeInvite(invite: PendingInvite) {
    if (!await confirm({ title: "Revoke invite", message: `Revoke the pending invite for ${invite.name} (${invite.email})?`, confirmLabel: "Revoke", variant: "warning" })) return;
    setRevokingId(invite.id);
    try {
      await fetch(`/api/admin/team/invite?id=${invite.id}`, { method: "DELETE" });
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } finally {
      setRevokingId(null);
    }
  }

  function openPermissions(member: TeamMember) {
    const defs = ROLE_PERMISSIONS[member.role]?.groups ?? [];
    const initial: Record<string, boolean> = {};
    for (const g of defs) {
      initial[g.key] = member.permissions?.[g.key] ?? g.defaultValue;
    }
    setPermEdits(initial);
    setPermMember(member);
    setPermSaved(false);
  }

  async function savePermissions() {
    if (!permMember) return;
    setPermSaving(true);
    try {
      const res = await fetch(`/api/admin/team/${permMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permEdits }),
      });
      if (res.ok) {
        setPermSaved(true);
        setMembers((prev) => prev.map((m) => m.id === permMember.id ? { ...m, permissions: permEdits } : m));
      }
    } finally {
      setPermSaving(false);
    }
  }

  async function toggleActive(member: TeamMember) {
    setMenuOpen(null);
    await fetch(`/api/admin/team/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, active: !m.active } : m));
    if (detailMember?.id === member.id) setDetailMember((d) => d ? { ...d, active: !d.active } : null);
  }

  async function loginAsMember(member: TeamMember) {
    setMenuOpen(null);
    setImpersonatingId(member.id);
    try {
      const res = await fetch(`/api/admin/team/${member.id}/impersonate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed to generate login link."); return; }
      // Build the /auth/impersonate URL with token + email + destination portal.
      // The page calls verifyOtp directly — no Supabase redirect URL whitelist required.
      const params = new URLSearchParams({ token: json.token, next: json.next });
      window.open(`/auth/impersonate?${params.toString()}`, "_blank", "noopener,noreferrer");
    } finally {
      setImpersonatingId(null);
    }
  }

  async function removeMember(member: TeamMember) {
    setMenuOpen(null);
    if (!await confirm({ message: `Permanently remove ${member.name} from the team? This cannot be undone.` })) return;
    await fetch(`/api/admin/team/${member.id}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    if (detailMember?.id === member.id) setDetailMember(null);
  }

  const active = members.filter((m) => m.active);
  const inactive = members.filter((m) => !m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage subcontractors, marketing, and finance team members.</p>
        </div>
        <TeamInviteModal onInviteSent={loadInvites} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: members.length, colour: "text-foreground" },
          { label: "Active", value: active.length, colour: "text-emerald-500" },
          { label: "Inactive", value: inactive.length, colour: "text-muted-foreground" },
          { label: "Pending Invites", value: invites.length, colour: "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-sm border border-border bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={cn("text-2xl font-bold font-display", s.colour)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "members", label: "Members", count: members.length },
          { key: "invites", label: "Pending Invitations", count: invites.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "members" | "invites")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-brand-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === t.key ? "bg-brand-gold/20 text-brand-gold" : "bg-muted text-muted-foreground"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Members tab ──────────────────────────────────────────────────── */}
      {tab === "members" && (
        <>
          {!loading && members.length === 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Invite your first team member to enable portal access and permission management.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Users size={16} />Active Members</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
              ) : active.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Users size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No active team members yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {active.map((m) => (
                    <MemberRow key={m.id} member={m} menuOpen={menuOpen === m.id}
                      impersonating={impersonatingId === m.id}
                      onMenu={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                      onDetail={() => { setDetailMember(m); setMenuOpen(null); }}
                      onPermissions={() => { openPermissions(m); setMenuOpen(null); }}
                      onToggleActive={() => toggleActive(m)}
                      onRemove={() => removeMember(m)}
                      onLoginAs={() => loginAsMember(m)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {inactive.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground"><Users size={16} />Inactive Members</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {inactive.map((m) => (
                    <MemberRow key={m.id} member={m} menuOpen={menuOpen === m.id}
                      impersonating={impersonatingId === m.id}
                      onMenu={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                      onDetail={() => { setDetailMember(m); setMenuOpen(null); }}
                      onPermissions={() => { openPermissions(m); setMenuOpen(null); }}
                      onToggleActive={() => toggleActive(m)}
                      onRemove={() => removeMember(m)}
                      onLoginAs={() => loginAsMember(m)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Pending Invitations tab ──────────────────────────────────────── */}
      {tab === "invites" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invitesLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : invites.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Clock size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No pending invitations. Everyone has joined.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invites.map((invite) => {
                  const portal = ROLE_PORTAL[invite.role];
                  const sentDate = new Date(invite.created_at).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  return (
                    <div key={invite.id} className="flex items-center gap-4 px-5 py-3.5">
                      {/* Avatar */}
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold opacity-60", portal?.bg ?? "bg-muted", portal?.colour ?? "text-muted-foreground")}>
                        {invite.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{invite.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                      </div>

                      {/* Role badge */}
                      <span className={cn("hidden sm:block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0", portal?.bg ?? "bg-muted", portal?.colour ?? "text-muted-foreground")}>
                        {invite.role}
                      </span>

                      {/* Sent date */}
                      <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock size={10} />Sent {sentDate}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => resendInvite(invite)}
                          disabled={resendingId === invite.id}
                          title="Resend invite email"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={11} className={resendingId === invite.id ? "animate-spin" : ""} />
                          {resendingId === invite.id ? "Sending…" : "Resend"}
                        </button>
                        <button
                          onClick={() => revokeInvite(invite)}
                          disabled={revokingId === invite.id}
                          title="Revoke this invitation"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-red-200 dark:border-red-800/30 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                        >
                          <X size={11} />Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detailMember} onOpenChange={(v) => !v && setDetailMember(null)}>
        <SheetContent className="w-full sm:max-w-3xl flex flex-col overflow-hidden">
          {detailMember && (
            <MemberDetailPanel
              member={detailMember}
              impersonating={impersonatingId === detailMember.id}
              onPermissions={() => { openPermissions(detailMember); setDetailMember(null); }}
              onToggleActive={() => toggleActive(detailMember)}
              onRemove={() => removeMember(detailMember)}
              onLoginAs={() => loginAsMember(detailMember)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Permissions Dialog */}
      <Dialog open={!!permMember} onOpenChange={(v) => !v && setPermMember(null)}>
        <DialogContent className="max-w-lg">
          {permMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield size={16} className="text-brand-gold" />
                  Permissions — {permMember.name}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-1 mb-3 flex items-center gap-2">
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize", ROLE_PORTAL[permMember.role]?.bg, ROLE_PORTAL[permMember.role]?.colour)}>
                  {permMember.role}
                </span>
                <span className="text-xs text-muted-foreground">Portal: <code className="text-xs bg-muted px-1 py-0.5 rounded">{ROLE_PORTAL[permMember.role]?.path ?? "—"}</code></span>
              </div>
              {ROLE_PERMISSIONS[permMember.role] ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">{ROLE_PERMISSIONS[permMember.role].heading}</p>
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {ROLE_PERMISSIONS[permMember.role].groups.map((g) => (
                      <label key={g.key} className="flex items-start justify-between gap-4 p-3 rounded-sm border border-border bg-background cursor-pointer hover:bg-muted/40 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{g.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                        </div>
                        <div className="relative mt-0.5 shrink-0">
                          <input type="checkbox" checked={permEdits[g.key] ?? g.defaultValue}
                            onChange={(e) => setPermEdits((p) => ({ ...p, [g.key]: e.target.checked }))}
                            className="sr-only peer" />
                          <div className="w-9 h-5 rounded-full bg-muted peer-checked:bg-brand-gold transition-colors" />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                    {permSaved ? (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-500"><CheckCircle2 size={14} /> Permissions saved</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Changes apply on next login</span>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setPermMember(null)} className="px-4 py-2 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors">Close</button>
                      <button onClick={savePermissions} disabled={permSaving} className="px-4 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60">
                        {permSaving ? "Saving…" : "Save Permissions"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No configurable permissions for this role.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Member Row (list style) ───────────────────────────────────────────────────

function MemberRow({ member, menuOpen, impersonating, onMenu, onDetail, onPermissions, onToggleActive, onRemove, onLoginAs }: {
  member: TeamMember;
  menuOpen: boolean;
  impersonating: boolean;
  onMenu: () => void;
  onDetail: () => void;
  onPermissions: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  onLoginAs: () => void;
}) {
  const portal = ROLE_PORTAL[member.role];
  const permDefs = ROLE_PERMISSIONS[member.role]?.groups ?? [];
  const enabledCount = permDefs.filter((g) => member.permissions?.[g.key] ?? g.defaultValue).length;

  return (
    <div className={cn("flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group", !member.active && "opacity-55")}>
      {/* Avatar */}
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", portal?.bg ?? "bg-muted", portal?.colour ?? "text-muted-foreground")}>
        {member.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + meta */}
      <button onClick={onDetail} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{member.name}</p>
          {!member.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">inactive</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}{member.phone ? ` · ${member.phone}` : ""}</p>
      </button>

      {/* Skill tags — hidden on small screens */}
      <div className="hidden lg:flex items-center gap-1 flex-wrap max-w-[200px]">
        {(member.skill_tags ?? []).slice(0, 3).map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-muted text-muted-foreground">{tag}</span>
        ))}
      </div>

      {/* Role badge */}
      <span className={cn("hidden sm:block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0", portal?.bg ?? "bg-muted", portal?.colour ?? "text-muted-foreground")}>
        {member.role}
      </span>

      {/* Rate */}
      {member.default_rate ? (
        <span className="hidden md:block text-xs text-muted-foreground shrink-0">
          KES {Number(member.default_rate).toLocaleString()}{member.rate_type === "hourly" ? "/hr" : ""}
        </span>
      ) : null}

      {/* Permissions pill */}
      {permDefs.length > 0 && (
        <button onClick={onPermissions} className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-sm border border-transparent hover:border-border transition-colors">
          <Shield size={11} className="text-brand-gold" />
          {enabledCount}/{permDefs.length}
        </button>
      )}

      {/* Joined */}
      <span className="hidden xl:block text-xs text-muted-foreground shrink-0">
        {new Date(member.created_at).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
      </span>

      {/* 3-dot menu */}
      <div className="relative shrink-0">
        <button onClick={onMenu} className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-muted transition-colors text-muted-foreground opacity-0 group-hover:opacity-100">
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 w-48 rounded-sm border border-border bg-popover shadow-md overflow-hidden">
            <button onClick={onDetail} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
              <ChevronRight size={14} className="text-muted-foreground" />View Details
            </button>
            <button onClick={onPermissions} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
              <Shield size={14} className="text-brand-gold" />Manage Permissions
            </button>
            <button onClick={onToggleActive} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
              <Power size={14} className={member.active ? "text-amber-500" : "text-emerald-500"} />
              {member.active ? "Deactivate" : "Reactivate"}
            </button>
            {member.user_id && (
              <button onClick={onLoginAs} disabled={impersonating} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left disabled:opacity-50">
                <LogIn size={14} className="text-brand-gold" />
                {impersonating ? "Opening…" : "Login as member"}
              </button>
            )}
            <button onClick={onRemove} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors text-left">
              <Trash2 size={14} />Remove Member
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Member Detail Panel ───────────────────────────────────────────────────────

function MemberDetailPanel({ member, impersonating, onPermissions, onToggleActive, onRemove, onLoginAs }: {
  member: TeamMember;
  impersonating: boolean;
  onPermissions: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  onLoginAs: () => void;
}) {
  const portal = ROLE_PORTAL[member.role];
  const permDefs = ROLE_PERMISSIONS[member.role]?.groups ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Identity header */}
      <div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0", portal?.bg ?? "bg-muted", portal?.colour ?? "text-muted-foreground")}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <SheetTitle className="font-display text-lg font-bold text-foreground truncate leading-tight">
              {member.name}
            </SheetTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", portal?.bg, portal?.colour)}>
                {member.role}
              </span>
              {!member.active && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">inactive</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Calendar size={10} />
              Joined {new Date(member.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {/* Contact */}
        <section className="px-6 py-4">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Contact</h3>
          <div className="space-y-2.5">
            <a href={`mailto:${member.email}`} className="flex items-center gap-3 group">
              <div className="w-7 h-7 rounded-sm bg-muted flex items-center justify-center shrink-0 group-hover:bg-brand-gold/10 transition-colors">
                <Mail size={13} className="text-muted-foreground group-hover:text-brand-gold transition-colors" />
              </div>
              <span className="text-sm text-foreground group-hover:text-brand-gold transition-colors truncate">{member.email}</span>
            </a>
            {member.phone && (
              <a href={`tel:${member.phone}`} className="flex items-center gap-3 group">
                <div className="w-7 h-7 rounded-sm bg-muted flex items-center justify-center shrink-0 group-hover:bg-brand-gold/10 transition-colors">
                  <Phone size={13} className="text-muted-foreground group-hover:text-brand-gold transition-colors" />
                </div>
                <span className="text-sm text-foreground">{member.phone}</span>
              </a>
            )}
          </div>
        </section>

        {/* Portal Access */}
        <section className="px-6 py-4">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Portal Access</h3>
          {member.user_id ? (
            <div className={cn("flex items-center gap-3 p-3 rounded-sm", portal?.bg ?? "bg-muted/30")}>
              <div className="w-8 h-8 rounded-sm bg-background/40 flex items-center justify-center shrink-0">
                <ExternalLink size={14} className={portal?.colour ?? "text-muted-foreground"} />
              </div>
              <div>
                <p className={cn("text-sm font-semibold capitalize", portal?.colour ?? "text-foreground")}>{member.role} Portal</p>
                <code className="text-xs text-muted-foreground">{portal?.path ?? "—"}</code>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-sm bg-muted/30">
              <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center shrink-0">
                <ExternalLink size={14} className="text-muted-foreground opacity-40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">External — no portal login</p>
                <p className="text-xs text-muted-foreground">Tracked for tasks &amp; payouts only</p>
              </div>
            </div>
          )}
        </section>

        {/* Skills & Rate */}
        {(member.skill_tags?.length || member.default_rate) && (
          <section className="px-6 py-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Skills &amp; Rate</h3>
            {member.skill_tags && member.skill_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {member.skill_tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs bg-muted text-muted-foreground border border-border">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>
            )}
            {member.default_rate && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign size={13} className="text-muted-foreground" />
                <span className="text-foreground font-medium">KES {Number(member.default_rate).toLocaleString()}</span>
                <span className="text-muted-foreground text-xs">{member.rate_type === "hourly" ? "/ hour" : member.rate_type === "fixed" ? "(fixed)" : ""}</span>
              </div>
            )}
          </section>
        )}

        {/* Permissions */}
        {permDefs.length > 0 && (
          <section className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Permissions</h3>
              <button onClick={onPermissions} className="flex items-center gap-1 text-xs text-brand-gold hover:underline">
                <Shield size={10} />Edit
              </button>
            </div>
            <div className="space-y-2">
              {permDefs.map((g) => {
                const enabled = member.permissions?.[g.key] ?? g.defaultValue;
                return (
                  <div key={g.key} className="flex items-center gap-2.5">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", enabled ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                    <span className={cn("text-xs", enabled ? "text-foreground" : "text-muted-foreground")}>{g.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Notes */}
        {member.notes && (
          <section className="px-6 py-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{member.notes}</p>
          </section>
        )}
      </div>

      {/* Sticky footer */}
      <div className="px-6 py-4 border-t border-border bg-card shrink-0 space-y-2">
        {member.user_id && (
          <button
            onClick={onLoginAs}
            disabled={impersonating}
            className="w-full px-4 py-2.5 rounded-sm border border-brand-gold/40 bg-brand-gold/5 text-sm font-medium text-foreground hover:bg-brand-gold/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={13} className="text-brand-gold" />
            {impersonating ? "Opening portal…" : "Login as this member"}
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={onToggleActive} className="flex-1 px-4 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <Power size={13} className={member.active ? "text-amber-500" : "text-emerald-500"} />
            {member.active ? "Deactivate" : "Reactivate"}
          </button>
          <button onClick={onRemove} className="flex-1 px-4 py-2.5 rounded-sm border border-red-200 dark:border-red-800/30 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center gap-2">
            <Trash2 size={13} />Remove
          </button>
        </div>
      </div>
    </div>
  );
}
