"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  company: z.string().max(100).trim().optional(),
  contact: z.string().min(3, "Please enter a valid email or phone number").max(150).trim(),
  service: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000).trim(),
});

type FormData = z.infer<typeof schema>;

const services = [
  "Web Development", "UI/UX Design", "SEO & Growth",
  "Branding & Identity", "AI & Automation", "ERP Systems",
  "Technology Consultancy", "Not sure yet",
];

interface ContactFormProps {
  variant?: "card" | "embedded";
  /** Omits the "Service Interested In" field — for a general inquiry where
   * the visitor has already told us this isn't about a specific service. */
  hideService?: boolean;
  /** Pre-fills the service field — used when arriving from the service-specific step. */
  defaultService?: string;
}

export function ContactForm({ variant = "card", hideService, defaultService }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultService ? { service: defaultService } : undefined,
  });

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

  const field = "w-full px-4 py-3 rounded-sm border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm";
  const label = "block text-xs font-semibold text-slate-600 dark:text-white/60 mb-2";

  if (submitted) {
    return (
      <div className={cn("text-center", variant === "card" ? "p-10 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10" : "py-8")}>
        <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-brand-gold" />
        </div>
        <h3 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">Message received!</h3>
        <p className="text-brand-muted leading-relaxed">Thanks for reaching out. We&apos;ll get back to you within 24 hours. Check your inbox for a confirmation.</p>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label}>Full Name <span className="text-brand-gold">*</span></label>
          <input {...register("name")} type="text" placeholder="Jane Doe" className={field} />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className={label}>Company <span className="text-brand-muted/60 font-normal normal-case">(optional)</span></label>
          <input {...register("company")} type="text" placeholder="Acme Ltd" className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Email or Phone <span className="text-brand-gold">*</span></label>
        <input {...register("contact")} type="text" placeholder="jane@company.com or +254 7XX XXX XXX" className={field} />
        {errors.contact && <p className="mt-1.5 text-xs text-red-500">{errors.contact.message}</p>}
      </div>

      {!hideService && (
        <div>
          <label className={label}>Service Interested In</label>
          <select {...register("service")} className={cn(field, "dark:bg-brand-navy")}>
            <option value="">Select a service…</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Message <span className="text-brand-gold">*</span></label>
        <textarea
          {...register("message")}
          rows={5}
          placeholder="Tell us about your project — what you're building, your timeline, and any specific requirements."
          className={cn(field, "resize-none")}
        />
        {errors.message && <p className="mt-1.5 text-xs text-red-500">{errors.message.message}</p>}
      </div>

      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{serverError}</p>
          <a href="https://wa.me/254741980127" target="_blank" rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#25D366] whitespace-nowrap">
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-bold text-sm hover:bg-brand-navy-hover dark:hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
        ) : (
          <>Send Message <Send size={15} /></>
        )}
      </button>
    </form>
  );

  if (variant === "embedded") return formContent;

  return (
    <div className="p-8 sm:p-10 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10">
      {formContent}
    </div>
  );
}
