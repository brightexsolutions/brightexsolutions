import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  SITE_NAME, BUSINESS_DESCRIPTOR, BUSINESS_EMAIL,
  BUSINESS_PHONE, BUSINESS_WEBSITE, BUSINESS_CITY, BUSINESS_COUNTRY,
} from "@/lib/constants";

const NAVY  = "#152238";
const GOLD  = "#f9a825";
const GREEN = "#059669";
const GREEN_BG = "#d1fae5";
const GRAY  = "#64748b";
const LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";

const METHOD_LABELS: Record<string, string> = {
  mpesa:            "M-Pesa",
  mpesa_send_money: "M-Pesa Send Money",
  mpesa_till:       "M-Pesa Till (Buy Goods)",
  bank:             "Bank Transfer",
  paypal:           "PayPal",
  cash:             "Cash",
};

function fmt(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}

const s = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: "#ffffff", paddingHorizontal: 48, paddingTop: 36, paddingBottom: 36 },
  accentBar:    { height: 4, backgroundColor: GREEN, marginBottom: 28, borderRadius: 2 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brandName:    { fontFamily: "Helvetica-Bold", fontSize: 18, color: NAVY, letterSpacing: 0.5 },
  brandTag:     { fontSize: 9, color: GRAY, marginTop: 2 },
  docLabel:     { fontFamily: "Helvetica-Bold", fontSize: 24, color: NAVY, textAlign: "right" },
  docRef:       { fontSize: 10, color: GRAY, textAlign: "right", marginTop: 4 },
  // Status
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GREEN_BG, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, alignSelf: "flex-start" },
  statusText:   { fontFamily: "Helvetica-Bold", fontSize: 11, color: GREEN },
  // Client
  clientBox:    { marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  secLabel:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  clientName:   { fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY, marginBottom: 2 },
  clientDetail: { fontSize: 10, color: GRAY, marginBottom: 1 },
  // Summary table
  summaryTable: { marginBottom: 14, borderWidth: 1, borderColor: BORDER, borderRadius: 2 },
  summaryRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
  summaryLast:  { borderBottomWidth: 0 },
  summaryKey:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, width: 140 },
  summaryVal:   { fontSize: 10, color: NAVY, flex: 1 },
  amountVal:    { fontFamily: "Helvetica-Bold", fontSize: 14, color: GREEN },
  refVal:       { fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY },
  // Settlement
  settlBox:     { marginBottom: 14, borderWidth: 1, borderColor: BORDER, borderRadius: 2 },
  settlHead:    { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 2 },
  settlHeadTxt: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.8 },
  settlRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  settlRowLast: { borderBottomWidth: 0 },
  settlRowGreen:{ backgroundColor: GREEN_BG },
  settlKey:     { fontSize: 10, color: GRAY },
  settlVal:     { fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" },
  settlValGreen:{ color: GREEN },
  // Thank you
  thankBox:     { backgroundColor: LIGHT, borderLeftWidth: 3, borderLeftColor: GREEN, padding: 10, marginBottom: 20, borderRadius: 2 },
  thankText:    { fontSize: 10, color: "#334155", lineHeight: 1.6 },
  // Footer
  footer:       { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  footerContact:{ fontSize: 9, color: GRAY },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReceiptData = {
  receipt_reference?: string | null;
  amount: number;
  method?: string | null;
  reference?: string | null;
  date: string;
  invoice_number?: string | null;
  invoice_total?: number | null;
  balance?: number | null;
  client?: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptPDFDocument({ data }: { data: ReceiptData }) {
  const balance = data.balance ?? 0;
  const fullyPaid = balance <= 0;

  return (
    <Document title={`Receipt ${data.receipt_reference ?? ""}`} author="Brightex Solutions">
      <Page size="A4" style={s.page}>

        {/* Green accent bar — distinguishes receipt from invoice at a glance */}
        <View style={s.accentBar} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{SITE_NAME}</Text>
            <Text style={s.brandTag}>{BUSINESS_DESCRIPTOR}</Text>
            <Text style={[s.brandTag, { marginTop: 6 }]}>{BUSINESS_EMAIL}</Text>
            <Text style={s.brandTag}>{BUSINESS_PHONE}</Text>
          </View>
          <View>
            <Text style={s.docLabel}>RECEIPT</Text>
            {data.receipt_reference && <Text style={s.docRef}>{data.receipt_reference}</Text>}
          </View>
        </View>

        {/* Status badge */}
        <View style={s.statusBadge}>
          <Text style={s.statusText}>✓  PAYMENT CONFIRMED</Text>
        </View>

        {/* Received from */}
        {data.client && (
          <View style={s.clientBox}>
            <Text style={s.secLabel}>Received From</Text>
            {data.client.company ? (
              <>
                <Text style={s.clientName}>{data.client.company}</Text>
                {data.client.name && <Text style={s.clientDetail}>Attn: {data.client.name}</Text>}
              </>
            ) : (
              <Text style={s.clientName}>{data.client.name ?? "Client"}</Text>
            )}
            {data.client.email && <Text style={s.clientDetail}>{data.client.email}</Text>}
            {data.client.phone && <Text style={s.clientDetail}>{data.client.phone}</Text>}
          </View>
        )}

        {/* Payment summary */}
        <View style={s.summaryTable}>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Amount Received</Text>
            <Text style={[s.summaryVal, s.amountVal]}>{fmt(data.amount)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryKey}>Payment Date</Text>
            <Text style={s.summaryVal}>{fmtDate(data.date)}</Text>
          </View>
          {data.method && (
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Payment Method</Text>
              <Text style={s.summaryVal}>{METHOD_LABELS[data.method] ?? data.method}</Text>
            </View>
          )}
          <View style={[s.summaryRow, s.summaryLast]}>
            <Text style={s.summaryKey}>Transaction Reference</Text>
            <Text style={[s.summaryVal, data.reference ? s.refVal : {}]}>
              {data.reference ?? "—"}
            </Text>
          </View>
        </View>

        {/* Invoice settlement */}
        {data.invoice_number && (
          <View style={s.settlBox}>
            <View style={s.settlHead}>
              <Text style={s.settlHeadTxt}>Invoice Settlement</Text>
            </View>
            <View style={s.settlRow}>
              <Text style={s.settlKey}>Invoice Reference</Text>
              <Text style={s.settlVal}>{data.invoice_number}</Text>
            </View>
            {data.invoice_total != null && (
              <View style={s.settlRow}>
                <Text style={s.settlKey}>Invoice Total</Text>
                <Text style={s.settlVal}>{fmt(data.invoice_total)}</Text>
              </View>
            )}
            <View style={s.settlRow}>
              <Text style={s.settlKey}>This Payment</Text>
              <Text style={s.settlVal}>{fmt(data.amount)}</Text>
            </View>
            <View style={[s.settlRow, s.settlRowLast, fullyPaid ? s.settlRowGreen : {}]}>
              <Text style={s.settlKey}>Balance Remaining</Text>
              <Text style={[s.settlVal, fullyPaid ? s.settlValGreen : {}]}>
                {fullyPaid ? "KES 0.00 — Fully Settled" : fmt(balance)}
              </Text>
            </View>
          </View>
        )}

        {/* Thank you note */}
        <View style={s.thankBox}>
          <Text style={s.thankText}>
            Thank you for your payment. This receipt serves as official confirmation that your
            payment has been received and processed by {SITE_NAME}. Please retain this document
            for your records.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>{SITE_NAME}</Text>
          <Text style={s.footerContact}>{BUSINESS_WEBSITE} · {BUSINESS_CITY}, {BUSINESS_COUNTRY}</Text>
        </View>

      </Page>
    </Document>
  );
}
