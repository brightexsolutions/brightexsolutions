import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SITE_NAME, BUSINESS_DESCRIPTOR, BUSINESS_EMAIL, BUSINESS_PHONE, BUSINESS_WEBSITE, BUSINESS_CITY, BUSINESS_COUNTRY } from "@/lib/constants";

const NAVY = "#152238";
const GOLD = "#f9a825";
const GRAY = "#64748b";
const LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: "#ffffff", paddingHorizontal: 48, paddingVertical: 48 },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 },
  brandBlock: { flexDirection: "column" },
  brandName: { fontFamily: "Helvetica-Bold", fontSize: 18, color: NAVY, letterSpacing: 0.5 },
  brandTag: { fontSize: 9, color: GRAY, marginTop: 2 },
  invoiceLabel: { fontFamily: "Helvetica-Bold", fontSize: 24, color: NAVY, textAlign: "right" },
  invoiceNumber: { fontSize: 10, color: GRAY, textAlign: "right", marginTop: 4 },
  // Meta strip
  metaStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BORDER },
  metaBlock: { flexDirection: "column", gap: 4 },
  metaLabel: { fontSize: 8, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  metaValue: { fontSize: 10, color: NAVY },
  // Bill-to
  billTo: { marginBottom: 28 },
  sectionLabel: { fontSize: 8, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  clientName: { fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY, marginBottom: 2 },
  clientDetail: { fontSize: 10, color: GRAY, marginBottom: 1 },
  // Table
  table: { marginBottom: 24 },
  tableHead: { flexDirection: "row", backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2 },
  tableHeadText: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.6 },
  tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: LIGHT },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "center" },
  colPrice: { width: 80, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },
  cellText: { fontSize: 10, color: "#334155" },
  // Totals
  totalsBlock: { alignItems: "flex-end", marginBottom: 28 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 0, marginBottom: 4 },
  totalLabel: { fontSize: 10, color: GRAY, width: 100, textAlign: "right", marginRight: 16 },
  totalValue: { fontSize: 10, color: "#1e293b", width: 90, textAlign: "right" },
  grandRow: { flexDirection: "row", justifyContent: "flex-end", backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD, width: 100, textAlign: "right", marginRight: 16 },
  grandValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff", width: 90, textAlign: "right" },
  // Notes
  notesBox: { backgroundColor: LIGHT, borderLeftWidth: 3, borderLeftColor: GOLD, padding: 12, marginBottom: 28, borderRadius: 2 },
  notesLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  notesText: { fontSize: 10, color: "#334155", lineHeight: 1.5 },
  // Footer
  footer: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  footerContact: { fontSize: 9, color: GRAY },
  accentBar: { height: 4, backgroundColor: GOLD, marginBottom: 48, borderRadius: 2 },
});

type LineItem = { description: string; qty: number; unit_price: number; total?: number };
type InvoiceData = {
  invoice_number?: string | null;
  created_at: string;
  due_date?: string | null;
  total: number;
  subtotal?: number | null;
  tax?: number | null;
  notes?: string | null;
  items: LineItem[];
  payment_method?: string | null;
  clients?: { name?: string | null; company?: string | null; email?: string | null; phone?: string | null } | null;
};
export type InvoicePaymentSettings = {
  invoice_mpesa_number?: string;
  invoice_mpesa_name?: string;
  invoice_till_number?: string;
  invoice_till_name?: string;
  invoice_paypal_email?: string;
  invoice_bank_name?: string;
  invoice_bank_account_name?: string;
  invoice_bank_account_number?: string;
  invoice_bank_branch?: string;
  invoice_footer_note?: string;
};

