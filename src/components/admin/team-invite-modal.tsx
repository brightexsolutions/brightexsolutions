"use client";

import { useState } from "react";
import { UserPlus, X, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const roles = [
  { value: "subcontractor", label: "Subcontractor", desc: "Technical work on projects" },
  { value: "marketing", label: "Marketing", desc: "Social media and content" },
  { value: "finance", label: "Finance", desc: "Income, expenses, reports" },
];

export function TeamInviteModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("subcontractor");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, note }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to send invite.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setSent(false);
      setError(null);
      setName("");
      setEmail("");
      setRole("subcontractor");
      setNote("");
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
        <UserPlus size={15} />
        Invite Team Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <p className="font-medium text-foreground mb-1">Invite sent!</p>
            <p className="text-sm text-muted-foreground">
              {name} will receive an email with a link to set their password and access their portal.
            </p>
            <button
              onClick={handleClose}
              className="mt-5 px-4 py-2 rounded-sm bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Mwangi"
                className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Role
              </label>
              <div className="space-y-2">
                {roles.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-center gap-3 p-3 rounded-sm border border-input bg-background cursor-pointer hover:border-ring transition-colors"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="accent-brand-gold"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Anything to include in the invite email…"
                className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-sm px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-sm border border-input text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
