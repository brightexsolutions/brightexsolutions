"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send, MessageCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  company: z.string().max(100).trim().optional(),
  contact: z.string().min(3, "Please enter a valid email or phone number").max(150).trim(),
  service: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000).trim(),
});

type FormData = z.infer<typeof schema>;

const services = [
  "Web Development",
  "UI/UX Design",
  "SEO & Growth",
  "Branding & Identity",
  "AI & Automation",
  "ERP Systems",
  "Technology Consultancy",
  "Not sure yet",
];

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setServerError(json.message ?? "Something went wrong. Please try WhatsApp instead.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Network error. Please reach out via WhatsApp at +254 741 980 127.");
    }
  }

  if (submitted) {
    return (
      <div className="p-10 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-brand-gold" />
        </div>
        <h3 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">
          Message received!
        </h3>
        <p className="text-brand-muted leading-relaxed">
          Thanks for reaching out. We'll get back to you within 24 hours. Check your inbox for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-10 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10">
      <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-8">
        Send a Message
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
              Full Name <span className="text-brand-gold">*</span>
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
              Company <span className="text-brand-muted font-normal normal-case">(optional)</span>
            </label>
            <input
              {...register("company")}
              type="text"
              placeholder="Acme Ltd"
              className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
            />
          </div>
        </div>

        {/* Contact */}
        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
            Email or Phone <span className="text-brand-gold">*</span>
          </label>
          <input
            {...register("contact")}
            type="text"
            placeholder="jane@company.com or +254 7XX XXX XXX"
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
          />
          {errors.contact && (
            <p className="mt-1.5 text-xs text-red-500">{errors.contact.message}</p>
          )}
        </div>

        {/* Service */}
        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
            Service Interested In
          </label>
          <select
            {...register("service")}
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-brand-navy text-brand-navy dark:text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
            Message <span className="text-brand-gold">*</span>
          </label>
          <textarea
            {...register("message")}
            rows={5}
            placeholder="Tell us about your project — what you're building, your timeline, and any specific requirements."
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm resize-none"
          />
          {errors.message && (
            <p className="mt-1.5 text-xs text-red-500">{errors.message.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="flex items-start gap-3 p-4 rounded-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
            <a
              href="https://wa.me/254741980127"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#25D366] whitespace-nowrap"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-semibold text-sm hover:bg-brand-navy-hover dark:hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send Message
              <Send size={15} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
