/**
 * GET /api/admin/documents/hub
 *
 * Unified read-only view across every document type the system produces or
 * stores: AI-generated proposals/agreements/SOPs, invoices, payment
 * receipts, uploaded project files, and uploaded finance documents. Each
 * source already has its own live view/download route — this just
 * normalises them into one browsable, filterable list.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export type HubDocType = "proposal" | "agreement" | "sop" | "invoice" | "receipt" | "project_file" | "finance_file";

interface HubDocument {
  id: string;
  type: HubDocType;
  title: string;
  subtitle: string | null;
  client: string | null;
  date: string;
  viewUrl: string;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const [generatedRes, invoicesRes, paymentsRes, projectDocsRes, financeDocsRes] = await Promise.all([
    supabase.from("generated_documents").select("id, type, title, reference_code, created_at, clients(name, company)"),
    supabase.from("invoices").select("id, invoice_number, total, created_at, clients(name, company)").is("deleted_at", null),
    supabase.from("payments").select("id, amount, date, invoices(invoice_number, clients(name, company))"),
    supabase.from("project_documents").select("id, name, storage_path, uploaded_at, projects(name, clients(name, company))"),
    supabase.from("finance_documents").select("id, doc_type, party_name, original_filename, doc_date, amount, storage_path"),
  ]);

  const documents: HubDocument[] = [];

  for (const d of generatedRes.data ?? []) {
    const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;
    documents.push({
      id: d.id,
      type: d.type as HubDocType,
      title: d.title,
      subtitle: d.reference_code,
      client: client?.company?.trim() || client?.name || null,
      date: d.created_at,
      viewUrl: `/api/admin/documents/${d.id}/view`,
    });
  }

  for (const inv of invoicesRes.data ?? []) {
    const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
    documents.push({
      id: inv.id,
      type: "invoice",
      title: `Invoice ${inv.invoice_number ?? ""}`,
      subtitle: `KES ${Number(inv.total).toLocaleString()}`,
      client: client?.company?.trim() || client?.name || null,
      date: inv.created_at,
      viewUrl: `/api/admin/invoices/${inv.id}/pdf`,
    });
  }

  for (const p of paymentsRes.data ?? []) {
    const invoice = Array.isArray(p.invoices) ? p.invoices[0] : p.invoices;
    const client = invoice ? (Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients) : null;
    documents.push({
      id: p.id,
      type: "receipt",
      title: `Receipt${invoice?.invoice_number ? ` — ${invoice.invoice_number}` : ""}`,
      subtitle: `KES ${Number(p.amount).toLocaleString()}`,
      client: client?.company?.trim() || client?.name || null,
      date: p.date,
      viewUrl: `/api/admin/payments/${p.id}/pdf`,
    });
  }

  for (const f of projectDocsRes.data ?? []) {
    const project = Array.isArray(f.projects) ? f.projects[0] : f.projects;
    const client = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null;
    documents.push({
      id: f.id,
      type: "project_file",
      title: f.name,
      subtitle: project?.name ?? null,
      client: client?.company?.trim() || client?.name || null,
      date: f.uploaded_at,
      viewUrl: `/api/admin/documents/proxy?bucket=project-docs&path=${encodeURIComponent(f.storage_path)}`,
    });
  }

  for (const f of financeDocsRes.data ?? []) {
    documents.push({
      id: f.id,
      type: "finance_file",
      title: f.original_filename ?? f.doc_type,
      subtitle: f.amount ? `KES ${Number(f.amount).toLocaleString()}` : f.doc_type,
      client: f.party_name,
      date: f.doc_date,
      viewUrl: `/api/admin/documents/proxy?bucket=finance-docs&path=${encodeURIComponent(f.storage_path)}`,
    });
  }

  documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ data: documents });
}
