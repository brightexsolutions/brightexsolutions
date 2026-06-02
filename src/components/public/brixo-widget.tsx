"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Send, ArrowRight } from "lucide-react";
import {
  BUSINESS_PHONE,
  OPERATING_HOURS,
  WHATSAPP_REPLY_TIME,
  whatsappUrl,
} from "@/lib/constants";

type Mode = "bot" | "whatsapp";
type Message = { role: "user" | "bot"; content: string };

const QUICK_REPLIES = [
  "Our Services",
  "Our Products",
  "Pricing",
  "How to get started",
];

function buildWaLink(context?: string) {
  const msg = context
    ? `Hi Godwin, I was on the Brightex website and I'd like to chat about: ${context}`
    : "Hi Godwin, I was on the Brightex website and I'd like to chat.";
  return whatsappUrl(msg);
}

export function BrixoWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("bot");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Hi 👋 I'm Brixo, the Brightex assistant. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [lastTopic, setLastTopic] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "anon"
  );

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");
    setLastTopic(userMsg);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, visitorId: visitorId.current }),
      });
      const data = await res.json();

      if (data.escalate) {
        setEscalated(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content:
              "I don't have a direct answer for that. You can switch to WhatsApp to chat with Godwin directly.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.answer },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Something went wrong. Try reaching us on WhatsApp.",
        },
      ]);
      setEscalated(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!open && (
            <motion.button
              key="trigger"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setOpen(true)}
              className="relative w-14 h-14 rounded-full bg-brand-navy shadow-lg flex items-center justify-center hover:bg-brand-navy-hover transition-colors"
              aria-label="Open Brixo chat"
            >
              <MessageCircle size={24} className="text-white" />
              {/* Pulse ring — fires once on mount */}
              <span className="absolute inset-0 rounded-full border-2 border-brand-gold animate-ping opacity-60 [animation-iteration-count:3]" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-0 right-0 w-[360px] sm:w-[380px] max-h-[580px] rounded-sm shadow-2xl bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-brand-navy px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-brand-navy font-bold text-sm">
                    B
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-none">Brixo</div>
                    <div className="text-white/50 text-xs mt-0.5">Brightex Assistant</div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/60 hover:text-white transition-colors p-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode tabs */}
              <div className="flex border-b border-brand-border dark:border-white/10 flex-shrink-0">
                {(["bot", "whatsapp"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                      mode === m
                        ? "text-brand-navy dark:text-white border-b-2 border-brand-gold"
                        : "text-brand-muted hover:text-brand-navy dark:hover:text-white"
                    }`}
                  >
                    {m === "bot" ? "🤖 Assistant" : "💬 WhatsApp"}
                  </button>
                ))}
              </div>

              {/* Bot mode */}
              {mode === "bot" && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3.5 py-2.5 rounded-sm text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-brand-navy text-white"
                              : "bg-brand-bg dark:bg-white/8 text-brand-text dark:text-white/90"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {/* Loading dots */}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-brand-bg dark:bg-white/8 px-4 py-3 rounded-sm flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-brand-muted animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Escalation suggestion */}
                    {escalated && (
                      <button
                        onClick={() => setMode("whatsapp")}
                        className="flex items-center gap-2 text-xs font-semibold text-brand-gold hover:underline"
                      >
                        Switch to WhatsApp <ArrowRight size={12} />
                      </button>
                    )}

                    <div ref={bottomRef} />
                  </div>

                  {/* Quick replies — only when first message is the only one */}
                  {messages.length === 1 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
                      {QUICK_REPLIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="px-3 py-1.5 rounded-full border border-brand-border dark:border-white/15 text-xs font-medium text-brand-navy dark:text-white hover:border-brand-gold hover:text-brand-gold transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-3 border-t border-brand-border dark:border-white/10 flex gap-2 flex-shrink-0">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                      placeholder="Type a message…"
                      className="flex-1 px-3 py-2 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-gold transition-colors"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || loading}
                      className="w-9 h-9 rounded-sm bg-brand-navy flex items-center justify-center text-white hover:bg-brand-navy-hover transition-colors disabled:opacity-40"
                      aria-label="Send"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </>
              )}

              {/* WhatsApp mode */}
              {mode === "whatsapp" && (
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                    <MessageCircle size={28} className="text-[#25D366]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy dark:text-white mb-1">
                      Chat directly with Godwin
                    </h3>
                    <p className="text-brand-muted text-xs mb-1">{BUSINESS_PHONE}</p>
                    <p className="text-brand-muted text-xs">
                      {OPERATING_HOURS} · Typical reply: {WHATSAPP_REPLY_TIME}
                    </p>
                  </div>
                  <a
                    href={buildWaLink(lastTopic)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <MessageCircle size={16} />
                    Open WhatsApp Chat ↗
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
