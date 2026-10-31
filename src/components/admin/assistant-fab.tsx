"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp, TrendingUp, BellRing, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  source?: "ai" | "rule-based";
}

const SUGGESTIONS = [
  { text: "How are we doing this month?", icon: TrendingUp },
  { text: "What needs my attention?", icon: BellRing },
  { text: "Any overdue invoices?", icon: Receipt },
];

/**
 * Assistant replies are plain text, but models still slip into markdown now and
 * then. Strip the markup and turn list markers into real list items.
 */
function AssistantText({ text }: { text: string }) {
  const lines = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .split("\n")
    .map((l) => l.replace(/^\s*#{1,6}\s+/, "").trimEnd());

  const blocks: Array<{ type: "p"; text: string } | { type: "ul"; items: string[] }> = [];
  for (const raw of lines) {
    const item = raw.match(/^\s*(?:[*\-•]|\d+[.)])\s+(.*)$/);
    if (item) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(item[1]);
      else blocks.push({ type: "ul", items: [item[1]] });
    } else if (raw.trim()) {
      blocks.push({ type: "p", text: raw.trim() });
    }
  }

  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className="mt-[0.55em] size-1.5 rounded-full bg-brand-gold shrink-0" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("toggle-assistant", toggle);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("toggle-assistant", toggle); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          className="fixed top-16 right-3 sm:right-5 z-40 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[560px] max-h-[calc(100dvh-6rem)] rounded-3xl border border-border bg-card shadow-[0_24px_64px_-16px_rgba(15,23,42,0.45)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-[0.98] duration-200"
        >
          {/* Header: brand navy with a soft gold glow */}
          <div className="relative px-4 py-3.5 flex items-center gap-3 shrink-0 bg-brand-navy text-white overflow-hidden">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_140%_at_0%_0%,rgba(249,168,37,0.35),transparent_60%)]" />
            <div className="relative size-10 rounded-2xl bg-brand-gold text-brand-navy flex items-center justify-center shrink-0 shadow-[0_6px_16px_-6px_rgba(249,168,37,0.8)]">
              <Sparkles size={18} />
            </div>
            <div className="relative min-w-0">
              <p className="text-sm font-semibold leading-tight">Brightex Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Reading your live data
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="relative ml-auto size-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-overlay px-4 py-4 space-y-3 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_0)] bg-[size:16px_16px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center pt-4">
                <div className="size-14 rounded-3xl bg-brand-gold/15 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-amber-700 dark:text-brand-gold" />
                </div>
                <p className="text-base font-semibold text-foreground">What do you want to know?</p>
                <p className="text-sm text-muted-foreground mt-1 mb-5">Revenue, invoices, leads or what needs you today.</p>
                <div className="w-full space-y-2">
                  {SUGGESTIONS.map(({ text, icon: Icon }) => (
                    <button
                      key={text}
                      onClick={() => send(text)}
                      className="group w-full flex items-center gap-3 text-left text-sm px-3 py-2.5 rounded-2xl bg-card border border-border hover:border-brand-gold/50 hover:bg-brand-gold/5 transition-colors text-foreground"
                    >
                      <span className="size-8 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                        <Icon size={15} />
                      </span>
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <span className="size-7 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center shrink-0">
                    <Sparkles size={13} />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                    m.role === "user" && "whitespace-pre-wrap",
                    m.role === "user"
                      ? "rounded-2xl rounded-br-md bg-brand-gold text-brand-navy"
                      : "rounded-2xl rounded-bl-md bg-card border border-border text-foreground"
                  )}
                >
                  {m.role === "assistant" ? <AssistantText text={m.content} /> : m.content}
                  {m.source === "rule-based" && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">Rule-based answer (AI unavailable)</p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-end gap-2" aria-live="polite" aria-label="Assistant is typing">
                <span className="size-7 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center shrink-0">
                  <Sparkles size={13} />
                </span>
                <div className="rounded-2xl rounded-bl-md bg-card border border-border px-3.5 py-3 flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-border shrink-0 bg-card"
          >
            <div className="flex items-center gap-2 rounded-full border border-input bg-background pl-4 pr-1.5 py-1.5 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 transition-shadow">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything"
                aria-label="Message the assistant"
                className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none focus-visible:shadow-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="size-9 rounded-full bg-brand-gold text-brand-navy flex items-center justify-center hover:bg-brand-gold-hover transition-colors disabled:bg-muted disabled:text-muted-foreground shrink-0"
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
