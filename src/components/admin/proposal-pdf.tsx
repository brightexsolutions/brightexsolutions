import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  SITE_NAME, BUSINESS_DESCRIPTOR, BUSINESS_EMAIL,
  BUSINESS_PHONE, BUSINESS_WEBSITE, BUSINESS_CITY, BUSINESS_COUNTRY,
} from "@/lib/constants";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY   = "#152238";
const NAVY_D = "#0d1928";   // darker shade for cover accents
const GOLD   = "#f9a825";
const GOLD_L = "#fff8e1";   // gold tint for highlighted rows / callouts
const GRAY   = "#64748b";
const GRAY_L = "#f1f5f9";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" });
}
function total(items: ProposalLineItem[]) {
  return items.reduce((s, it) => s + it.qty * it.unit_price, 0);
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type ScopeItem = { title: string; description?: string | null };
export type ProposalLineItem = { description: string; qty: number; unit_price: number };
export type PaymentTerms = {
  deposit_percent: number;
  deposit_due?: string | null;
  balance_due?: string | null;
  note?: string | null;
};
export type ProposalData = {
  proposal_number: string;
  created_at: string;
  valid_until?: string | null;
  project_title: string;
  intro?: string | null;
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null };
  scope_items: ScopeItem[];
  line_items: ProposalLineItem[];
  payment_terms?: PaymentTerms | null;
  timeline?: string | null;
  notes?: string | null;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: WHITE, paddingBottom: 48 },

  // ── Cover band ──────────────────────────────────────────────────────────────
  cover:          { backgroundColor: NAVY, paddingHorizontal: 48, paddingTop: 44, paddingBottom: 32 },
  coverTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  brandName:      { fontFamily: "Helvetica-Bold", fontSize: 18, color: WHITE, letterSpacing: 0.5 },
  brandTag:       { fontSize: 9, color: "rgba(255,255,255,0.55)", marginTop: 3 },
  proposalTag:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1.8, textAlign: "right" },
  proposalRef:    { fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "right", marginTop: 3 },
  coverTitle:     { fontSize: 22, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 6, lineHeight: 1.3 },
  coverTitleGold: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD },
  goldLine:       { height: 2, backgroundColor: GOLD, marginTop: 24, marginBottom: 0, width: 48 },

  // ── Meta strip (below cover) ─────────────────────────────────────────────
  metaStrip:      { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, marginHorizontal: 48 },
  metaCell:       { flex: 1, paddingVertical: 16, paddingRight: 16, borderRightWidth: 1, borderRightColor: BORDER },
  metaCellLast:   { borderRightWidth: 0 },
  metaKey:        { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  metaVal:        { fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" },
  metaValSub:     { fontSize: 9, color: GRAY, marginTop: 2 },

  // ── Body padding ────────────────────────────────────────────────────────
  body:           { paddingHorizontal: 48 },

  // ── Section header ───────────────────────────────────────────────────────
  secHeader:      { flexDirection: "row", alignItems: "flex-start", gap: 14, marginTop: 36, marginBottom: 16 },
  secNumBox:      { width: 34, height: 34, backgroundColor: NAVY, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  secNumText:     { fontFamily: "Helvetica-Bold", fontSize: 13, color: WHITE },
  secTag:         { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  secTitle:       { fontFamily: "Helvetica-Bold", fontSize: 15, color: NAVY },

  // ── Intro / exec lede ────────────────────────────────────────────────────
  lede:           { fontSize: 11, color: "#334155", lineHeight: 1.75, borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 14, marginBottom: 4 },

  // ── KPI row ──────────────────────────────────────────────────────────────
  kpiRow:         { flexDirection: "row", gap: 10, marginBottom: 4 },
  kpiBox:         { flex: 1, backgroundColor: NAVY, borderRadius: 3, paddingHorizontal: 14, paddingVertical: 12 },
  kpiValue:       { fontFamily: "Helvetica-Bold", fontSize: 14, color: WHITE, marginBottom: 3 },
  kpiLabel:       { fontSize: 8, color: GOLD, textTransform: "uppercase", letterSpacing: 0.9 },

  // ── Scope items ──────────────────────────────────────────────────────────
  scopeItem:      { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  scopeItemLast:  { borderBottomWidth: 0 },
  scopeDot:       { width: 7, height: 7, backgroundColor: GOLD, borderRadius: 3.5, marginTop: 3 },
  scopeTitle:     { fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY, marginBottom: 3 },
  scopeDesc:      { fontSize: 10, color: GRAY, lineHeight: 1.55 },

  // ── Investment table ─────────────────────────────────────────────────────
  tableHead:      { flexDirection: "row", backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 2 },
  tableHeadText:  { fontFamily: "Helvetica-Bold", fontSize: 8, color: WHITE, textTransform: "uppercase", letterSpacing: 0.6 },
  tableRow:       { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt:    { backgroundColor: GRAY_L },
  cellText:       { fontSize: 10, color: "#334155" },
  colDesc:        { flex: 1 },
  colQty:         { width: 40, textAlign: "center" },
  colPrice:       { width: 90, textAlign: "right" },
  colTotal:       { width: 90, textAlign: "right" },
  totalRow:       { flexDirection: "row", justifyContent: "flex-end", backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 2, marginTop: 4 },
  totalLabel:     { fontFamily: "Helvetica-Bold", fontSize: 11, color: GOLD, width: 100, textAlign: "right", marginRight: 16 },
  totalValue:     { fontFamily: "Helvetica-Bold", fontSize: 11, color: WHITE, width: 90, textAlign: "right" },

  // ── Payment terms ────────────────────────────────────────────────────────
  termsBox:       { borderWidth: 1, borderColor: BORDER, borderRadius: 2, marginBottom: 4 },
  termsHead:      { backgroundColor: GOLD_L, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 14, paddingVertical: 9 },
  termsHeadText:  { fontFamily: "Helvetica-Bold", fontSize: 9, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 },
  termsRow:       { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  termsRowLast:   { borderBottomWidth: 0 },
  termsKey:       { fontSize: 10, color: GRAY },
  termsVal:       { fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY },
  termsNote:      { fontSize: 9, color: GRAY, lineHeight: 1.6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER },

  // ── About ────────────────────────────────────────────────────────────────
  aboutBox:       { backgroundColor: NAVY, borderRadius: 3, padding: 20, marginBottom: 4 },
  aboutTitle:     { fontFamily: "Helvetica-Bold", fontSize: 12, color: WHITE, marginBottom: 8 },
  aboutText:      { fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.75 },
  aboutHighlight: { color: GOLD, fontFamily: "Helvetica-Bold" },

  // ── Next steps ───────────────────────────────────────────────────────────
  stepRow:        { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 12 },
  stepNumBox:     { width: 28, height: 28, backgroundColor: GOLD, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  stepNumText:    { fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY },
  stepTitle:      { fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY, marginBottom: 2 },
  stepDesc:       { fontSize: 10, color: GRAY, lineHeight: 1.55 },
  stepContent:    { flex: 1, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 12 },
  stepContentLast:{ borderBottomWidth: 0 },

  // ── Notes ────────────────────────────────────────────────────────────────
  noteBox:        { borderWidth: 1, borderStyle: "dashed", borderColor: BORDER, borderRadius: 2, padding: 12, marginTop: 8 },
  noteText:       { fontSize: 9, color: GRAY, lineHeight: 1.6 },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer:         { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16, marginTop: 36, marginHorizontal: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  footerContact:  { fontSize: 9, color: GRAY, textAlign: "right" },
  footerConfid:   { fontSize: 8, color: BORDER, marginTop: 3, textAlign: "right" },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ num, tag, title }: { num: string; tag: string; title: string }) {
  return (
    <View style={s.secHeader}>
      <View style={s.secNumBox}>
        <Text style={s.secNumText}>{num}</Text>
      </View>
      <View style={{ justifyContent: "center" }}>
        <Text style={s.secTag}>{tag}</Text>
        <Text style={s.secTitle}>{title}</Text>
      </View>
    </View>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export function ProposalPDFDocument({ data }: { data: ProposalData }) {
  const grandTotal = total(data.line_items);
  const deposit    = data.payment_terms
    ? Math.round(grandTotal * (data.payment_terms.deposit_percent / 100))
    : null;
  const balance    = deposit != null ? grandTotal - deposit : null;

  return (
    <Document
      title={`Proposal ${data.proposal_number} — ${data.project_title}`}
      author="Brightex Solutions"
    >
      <Page size="A4" style={s.page}>

        {/* ── Cover band ───────────────────────────────────────────────── */}
        <View style={s.cover}>
          <View style={s.coverTop}>
            <View>
              <Text style={s.brandName}>{SITE_NAME}</Text>
              <Text style={s.brandTag}>{BUSINESS_DESCRIPTOR}</Text>
            </View>
            <View>
              <Text style={s.proposalTag}>Proposal</Text>
              <Text style={s.proposalRef}>{data.proposal_number}</Text>
            </View>
          </View>

          <Text style={s.coverTitle}>
            {data.project_title}
          </Text>
          <Text style={[s.brandTag, { fontSize: 10, marginTop: 2 }]}>
            Prepared for{" "}
            <Text style={{ color: "rgba(255,255,255,0.9)", fontFamily: "Helvetica-Bold" }}>
              {data.client.company ?? data.client.name}
            </Text>
          </Text>

          <View style={s.goldLine} />
        </View>

        {/* ── Meta strip ───────────────────────────────────────────────── */}
        <View style={s.metaStrip}>
          <View style={s.metaCell}>
            <Text style={s.metaKey}>Prepared For</Text>
            <Text style={s.metaVal}>{data.client.company ?? data.client.name}</Text>
            {data.client.company && <Text style={s.metaValSub}>{data.client.name}</Text>}
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaKey}>Date Issued</Text>
            <Text style={s.metaVal}>{fmtDate(data.created_at)}</Text>
          </View>
          {data.valid_until && (
            <View style={s.metaCell}>
              <Text style={s.metaKey}>Valid Until</Text>
              <Text style={s.metaVal}>{fmtDate(data.valid_until)}</Text>
            </View>
          )}
          <View style={[s.metaCell, s.metaCellLast]}>
            <Text style={s.metaKey}>Total Investment</Text>
            <Text style={[s.metaVal, { color: NAVY }]}>{fmt(grandTotal)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── KPI row ──────────────────────────────────────────────────── */}
          <View style={[s.kpiRow, { marginTop: 28 }]}>
            <View style={s.kpiBox}>
              <Text style={s.kpiValue}>{fmt(grandTotal)}</Text>
              <Text style={s.kpiLabel}>Total Investment</Text>
            </View>
            {deposit != null && (
              <View style={s.kpiBox}>
                <Text style={s.kpiValue}>{fmt(deposit)}</Text>
                <Text style={s.kpiLabel}>Deposit ({data.payment_terms!.deposit_percent}%)</Text>
              </View>
            )}
            <View style={s.kpiBox}>
              <Text style={s.kpiValue}>{data.scope_items.length}</Text>
              <Text style={s.kpiLabel}>Deliverables</Text>
            </View>
            {data.timeline && (
              <View style={s.kpiBox}>
                <Text style={s.kpiValue}>{data.timeline}</Text>
                <Text style={s.kpiLabel}>Timeline</Text>
              </View>
            )}
          </View>

          {/* ── Executive Summary ─────────────────────────────────────────── */}
          {data.intro && (
            <>
              <SectionHeader num="01" tag="Overview" title="Executive Summary" />
              <Text style={s.lede}>{data.intro}</Text>
            </>
          )}

          {/* ── Scope of Work ─────────────────────────────────────────────── */}
          {data.scope_items.length > 0 && (
            <>
              <SectionHeader
                num={data.intro ? "02" : "01"}
                tag="Deliverables"
                title="Scope of Work"
              />
              <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 2 }}>
                {data.scope_items.map((item, i) => (
                  <View
                    key={i}
                    style={[
                      s.scopeItem,
                      { paddingHorizontal: 14 },
                      i === data.scope_items.length - 1 ? s.scopeItemLast : {},
                    ]}
                  >
                    <View style={s.scopeDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.scopeTitle}>{item.title}</Text>
                      {item.description && <Text style={s.scopeDesc}>{item.description}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Investment ────────────────────────────────────────────────── */}
          {data.line_items.length > 0 && (
            <>
              <SectionHeader
                num={[data.intro, data.scope_items.length > 0].filter(Boolean).length === 2
                  ? "03" : [data.intro, data.scope_items.length > 0].filter(Boolean).length === 1
                  ? "02" : "01"}
                tag="Pricing"
                title="Investment & Pricing"
              />

              {/* Table head */}
              <View style={s.tableHead}>
                <Text style={[s.tableHeadText, s.colDesc]}>Description</Text>
                <Text style={[s.tableHeadText, s.colQty]}>Qty</Text>
                <Text style={[s.tableHeadText, s.colPrice]}>Unit Price</Text>
                <Text style={[s.tableHeadText, s.colTotal]}>Total</Text>
              </View>

              {/* Rows */}
              {data.line_items.map((item, i) => (
                <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                  <Text style={[s.cellText, s.colDesc]}>{item.description}</Text>
                  <Text style={[s.cellText, s.colQty]}>{item.qty}</Text>
                  <Text style={[s.cellText, s.colPrice]}>{fmt(item.unit_price)}</Text>
                  <Text style={[s.cellText, s.colTotal]}>{fmt(item.qty * item.unit_price)}</Text>
                </View>
              ))}

              {/* Grand total */}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Total Investment</Text>
                <Text style={s.totalValue}>{fmt(grandTotal)}</Text>
              </View>

              {/* Scope note */}
              <View style={[s.noteBox, { marginTop: 10 }]}>
                <Text style={s.noteText}>
                  Prices are estimates based on current scope. Any changes to scope or requirements
                  after project commencement may be subject to a revised quotation.
                </Text>
              </View>
            </>
          )}

          {/* ── Payment Terms ─────────────────────────────────────────────── */}
          {data.payment_terms && deposit != null && balance != null && (
            <>
              <SectionHeader num="04" tag="Billing" title="Payment Terms" />
              <View style={s.termsBox}>
                <View style={s.termsHead}>
                  <Text style={s.termsHeadText}>
                    {data.payment_terms.deposit_percent}/{100 - data.payment_terms.deposit_percent} Split
                  </Text>
                </View>
                <View style={s.termsRow}>
                  <Text style={s.termsKey}>
                    Deposit ({data.payment_terms.deposit_percent}%) — due to commence work
                  </Text>
                  <Text style={s.termsVal}>{fmt(deposit)}</Text>
                </View>
                <View style={[s.termsRow, s.termsRowLast]}>
                  <Text style={s.termsKey}>
                    Balance ({100 - data.payment_terms.deposit_percent}%) — due on delivery
                  </Text>
                  <Text style={s.termsVal}>{fmt(balance)}</Text>
                </View>
                {data.payment_terms.note && (
                  <Text style={s.termsNote}>{data.payment_terms.note}</Text>
                )}
              </View>
            </>
          )}

          {/* ── About Brightex ────────────────────────────────────────────── */}
          <SectionHeader num="05" tag="Who We Are" title="About Brightex Solutions" />
          <View style={s.aboutBox}>
            <Text style={s.aboutTitle}>{SITE_NAME}</Text>
            <Text style={s.aboutText}>
              {SITE_NAME} is a Nairobi-based technology and business consulting firm. We
              specialise in designing and building digital products — websites, web applications,
              management systems, and business automation tools — for organisations across East
              Africa and beyond.{"\n\n"}
              Every project we take on is built to a professional standard: clean code, modern
              design, and practical systems that your team can actually use. We work closely with
              our clients throughout the project, ensuring the final result aligns with your
              goals, not just the initial brief.{"\n\n"}
              <Text style={s.aboutHighlight}>Website: </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)" }}>{BUSINESS_WEBSITE}</Text>
              {"  ·  "}
              <Text style={s.aboutHighlight}>Email: </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)" }}>{BUSINESS_EMAIL}</Text>
              {"  ·  "}
              <Text style={s.aboutHighlight}>Phone: </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)" }}>{BUSINESS_PHONE}</Text>
            </Text>
          </View>

          {/* ── Next Steps ────────────────────────────────────────────────── */}
          <SectionHeader num="06" tag="Getting Started" title="Next Steps" />

          {[
            { title: "Review this proposal", desc: `Read through the scope and pricing in detail. This proposal is valid for 14 days from the date issued${data.valid_until ? ` (until ${fmtDate(data.valid_until)})` : ""}.` },
            { title: "Confirm and sign off", desc: "Reply to confirm your acceptance of the scope and terms. A written confirmation via email is sufficient to proceed." },
            { title: "Pay the deposit", desc: deposit != null ? `Transfer the deposit of ${fmt(deposit)} to confirm the project start date.` : "Transfer the agreed deposit to confirm the project start date." },
            { title: "Project kick-off", desc: "We schedule a kick-off call to align on milestones, communication channels, and delivery timeline." },
            { title: "Delivery and handover", desc: "We deliver the agreed scope, conduct a review session with you, address any amendments, and hand over all project assets." },
          ].map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNumBox}>
                <Text style={s.stepNumText}>{String(i + 1).padStart(2, "0")}</Text>
              </View>
              <View style={[s.stepContent, i === 4 ? s.stepContentLast : {}]}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          {/* ── Custom notes ──────────────────────────────────────────────── */}
          {data.notes && (
            <View style={[s.noteBox, { marginTop: 16 }]}>
              <Text style={[s.noteText, { color: "#475569" }]}>{data.notes}</Text>
            </View>
          )}

        </View>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>{SITE_NAME}</Text>
          <View>
            <Text style={s.footerContact}>{BUSINESS_WEBSITE} · {BUSINESS_CITY}, {BUSINESS_COUNTRY}</Text>
            <Text style={s.footerConfid}>
              Confidential — prepared exclusively for {data.client.company ?? data.client.name}
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
