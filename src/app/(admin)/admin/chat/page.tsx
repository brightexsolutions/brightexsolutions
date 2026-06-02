"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const tabs = ["FAQ Manager", "Sessions", "Analytics"] as const;
type Tab = (typeof tabs)[number];

const categories = ["services", "products", "pricing", "process", "general"] as const;
const defaultFaq = { question: "", answer: "", keywords: "", category: "general" };

type FAQ = {
  id: string;
  question: string;
  answer: string;
  keywords?: string[] | null;
  category: string;
  active: boolean;
  order_index: number;
  created_at: string;
};

type Session = {
  id: string;
  visitor_id?: string | null;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  escalated: boolean;
  escalation_type?: string | null;
  started_at: string;
};

export default function BrixoChatPage() {
  const [activeTab, setActiveTab] = useState<Tab>("FAQ Manager");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState(defaultFaq);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const loadFaqs = useCallback(async () => {
    setFaqLoading(true);
    try {
      const res = await fetch("/api/admin/chat/faqs");
      const json = await res.json().catch(() => ({}));
      if (res.ok) setFaqs(json.data ?? []);
    } finally {
      setFaqLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat/sessions");
      const json = await res.json().catch(() => ({}));
      if (res.ok) setSessions(json.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadFaqs(); }, [loadFaqs]);
  useEffect(() => {
    if (activeTab === "Sessions") loadSessions();
  }, [activeTab, loadSessions]);

  function openCreate() {
    setEditTarget(null);
    setFaqForm(defaultFaq);
    setFaqOpen(true);
  }

  function openEdit(faq: FAQ) {
    setEditTarget(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      keywords: (faq.keywords ?? []).join(", "),
      category: faq.category,
    });
    setFaqOpen(true);
  }

  async function handleDelete(faq: FAQ) {
    if (!confirm("Delete this FAQ? This cannot be undone.")) return;
    await fetch(`/api/admin/chat/faqs/${faq.id}`, { method: "DELETE" });
    setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
  }

  async function toggleActive(faq: FAQ) {
    const res = await fetch(`/api/admin/chat/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !faq.active }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setFaqs((prev) => prev.map((f) => f.id === faq.id ? { ...f, ...json.data } : f));
  }

  async function handleFaqSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        question: faqForm.question,
        answer: faqForm.answer,
        keywords: faqForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        category: faqForm.category,
      };

      const url = editTarget ? `/api/admin/chat/faqs/${editTarget.id}` : "/api/admin/chat/faqs";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        if (editTarget) {
          setFaqs((prev) => prev.map((f) => f.id === editTarget.id ? { ...f, ...json.data } : f));
        } else {
          setFaqs((prev) => [...prev, json.data]);
        }
        setFaqForm(defaultFaq);
        setFaqOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const filteredFaqs = activeCategory === "all"
    ? faqs
    : faqs.filter((f) => f.category === activeCategory);

  const escalatedCount = sessions.filter((s) => s.escalated).length;
  const resolved = sessions.filter((s) => !s.escalated).length;
  const resolutionRate = sessions.length > 0 ? Math.round((resolved / sessions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Brixo Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage FAQ responses and review visitor chat sessions.</p>
        </div>
        {activeTab === "FAQ Manager" && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
          >
            <Plus size={15} />
            Add FAQ
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total FAQs" value={faqs.length} icon={MessageSquare} />
        <StatCard title="Sessions (all)" value={sessions.length} icon={MessageSquare} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Bot Resolution" value={`${resolutionRate}%`} icon={MessageSquare} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Escalated" value={escalatedCount} icon={MessageSquare} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab ? "border-brand-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "FAQ Manager" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors", activeCategory === "all" ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border capitalize transition-colors", activeCategory === cat ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground")}
              >
                {cat}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare size={16} />
                FAQ Pairs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {faqLoading ? (
                <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading FAQs…</p></div>
              ) : filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No FAQ entries yet.</p>
                  <p className="text-xs mt-1">Add question/answer pairs to power Brixo&apos;s responses.</p>
                  <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors">
                    <Plus size={13} />Add FAQ
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredFaqs.map((faq) => (
                    <div key={faq.id} className="px-6 py-4 flex items-start gap-4 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{faq.question}</p>
                          <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground capitalize">{faq.category}</span>
                          {!faq.active && (
                            <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground">inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                        {faq.keywords && faq.keywords.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">Keywords: {faq.keywords.join(", ")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleActive(faq)}
                          className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title={faq.active ? "Deactivate" : "Activate"}
                        >
                          {faq.active ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} />}
                        </button>
                        <button onClick={() => openEdit(faq)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(faq)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-normal">Test Brixo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-sm bg-muted/30 p-4 min-h-30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Type a message to test FAQ matching — available once FAQs are added.</p>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="Type a test message..."
                  className="flex-1 px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                  disabled
                />
                <button disabled className="px-3 py-2 rounded-sm bg-brand-gold/50 text-brand-navy text-sm font-medium cursor-not-allowed">
                  Send
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Sessions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare size={16} />
              Chat Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No sessions yet.</p>
                <p className="text-xs mt-1">Visitor chat sessions will appear here once the Brixo widget is live.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sessions.map((session) => (
                  <div key={session.id} className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground font-mono">{session.visitor_id?.slice(0, 8) ?? "anonymous"}</p>
                      {session.escalated && (
                        <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-amber-400/10 text-amber-600 dark:text-amber-400">
                          Escalated → {session.escalation_type ?? "WhatsApp"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.messages?.length ?? 0} messages · {new Date(session.started_at).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Analytics" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Total sessions", value: sessions.length || "—" },
            { label: "Bot resolution rate", value: sessions.length ? `${resolutionRate}%` : "—" },
            { label: "WhatsApp escalation rate", value: sessions.length ? `${Math.round((escalatedCount / sessions.length) * 100)}%` : "—" },
            { label: "Active FAQs", value: faqs.filter((f) => f.active).length || "—" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                <p className="text-2xl font-display font-bold text-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFaqSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Input
                placeholder="What services does Brightex offer?"
                value={faqForm.question}
                onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer *</Label>
              <Textarea
                rows={4}
                placeholder="We offer web development, UI/UX design, SEO…"
                value={faqForm.answer}
                onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Keywords <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
              <Input
                placeholder="services, what do you do, offerings"
                value={faqForm.keywords}
                onChange={(e) => setFaqForm((f) => ({ ...f, keywords: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={faqForm.category}
                onChange={(e) => setFaqForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {categories.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFaqOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !faqForm.question || !faqForm.answer} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add FAQ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
