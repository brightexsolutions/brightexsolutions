"use client";

import { useState } from "react";
import { UserPlus, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const roles = [
  { value: "subcontractor", label: "Subcontractor", desc: "Technical work on projects" },
  { value: "marketing", label: "Marketing", desc: "Social media and content" },
  { value: "finance", label: "Finance", desc: "Income, expenses, reports" },
  { value: "support", label: "Support", desc: "Client service, comms, deal follow-up" },
];

const inputCls = "w-full px-3 py-2.5 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function TeamInviteModal({ onInviteSent }: { onInviteSent?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isExternal, setIsExternal] = useState(false);

  // Shared fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("subcontractor");
  const [note, setNote] = useState("");

  // External-only fields
  const [rateType, setRateType] = useState<"fixed" | "hourly" | "">("");
  const [defaultRate, setDefaultRate] = useState("");

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isExternal) {
        // Create external member record directly — no invite email
        const res = await fetch("/api/admin/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: email || undefined,
            phone: phone || undefined,
            role,
            notes: note || undefined,
            rate_type: rateType || undefined,
            default_rate: defaultRate ? Number(defaultRate) : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Failed to add member."); return; }
      } else {
        // Send portal invite email
        const res = await fetch("/api/admin/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role, note }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Failed to send invite."); return; }
      }
      setSent(true);
      onInviteSent?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setSent(false); setError(null);
      setName(""); setEmail(""); setPhone(""); setRole("subcontractor"); setNote("");
      setRateType(""); setDefaultRate(""); setIsExternal(false);
    }, 300);
  }

  const successMsg = isExternal
    ? `${name} has been added as an external ${role}. They won't receive an email — you can assign tasks to them directly.`
    : `${name} will receive an email with a link to set their password and access their portal.`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
        <UserPlus size={15} />
        Add Team Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <p className="font-medium text-foreground mb-1">
              {isExternal ? "Member added!" : "Invite sent!"}
            </p>
            <p className="text-sm text-muted-foreground">{successMsg}</p>
            <button onClick={handleClose} className="mt-5 px-4 py-2 rounded-sm bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* Portal toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsExternal(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-sm border text-sm font-medium transition-colors ${
                  !isExternal
                    ? "border-brand-gold bg-brand-gold/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wifi size={14} />
                <div className="text-left">
                  <div className="font-semibold text-xs">Portal Access</div>
                  <div className="text-[10px] text-muted-foreground">Gets invite email + login</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsExternal(true)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-sm border text-sm font-medium transition-colors ${
                  isExternal
                    ? "border-brand-gold bg-brand-gold/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <WifiOff size={14} />
                <div className="text-left">
                  <div className="font-semibold text-xs">External Only</div>
                  <div className="text-[10px] text-muted-foreground">No login · tracked only</div>
                </div>
              </button>
            </div>

            {isExternal && (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-sm px-3 py-2 leading-relaxed">
                External contractors are tracked in the system for task assignment, payout recording, and expense logging — but they don&apos;t get a portal login.
              </p>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Mwangi" className={inputCls} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Email {isExternal && <span className="font-normal normal-case">(optional)</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!isExternal}
                placeholder="jane@example.com"
                className={inputCls}
              />
            </div>

            {/* Phone — external only */}
            {isExternal && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Phone (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" className={inputCls} />
              </div>
            )}

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Role</label>
              <div className="space-y-2">
                {roles.map((r) => (
                  <label key={r.value} className="flex items-center gap-3 p-3 rounded-sm border border-input bg-background cursor-pointer hover:border-ring transition-colors">
                    <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="accent-brand-gold" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rate — external subcontractor only */}
            {isExternal && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Rate Type</label>
                  <select value={rateType} onChange={(e) => setRateType(e.target.value as "fixed" | "hourly" | "")} className={inputCls}>
                    <option value="">Not set</option>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Rate (KES)</label>
                  <input type="number" min="0" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} placeholder="e.g. 5000" className={inputCls} />
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Note {isExternal ? "(optional)" : "(optional — included in invite email)"}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={isExternal ? "Skills, specialisation, context…" : "Anything to include in the invite email…"}
                className={`${inputCls} resize-none`}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-sm px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-2.5 rounded-sm border border-input text-foreground text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60">
                {loading ? (isExternal ? "Adding…" : "Sending…") : (isExternal ? "Add Member" : "Send Invite")}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
