"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  source?: "ai" | "rule-based";
}

const SUGGESTIONS = ["How are we doing this month?", "What needs my attention?", "Any overdue invoices?"];

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await fetch("/api/admin/assistant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: nextMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, source: data.source }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong: try again in a moment." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error: try again." }]);
    } finally {
      setSending(false);
    }
  }

  // Opened from the header button rather than a floating FAB, which used to
  // cover table pagination and the phone bottom bar.
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("toggle-assistant", toggle);
    return () => window.removeEventListener("toggle-assistant", toggle);
  }, []);

  return (
    <>
      {open && (
        <div className="fixed top-16 right-3 sm:right-5 z-40 w-[calc(100vw-1.5rem)] sm:w-96 h-[520px] max-h-[calc(100dvh-6rem)] rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-brand-gold/15 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-brand-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Assistant</p>
              <p className="text-[11px] text-muted-foreground">Grounded in your live dashboard data</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="ml-auto size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Ask about revenue, overdue invoices, leads, or what needs your attention.</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-sm border border-border hover:border-brand-gold/40 hover:bg-muted/30 transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-sm px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                    m.role === "user" ? "bg-brand-gold text-brand-navy" : "bg-muted/50 text-foreground"
                  )}
                >
                  {m.content}
                  {m.source === "rule-based" && (
                    <p className="text-[9px] opacity-60 mt-1">Rule-based (AI unavailable)</p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-sm px-3 py-2">
                  <Loader2 size={12} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-border flex items-center gap-2 shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 px-3 py-2 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-sm bg-brand-gold text-brand-navy flex items-center justify-center hover:bg-brand-gold-hover transition-colors disabled:opacity-50 shrink-0"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
