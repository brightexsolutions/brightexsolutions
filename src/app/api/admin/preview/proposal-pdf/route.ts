import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { generateProposalPdf } from "@/lib/proposal-pdf-helper";

const SAMPLE_PROPOSAL = {
  proposal_number: "PROP-2026-004",
  created_at: new Date().toISOString(),
  valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  project_title: "Website Redesign & Admin Dashboard",
  intro:
    "Njoroge Enterprises requires a modern, professional website that reflects the calibre of the business and converts visitors into clients. This proposal outlines a full website redesign with a custom admin dashboard, enabling the team to manage enquiries, services, and content without relying on a developer for day-to-day changes.",
  client: {
    name: "Jane Njoroge",
    company: "Njoroge Enterprises Ltd",
    email: "jane@example.com",
    phone: "+254 712 345 678",
  },
  scope_items: [
    {
      title: "Website Design & Development",
      description:
        "A fully responsive website: Home, About, Services, and Contact pages. Designed from scratch to your brand guidelines with a modern, premium aesthetic.",
    },
    {
      title: "Admin Dashboard",
      description:
        "A secured admin area for managing enquiries, team members, and site content. No technical knowledge required to operate.",
    },
    {
      title: "Contact Form & Lead Capture",
      description:
        "A contact form that saves all enquiries to a database and sends instant email notifications. Never miss a lead.",
    },
    {
      title: "SEO Foundation",
      description:
        "Metadata, Open Graph tags, sitemap, and robots.txt configured correctly for Google indexing from day one.",
    },
    {
      title: "Domain & Hosting Setup",
      description:
        "Initial domain registration and hosting configuration. Domain renewal is billed annually directly to the client.",
    },
  ],
  line_items: [
    { description: "Website Design & Development (5 pages)", qty: 1, unit_price: 55000 },
    { description: "Admin Dashboard", qty: 1, unit_price: 20000 },
    { description: "Contact Form & Lead Capture System", qty: 1, unit_price: 5000 },
    { description: "SEO Foundation & Configuration", qty: 1, unit_price: 3000 },
    { description: "Domain & Hosting Setup (one-time)", qty: 1, unit_price: 2000 },
  ],
  payment_terms: {
    deposit_percent: 50,
    note:
      "The deposit is required before work commences. The balance is due upon final delivery and client sign-off. Payment via M-Pesa Send Money or bank transfer.",
  },
  timeline: "4 weeks",
  notes:
    "This proposal is confidential and prepared exclusively for Njoroge Enterprises Ltd. Pricing is valid for 14 days from the date of issue.",
};

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const buffer = await generateProposalPdf(SAMPLE_PROPOSAL);
  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="proposal-preview.pdf"',
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