function fmt(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicePDFDocument({ invoice, paymentSettings }: { invoice: InvoiceData; paymentSettings?: InvoicePaymentSettings }) {
  const items: LineItem[] = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = invoice.subtotal ?? items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const tax = invoice.tax ?? 0;
  const total = invoice.total;

  return (
    <Document title={`Invoice ${invoice.invoice_number ?? "Draft"}`} author="Brightex Solutions">
      <Page size="A4" style={s.page}>
        {/* Top accent bar */}
        <View style={s.accentBar} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>{SITE_NAME}</Text>
            <Text style={s.brandTag}>{BUSINESS_DESCRIPTOR}</Text>
            <Text style={[s.brandTag, { marginTop: 6 }]}>{BUSINESS_EMAIL}</Text>
            <Text style={s.brandTag}>{BUSINESS_PHONE}</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{invoice.invoice_number ?? "DRAFT"}</Text>
          </View>
        </View>

        {/* Meta strip */}
        <View style={s.metaStrip}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={s.metaValue}>{new Date(invoice.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" }) : "On receipt"}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Amount Due</Text>
            <Text style={[s.metaValue, { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 13 }]}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={s.billTo}>
          <Text style={s.sectionLabel}>Bill To</Text>
          {invoice.clients?.company ? (
            <>
              <Text style={s.clientName}>{invoice.clients.company}</Text>
              {invoice.clients.name && (
                <Text style={s.clientDetail}>Attn: {invoice.clients.name}</Text>
              )}
            </>
          ) : (
            <Text style={s.clientName}>{invoice.clients?.name ?? "Client"}</Text>
          )}
          {invoice.clients?.email && <Text style={s.clientDetail}>{invoice.clients.email}</Text>}
          {invoice.clients?.phone && <Text style={s.clientDetail}>{invoice.clients.phone}</Text>}
        </View>

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, s.colDesc]}>Description</Text>
            <Text style={[s.tableHeadText, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeadText, s.colPrice]}>Unit Price</Text>
            <Text style={[s.tableHeadText, s.colTotal]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
              <Text style={[s.cellText, s.colDesc]}>{item.description}</Text>
              <Text style={[s.cellText, s.colQty]}>{item.qty}</Text>
              <Text style={[s.cellText, s.colPrice]}>{fmt(item.unit_price)}</Text>
              <Text style={[s.cellText, s.colTotal]}>{fmt(item.qty * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{fmt(subtotal)}</Text>
          </View>
          {tax > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>VAT / Tax</Text>
              <Text style={s.totalValue}>{fmt(tax)}</Text>
            </View>
          )}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Total Due</Text>
            <Text style={s.grandValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Payment Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment Details — method-aware */}
        {paymentSettings && (() => {
          const m = invoice.payment_method ?? "all";
          const show = (method: string) => m === "all" || m === method;
          const hasMpesa = show("mpesa_send_money") && paymentSettings.invoice_mpesa_number;
          const hasTill = show("mpesa_till") && paymentSettings.invoice_till_number;
          const hasPaypal = show("paypal") && paymentSettings.invoice_paypal_email;
          const hasBank = show("bank") && paymentSettings.invoice_bank_name;
          if (!hasMpesa && !hasTill && !hasPaypal && !hasBank) return null;
          return (
            <View style={{ marginBottom: 28, borderWidth: 1, borderColor: BORDER, borderRadius: 2 }}>
              <View style={{ backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 11, color: GOLD }}>■</Text>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 }}>Payment Details</Text>
              </View>
              <View style={{ padding: 12, gap: 10 }}>
                {hasMpesa && (
                  <View>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>M-Pesa Send Money</Text>
                    <Text style={{ fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" }}>{paymentSettings.invoice_mpesa_number}</Text>
                    {paymentSettings.invoice_mpesa_name ? <Text style={{ fontSize: 10, color: GRAY }}>{paymentSettings.invoice_mpesa_name}</Text> : null}
                  </View>
                )}
                {hasTill && (
                  <View>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>M-Pesa Till (Buy Goods)</Text>
                    <Text style={{ fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" }}>Till No: {paymentSettings.invoice_till_number}</Text>
                    {paymentSettings.invoice_till_name ? <Text style={{ fontSize: 10, color: GRAY }}>{paymentSettings.invoice_till_name}</Text> : null}
                  </View>
                )}
                {hasPaypal && (
                  <View>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>PayPal</Text>
                    <Text style={{ fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" }}>{paymentSettings.invoice_paypal_email}</Text>
                  </View>
                )}
                {hasBank && (
                  <View>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>Bank Transfer</Text>
                    <Text style={{ fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" }}>{paymentSettings.invoice_bank_name}</Text>
                    {paymentSettings.invoice_bank_account_name ? <Text style={{ fontSize: 10, color: GRAY }}>Account Name: {paymentSettings.invoice_bank_account_name}</Text> : null}
                    {paymentSettings.invoice_bank_account_number ? <Text style={{ fontSize: 10, color: GRAY }}>Account No: {paymentSettings.invoice_bank_account_number}</Text> : null}
                    {paymentSettings.invoice_bank_branch ? <Text style={{ fontSize: 10, color: GRAY }}>Branch: {paymentSettings.invoice_bank_branch}</Text> : null}
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Footer note */}
        {paymentSettings?.invoice_footer_note ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 10, color: GRAY, textAlign: "center" }}>{paymentSettings.invoice_footer_note}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>{SITE_NAME}</Text>
          <Text style={s.footerContact}>{BUSINESS_WEBSITE} · {BUSINESS_CITY}, {BUSINESS_COUNTRY}</Text>
        </View>
      </Page>
    </Document>
  );
}
