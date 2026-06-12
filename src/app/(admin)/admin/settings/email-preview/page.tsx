import type { Metadata } from "next";
import {
  emailTemplate,
  emailParagraph,
  emailInfoCard,
  emailReferenceBox,
  emailAlert,
  emailInfoTable,
  emailRow,
  emailDivider,
  emailSignoff,
  emailButton,
} from "@/lib/email-templates";
import { SITE_NAME, BUSINESS_PHONE, BUSINESS_EMAIL, BUSINESS_WEBSITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Email Templates & Documents | Admin Settings" };

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_CLIENT = { name: "Jane Njoroge", email: "jane@example.com" };
const SAMPLE_INVOICE_NUMBER = "INV-00042";
const SAMPLE_AMOUNT = "KES 85,000.00";
const SAMPLE_DUE = "30 June 2026";

// ─── Template generators (mirrors the real API route bodies) ──────────────────

function invoiceEmail() {
  return emailTemplate({
    title: `Invoice ${SAMPLE_INVOICE_NUMBER}`,
    subtitle: SAMPLE_INVOICE_NUMBER,
    preheader: `${SITE_NAME} invoice for ${SAMPLE_AMOUNT} — due ${SAMPLE_DUE}`,
    heroLabel: `Invoice · ${SAMPLE_INVOICE_NUMBER}`,
    heroTitle: `Here's your invoice,\n${SAMPLE_CLIENT.name.split(" ")[0]}.`,
    body:
      emailParagraph("Please find your invoice details below. Kindly process payment by the due date shown.") +
      emailInfoCard("📄", "Invoice Number", SAMPLE_INVOICE_NUMBER) +
      emailInfoCard("💰", "Amount Due", SAMPLE_AMOUNT) +
      emailInfoCard("📅", "Due Date", SAMPLE_DUE) +
      emailInfoCard("📁", "Project", "Website Redesign") +
      emailReferenceBox(SAMPLE_INVOICE_NUMBER, "Invoice Reference") +
      `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0">
        <tr style="background:#152238">
          <th style="padding:10px 12px;color:#fff;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px">Description</th>
          <th style="padding:10px 12px;color:#fff;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;width:40px">Qty</th>
          <th style="padding:10px 12px;color:#fff;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;width:110px">Unit Price</th>
          <th style="padding:10px 12px;color:#fff;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;width:110px">Total</th>
        </tr>
        <tr style="background:#fff"><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0">Website Design & Development</td><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:center">1</td><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:right">KES 70,000.00</td><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:right">KES 70,000.00</td></tr>
        <tr style="background:#f8fafc"><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0">SEO Setup</td><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:center">1</td><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:right">KES 15,000.00</td><td style="padding:9px 12px;color:#334155;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:right">KES 15,000.00</td></tr>
      </table>` +
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr><td style="padding:10px 12px;text-align:right;background:#152238;color:#f9a825;font-size:13px;font-weight:700">Total Due</td>
        <td style="padding:10px 12px;text-align:right;background:#152238;color:#fff;font-size:13px;font-weight:700;width:130px">${SAMPLE_AMOUNT}</td></tr>
      </table>` +
      `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:20px 0">
        <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.9px">Payment Details</p>
        </div>
        <div style="padding:10px 16px">
          <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px">M-Pesa Send Money</p>
          <p style="margin:0;font-size:13px;font-weight:700;color:#152238">0741 980 127</p>
          <p style="margin:2px 0 0;font-size:13px;color:#64748b">Brightex Solutions</p>
        </div>
      </div>` +
      emailDivider() +
      emailParagraph(`For any questions, reply to this email or reach us on WhatsApp: <a href="#" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`) +
      emailSignoff(),
  });
}

function reminderEmail() {
  return emailTemplate({
    title: "Payment Reminder",
    subtitle: SAMPLE_INVOICE_NUMBER,
    preheader: `Reminder: Invoice ${SAMPLE_INVOICE_NUMBER} requires your attention`,
    heroLabel: `Payment Reminder · ${SAMPLE_INVOICE_NUMBER}`,
    heroTitle: `A gentle reminder,\n${SAMPLE_CLIENT.name.split(" ")[0]}.`,
    body:
      emailAlert(`Invoice ${SAMPLE_INVOICE_NUMBER} is <strong>7 days overdue</strong>. Please process payment as soon as possible.`, "warning") +
      emailInfoCard("📄", "Invoice Number", SAMPLE_INVOICE_NUMBER) +
      emailInfoCard("💰", "Amount Due", SAMPLE_AMOUNT) +
      emailInfoCard("📅", "Due Date", SAMPLE_DUE) +
      emailReferenceBox(SAMPLE_INVOICE_NUMBER, "Invoice Reference") +
      `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:20px 0">
        <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.9px">Payment Details</p>
        </div>
        <div style="padding:10px 16px">
          <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px">M-Pesa Send Money</p>
          <p style="margin:0;font-size:13px;font-weight:700;color:#152238">0741 980 127</p>
          <p style="margin:2px 0 0;font-size:13px;color:#64748b">Brightex Solutions</p>
        </div>
      </div>` +
      emailDivider() +
      emailParagraph(`Please process payment at your earliest convenience. Questions? WhatsApp: <a href="#" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`) +
      emailSignoff(),
  });
}

function receiptEmail() {
  return emailTemplate({
    title: "Payment Received",
    subtitle: SAMPLE_INVOICE_NUMBER,
    preheader: `Payment of ${SAMPLE_AMOUNT} confirmed`,
    heroLabel: "Payment Confirmation",
    heroTitle: `Payment received,\n${SAMPLE_CLIENT.name.split(" ")[0]}.`,
    body:
      emailAlert(`We've received your payment of <strong>${SAMPLE_AMOUNT}</strong>. Thank you!`, "success") +
      emailInfoCard("✅", "Amount Paid", SAMPLE_AMOUNT) +
      emailInfoCard("💳", "Payment Method", "M-Pesa") +
      emailInfoCard("📅", "Date", "12 June 2026") +
      emailInfoCard("🔖", "Reference", "QJK3P7XR2F") +
      emailReferenceBox(SAMPLE_INVOICE_NUMBER, "Invoice Reference") +
      emailDivider() +
      emailParagraph(`For any queries, reply to this email or reach us on WhatsApp: <a href="#" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`) +
      emailSignoff(),
  });
}

function contactEmail() {
  return emailTemplate({
    title: "New Enquiry",
    preheader: "You have a new contact enquiry from the website",
    heroLabel: "New Enquiry",
    heroTitle: "New website enquiry\nreceived.",
    body:
      emailInfoTable(
        emailRow("Name", "David Kamau") +
        emailRow("Contact", "david@example.com") +
        emailRow("Service", "Web Development") +
        emailRow("Received", "12 June 2026, 14:35 EAT")
      ) +
      emailAlert("Respond within 24 hours to keep leads warm.", "info") +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px">Message</p>
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.7">Hi, I need a website built for my logistics company. Looking for something modern with an admin dashboard. What's your process?</p>
      </div>` +
      emailButton("View in Dashboard", `${BUSINESS_WEBSITE}/admin/clients`) +
      emailDivider() +
      emailSignoff(),
  });
}

function bookingEmail() {
  return emailTemplate({
    title: "Booking Confirmed",
    preheader: "Your discovery call with Brightex is confirmed",
    heroLabel: "Booking Confirmation",
    heroTitle: `See you soon,\n${SAMPLE_CLIENT.name.split(" ")[0]}.`,
    body:
      emailParagraph("Your discovery call has been confirmed. Here are the details:") +
      emailInfoCard("📅", "Date", "Friday, 20 June 2026") +
      emailInfoCard("🕐", "Time", "10:00 AM EAT") +
      emailInfoCard("💬", "Purpose", "Intro Call") +
      emailReferenceBox("BOOK-A3F1", "Booking Reference") +
      emailAlert("Add this to your calendar so you don't miss it.", "info") +
      emailButton("Join Meeting", "#") +
      emailDivider() +
      emailParagraph(`Need to reschedule? Reply to this email or reach us on WhatsApp: <a href="#" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`) +
      emailSignoff(),
  });
}

function autoReplyEmail() {
  return emailTemplate({
    title: "We'll be in touch soon",
    preheader: "Thanks for reaching out to Brightex Solutions",
    heroLabel: "Thank You",
    heroTitle: `Thanks for reaching out,\nDavid.`,
    body:
      emailParagraph("We've received your message and will get back to you within <strong>24 hours</strong>.") +
      emailInfoTable(
        emailRow("Service Enquiry", "Web Development") +
        emailRow("Submitted", "12 June 2026")
      ) +
      emailAlert("While you wait, explore our work and services at brightexsolutions.co.ke", "info") +
      emailButton("View Our Work", BUSINESS_WEBSITE ?? "#") +
      emailDivider() +
      emailParagraph(`Prefer to chat now? Reach us on WhatsApp: <a href="#" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a> or email <a href="mailto:${BUSINESS_EMAIL}" style="color:#f9a825">${BUSINESS_EMAIL}</a>`) +
      emailSignoff(),
  });
}

// ─── Document templates (PDFs) ───────────────────────────────────────────────

const DOCUMENTS = [
  {
    id: "invoice-pdf",
    label: "Invoice PDF",
    tag: "Finance",
    description: "Attached to invoice emails and available for direct download.",
    src: "/api/admin/preview/invoice-pdf",
  },
];

// ─── Templates list ───────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: "invoice",     label: "Invoice",              tag: "Finance",  html: invoiceEmail() },
  { id: "reminder",    label: "Payment Reminder",     tag: "Finance",  html: reminderEmail() },
  { id: "receipt",     label: "Payment Receipt",      tag: "Finance",  html: receiptEmail() },
  { id: "contact",     label: "Contact Notification", tag: "Enquiries", html: contactEmail() },
  { id: "booking",     label: "Booking Confirmation", tag: "Bookings", html: bookingEmail() },
  { id: "auto-reply",  label: "Contact Auto-Reply",   tag: "Enquiries", html: autoReplyEmail() },
];

const TAG_COLORS: Record<string, string> = {
  Finance:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Enquiries: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Bookings:  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailPreviewPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Email Templates &amp; Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live previews of every outbound email and PDF document Brightex sends to clients.
          Sample data is used throughout.
        </p>
      </div>

      {/* ── PDF Documents ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">PDF files attached to emails or downloaded directly from the admin.</p>
        </div>

        {DOCUMENTS.map((d) => (
          <section key={d.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">{d.label}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[d.tag] ?? ""}`}>
                {d.tag}
              </span>
              <span className="text-xs text-muted-foreground">{d.description}</span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/50">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">Document preview — {d.label}</span>
              </div>
              <iframe
                src={d.src}
                title={d.label}
                className="w-full border-0"
                style={{ height: "860px" }}
              />
            </div>
          </section>
        ))}
      </div>

      {/* ── Email Templates ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Email Templates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">HTML emails sent directly to clients for invoices, bookings, enquiries, and more.</p>
        </div>

      {TEMPLATES.map((t) => (
        <section key={t.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">{t.label}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[t.tag] ?? ""}`}>
              {t.tag}
            </span>
          </div>

          {/* Mobile preview wrapper */}
          <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/50">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">Email preview — {t.label}</span>
            </div>
            <iframe
              srcDoc={t.html}
              title={t.label}
              className="w-full border-0"
              style={{ height: "640px" }}
              sandbox="allow-same-origin"
            />
          </div>

          {/* Mobile size preview */}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
              📱 Mobile preview (375px)
            </summary>
            <div className="mt-2 border border-border rounded-xl overflow-hidden bg-muted/30 mx-auto" style={{ maxWidth: 375 }}>
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/50">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-muted-foreground font-mono truncate">Mobile · 375px</span>
              </div>
              <iframe
                srcDoc={t.html}
                title={`${t.label} mobile`}
                className="w-full border-0"
                style={{ height: "640px" }}
                sandbox="allow-same-origin"
              />
            </div>
          </details>
        </section>
      ))}
      </div>
    </div>
  );
}
