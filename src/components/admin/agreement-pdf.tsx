import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  SITE_NAME, BUSINESS_DESCRIPTOR, BUSINESS_EMAIL,
  BUSINESS_PHONE, BUSINESS_WEBSITE, BUSINESS_CITY, BUSINESS_COUNTRY,
} from "@/lib/constants";
import type { AgreementData } from "@/lib/document-types";

// Fallback PDF only — used as an email attachment when the branded HTML
// document (src/lib/document-html/agreement.ts, served at
// /api/public/documents/[id]) can't be reached. Deliberately simpler than
// the HTML version, not a pixel match for it.
const NAVY   = "#152238";
const GOLD   = "#f9a825";
const GRAY   = "#64748b";
const LIGHT  = "#f8fafc";
const BORDER = "#e2e8f0";

function fmt(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: "#ffffff", paddingHorizontal: 48, paddingTop: 36, paddingBottom: 36 },
  accentBar:   { height: 4, backgroundColor: NAVY, marginBottom: 28, borderRadius: 2 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  brandName:   { fontFamily: "Helvetica-Bold", fontSize: 18, color: NAVY, letterSpacing: 0.5 },
  brandTag:    { fontSize: 9, color: GRAY, marginTop: 2 },
  docLabel:    { fontFamily: "Helvetica-Bold", fontSize: 22, color: NAVY, textAlign: "right" },
  docRef:      { fontSize: 10, color: GRAY, textAlign: "right", marginTop: 4 },
  title:       { fontFamily: "Helvetica-Bold", fontSize: 16, color: NAVY, marginBottom: 10 },
  secLabel:    { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  clientBox:   { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  clientName:  { fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY, marginBottom: 2 },
  clientDetail:{ fontSize: 10, color: GRAY, marginBottom: 1 },
  bodyText:    { fontSize: 10, color: "#334155", lineHeight: 1.6, marginBottom: 16 },
  bullet:      { flexDirection: "row", marginBottom: 5 },
  bulletMark:  { width: 10, fontSize: 10, color: GOLD, fontFamily: "Helvetica-Bold" },
  bulletText:  { flex: 1, fontSize: 10, color: "#334155", lineHeight: 1.5 },
  table:       { marginTop: 4, marginBottom: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 2 },
  tHead:       { flexDirection: "row", backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 8 },
  tHeadTxt:    { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.6 },
  tRow:        { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tRowLast:    { borderBottomWidth: 0, backgroundColor: LIGHT },
  tCell:       { fontSize: 10, color: "#334155" },
  tCellBold:   { fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" },
  sigRow:      { flexDirection: "row", justifyContent: "space-between", marginTop: 36 },
  sigBlock:    { width: "42%" },
  sigLine:     { borderTopWidth: 1, borderTopColor: "#94a3b8", marginTop: 40, paddingTop: 6 },
  sigLabel:    { fontSize: 9, color: GRAY },
  footer:      { position: "absolute", bottom: 28, left: 48, right: 48, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  footerContact:{ fontSize: 9, color: GRAY },
});

export function AgreementPDFDocument({ data }: { data: AgreementData }) {
  const clientLabel = data.client.company?.trim() || data.client.name;

  return (
    <Document title={`Agreement ${data.agreement_number}`} author="Brightex Solutions">
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />

        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{SITE_NAME}</Text>
            <Text style={s.brandTag}>{BUSINESS_DESCRIPTOR}</Text>
            <Text style={[s.brandTag, { marginTop: 6 }]}>{BUSINESS_EMAIL}</Text>
            <Text style={s.brandTag}>{BUSINESS_PHONE}</Text>
          </View>
          <View>
            <Text style={s.docLabel}>SERVICES AGREEMENT</Text>
            <Text style={s.docRef}>{data.agreement_number}</Text>
            <Text style={s.docRef}>{fmtDate(data.created_at)}</Text>
          </View>
        </View>

        <Text style={s.title}>{data.project_title}</Text>

        <View style={s.clientBox}>
          <Text style={s.secLabel}>Client</Text>
          {data.client.company ? (
            <>
              <Text style={s.clientName}>{clientLabel}</Text>
              <Text style={s.clientDetail}>Attn: {data.client.name}</Text>
            </>
          ) : (
            <Text style={s.clientName}>{clientLabel}</Text>
          )}
          {data.client.email && <Text style={s.clientDetail}>{data.client.email}</Text>}
          {data.client.phone && <Text style={s.clientDetail}>{data.client.phone}</Text>}
        </View>

        <Text style={s.secLabel}>Scope Of Work</Text>
        <Text style={s.bodyText}>{data.scope_summary}</Text>

        <Text style={s.secLabel}>Deliverables</Text>
        <View style={{ marginBottom: 16 }}>
          {data.deliverables.map((d, i) => (
            <View style={s.bullet} key={i}>
              <Text style={s.bulletMark}>{"-"}</Text>
              <Text style={s.bulletText}>{d}</Text>
            </View>
          ))}
        </View>

        <Text style={s.secLabel}>Payment Milestones</Text>
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.tHeadTxt, { flex: 1 }]}>Milestone</Text>
            <Text style={[s.tHeadTxt, { width: 90, textAlign: "right" }]}>Amount</Text>
            <Text style={[s.tHeadTxt, { width: 90, textAlign: "right" }]}>Due</Text>
          </View>
          {data.payment_milestones.map((m, i) => (
            <View style={s.tRow} key={i}>
              <Text style={[s.tCell, { flex: 1 }]}>{m.label}</Text>
              <Text style={[s.tCell, { width: 90, textAlign: "right" }]}>{fmt(m.amount)}</Text>
              <Text style={[s.tCell, { width: 90, textAlign: "right" }]}>{m.due}</Text>
            </View>
          ))}
          <View style={[s.tRow, s.tRowLast]}>
            <Text style={[s.tCellBold, { flex: 1 }]}>Total Fees</Text>
            <Text style={[s.tCellBold, { width: 90, textAlign: "right" }]}>{fmt(data.total_fees)}</Text>
            <Text style={[s.tCell, { width: 90 }]}></Text>
          </View>
        </View>

        <Text style={s.secLabel}>Timeline</Text>
        <Text style={s.bodyText}>{data.timeline}</Text>

        {data.special_terms && (
          <>
            <Text style={s.secLabel}>Special Terms</Text>
            <Text style={s.bodyText}>{data.special_terms}</Text>
          </>
        )}

        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine}>
              <Text style={s.sigLabel}>For {SITE_NAME}</Text>
            </View>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine}>
              <Text style={s.sigLabel}>For {clientLabel}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>{SITE_NAME}</Text>
          <Text style={s.footerContact}>{BUSINESS_WEBSITE} · {BUSINESS_CITY}, {BUSINESS_COUNTRY}</Text>
        </View>
      </Page>
    </Document>
  );
}
