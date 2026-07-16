/**
 * Brightex document HTML system — matches the brightex-proposals skill and
 * its reference implementation exactly (projects/magic-movers/proposal/
 * brightex_magic-movers_proposal_2026-07.html): cover, table of contents,
 * numbered sections, KPI rows, feature cards, investment tables, timeline,
 * retainer tiers, steps, and a navy/orange footer. Same CSS class names, so
 * any document generated through this file looks exactly like that
 * reference — not an approximation of it.
 *
 * Every document is a single self-contained HTML page. It IS the artifact:
 * viewed directly (in an iframe or a new tab) or turned into a PDF via the
 * browser's own print dialog (the "Download PDF" button just calls
 * window.print() — no separate server-side PDF pipeline, same as the
 * reference proposal).
 */
import { SITE_NAME, BUSINESS_WEBSITE, BUSINESS_EMAIL, BUSINESS_PHONE } from "@/lib/constants";

// ─── Shared CSS — copied 1:1 from the reference implementation ───────────────
const DOCUMENT_CSS = `
  :root{
    --navy:#0d1f4e; --navy-mid:#1a3066; --navy-light:#e8edf8;
    --orange:#e8920a; --orange-light:#fff5e0;
    --white:#fff; --gray-50:#f9f9f9; --gray-100:#f0f0f0; --gray-200:#e0e0e0;
    --gray-600:#555; --gray-800:#222;
    --font:"Georgia",serif; --sans:"Helvetica Neue",Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:#e9edf4;font-family:var(--sans);color:var(--gray-800);line-height:1.65;font-size:15px}

  .dl-bar{position:sticky;top:0;z-index:50;background:var(--navy);color:#fff;display:flex;
    align-items:center;justify-content:space-between;padding:12px 22px;font-size:13px;letter-spacing:.04em}
  .dl-bar span{font-weight:600;opacity:.9}
  .dl-btn{background:var(--orange);color:#fff;border:none;font-weight:700;font-size:13px;
    padding:9px 18px;border-radius:4px;cursor:pointer;font-family:var(--sans)}
  .dl-btn:hover{background:#cf8009}

  .doc-wrap{max-width:900px;margin:24px auto;background:#fff;box-shadow:0 20px 60px rgba(13,31,78,.18)}

  h1,h2,h3,.serif{font-family:var(--font)}
  p{margin:0 0 13px}
  strong{color:var(--navy)}

  .cover{position:relative;background:var(--navy);color:#fff;min-height:480px;padding:52px 70px;overflow:hidden}
  .cover .circ1{position:absolute;top:-90px;right:-70px;width:280px;height:280px;border-radius:50%;
    background:rgba(255,255,255,.05)}
  .cover .circ2{position:absolute;bottom:-110px;right:40px;width:230px;height:230px;border-radius:50%;
    background:rgba(232,146,10,.14)}
  .cover-body{position:relative;z-index:2}
  .cover-tag{color:var(--orange);font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin:40px 0 18px}
  .cover-title{font-family:var(--font);font-size:40px;line-height:1.15;font-weight:400;margin:0}
  .cover-title strong{color:#fff;font-weight:700;display:block}
  .cover-sub{color:rgba(255,255,255,.7);font-size:16px;max-width:30rem;margin-top:18px}
  .cover-meta{display:flex;gap:44px;border-top:1px solid rgba(255,255,255,.18);margin-top:40px;padding-top:20px;flex-wrap:wrap}
  .cover-meta .lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5)}
  .cover-meta .val{font-size:14px;font-weight:600;margin-top:3px}
  .cover-badges{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap}
  .badge{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:6px;
    padding:8px 14px;font-size:12px}
  .badge b{color:var(--orange)}
  .confid{margin-top:30px;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:.04em}

  .toc-page{background:var(--gray-50);padding:36px 70px;border-bottom:1px solid var(--gray-200)}
  .toc-page h2{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--navy);margin:0 0 20px;font-family:var(--sans)}
  .toc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px}
  .toc-item{display:flex;align-items:baseline;gap:12px;font-size:14px;padding:7px 0;border-bottom:1px dotted var(--gray-200)}
  .toc-item .n{color:var(--orange);font-weight:700;font-family:var(--font);font-size:15px}

  .section{padding:44px 70px;border-bottom:1px solid var(--gray-100)}
  .section-header{display:flex;gap:16px;align-items:center;margin-bottom:22px}
  .sec-num{width:40px;height:40px;flex:none;background:var(--navy);color:#fff;font-family:var(--font);
    font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:4px}
  .sec-tag{color:var(--orange);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
  .sec-title{font-family:var(--font);font-size:22px;color:var(--navy);font-weight:700;line-height:1.2}

  .exec-lede{font-family:var(--font);font-size:17px;color:var(--navy);border-left:4px solid var(--orange);
    padding:4px 0 4px 18px;margin:20px 0}

  .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:22px 0}
  .kpi{background:var(--navy);color:#fff;border-radius:6px;padding:20px 18px}
  .kpi .v{font-family:var(--font);font-size:24px;font-weight:700}
  .kpi .l{color:var(--orange);font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-top:4px}

  .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
  .fcard{border:1px solid var(--gray-200);border-radius:8px;padding:20px}
  .ficon{width:34px;height:34px;background:var(--orange-light);color:var(--orange);border-radius:6px;
    display:flex;align-items:center;justify-content:center;font-size:17px;margin-bottom:12px}
  .fcard h4{font-family:var(--font);color:var(--navy);font-size:16px;margin:0 0 8px}
  .arrow-list{list-style:none;padding:0;margin:0}
  .arrow-list li{position:relative;padding-left:20px;margin-bottom:7px;font-size:13.5px;color:var(--gray-600)}
  .arrow-list li::before{content:"→";position:absolute;left:0;color:var(--orange);font-weight:700}
  .arrow-list li strong{color:var(--navy)}

  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  thead th{background:var(--navy);color:#fff;text-align:left;padding:13px 14px;font-size:11px;
    letter-spacing:.08em;text-transform:uppercase;font-weight:700}
  tbody td{padding:13px 14px;border-bottom:1px solid var(--gray-100);vertical-align:top}
  tbody tr:nth-child(even){background:var(--gray-50)}
  td.amt{text-align:right;font-weight:700;white-space:nowrap;color:var(--navy)}
  tr.total td{background:var(--navy);color:#fff;border:none}
  tr.total td.amt{color:var(--orange);font-size:16px}

  .tl{margin-top:20px}
  .tl-row{display:grid;grid-template-columns:120px 30px 1fr;gap:0;align-items:stretch}
  .tl-week{background:var(--navy);color:#fff;border-radius:6px;padding:12px;text-align:center;
    font-size:12px;font-weight:600;align-self:start}
  .tl-week.launch{background:var(--orange)}
  .tl-mid{display:flex;flex-direction:column;align-items:center}
  .tl-dot{width:14px;height:14px;border-radius:50%;background:var(--orange);margin-top:14px;flex:none}
  .tl-line{width:2px;flex:1;background:var(--gray-200)}
  .tl-content{padding:0 0 26px 14px}
  .tl-content h4{font-family:var(--font);color:var(--navy);margin:8px 0 4px;font-size:16px}
  .tl-content.launch{background:var(--orange-light);border-radius:6px;padding:12px 14px}

  .tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
  .tier{border:1px solid var(--gray-200);border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
  .tier .head{background:var(--navy);color:#fff;padding:14px;text-align:center;font-family:var(--font);font-weight:700}
  .tier.feat .head{background:var(--orange)}
  .tier .body{padding:16px;display:flex;flex-direction:column;flex:1}
  .tier .body ul{list-style:none;padding:0;margin:0 0 14px}
  .tier .body li{position:relative;padding-left:20px;margin-bottom:7px;font-size:13px;color:var(--gray-600)}
  .tier .body li::before{content:"✓";position:absolute;left:0;color:var(--orange);font-weight:700}
  .tier .price{margin-top:auto;font-family:var(--font);font-size:20px;font-weight:700;color:var(--navy)}
  .tier .price span{font-size:12px;color:var(--gray-600);font-weight:400}

  .steps{margin-top:16px}
  .step{display:flex;gap:14px;align-items:flex-start;border:1px solid var(--gray-200);border-radius:8px;padding:14px 16px;margin-bottom:10px}
  .step .sn{width:32px;height:32px;flex:none;background:var(--orange);color:#fff;border-radius:6px;
    display:flex;align-items:center;justify-content:center;font-weight:700}
  .step h4{font-family:var(--font);color:var(--navy);margin:0 0 2px;font-size:15px}
  .step p{margin:0;font-size:13.5px;color:var(--gray-600)}

  .note{border:1px dashed var(--gray-200);border-radius:6px;padding:12px 14px;color:var(--gray-600);font-size:12px;margin-top:16px}
  .about-box{background:var(--gray-50);border-radius:8px;padding:22px 24px}

  /* Scope-at-a-glance: included / out of scope / needed from client */
  .scope3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px;
    background:var(--gray-50);border:1px solid var(--gray-100);border-radius:8px;padding:16px 18px}
  .scope3 .col h5{font-family:var(--sans);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
    color:var(--navy);margin:0 0 9px;display:flex;align-items:center;gap:6px}
  .scope3 .col.inc h5{color:#1a7a34}
  .scope3 .col.out h5{color:#b23b3b}
  .scope3 ul{list-style:none;padding:0;margin:0}
  .scope3 li{font-size:12px;color:var(--gray-600);margin-bottom:6px;padding-left:14px;position:relative;line-height:1.45}
  .scope3 li::before{content:"·";position:absolute;left:2px;color:var(--orange);font-weight:700}
  .scope-label{font-family:var(--sans);font-size:10px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--gray-600);margin:22px 0 0}
  @media(max-width:720px){.scope3{grid-template-columns:1fr}}

  /* Recommended bundle tag + retainer tiers */
  .rec-tag{background:var(--orange);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;
    letter-spacing:.06em;margin-left:8px;vertical-align:middle}
  .tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
  .tier{border:1px solid var(--gray-200);border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
  .tier .head{background:var(--navy);color:#fff;padding:14px;text-align:center;font-family:var(--font);font-weight:700}
  .tier.feat .head{background:var(--orange)}
  .tier .body{padding:16px;display:flex;flex-direction:column;flex:1}
  .tier .body ul{list-style:none;padding:0;margin:0 0 14px}
  .tier .body li{position:relative;padding-left:20px;margin-bottom:7px;font-size:13px;color:var(--gray-600)}
  .tier .body li::before{content:"✓";position:absolute;left:0;color:var(--orange);font-weight:700}
  .tier .price{margin-top:auto;font-family:var(--font);font-size:20px;font-weight:700;color:var(--navy)}
  .tier .price span{font-size:12px;color:var(--gray-600);font-weight:400}
  @media(max-width:720px){.tiers{grid-template-columns:1fr}}

  .cta-box{background:var(--navy);border-radius:8px;padding:36px;text-align:center;margin-top:8px}
  .cta-box h4{font-family:var(--font);color:#fff;font-size:21px;margin:0 0 10px}
  .cta-box p{color:rgba(255,255,255,.7);font-size:14px;margin:0 0 22px;max-width:34rem;margin-left:auto;margin-right:auto}
  .cta-btn{display:inline-block;background:var(--orange);color:#fff;font-weight:700;font-size:14px;
    padding:14px 32px;border-radius:6px;text-decoration:none;font-family:var(--sans);border:none;cursor:pointer}
  .cta-btn:hover{background:#cf8009}
  .cta-secondary{display:block;margin-top:16px;color:rgba(255,255,255,.55);font-size:12px;text-decoration:underline}

  .gate-wrap{margin-top:8px}
  .gate-fade{position:relative;max-height:190px;overflow:hidden;border:1px solid var(--gray-200);
    border-bottom:none;border-radius:8px 8px 0 0}
  .gate-fade-content{filter:blur(5px);-webkit-filter:blur(5px);user-select:none;-webkit-user-select:none;pointer-events:none}
  .gate-fade::after{content:"";position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.75) 60%,#fff 100%)}
  .gate-card{border:1px solid var(--gray-200);border-top:none;border-radius:0 0 8px 8px;
    background:var(--gray-50);text-align:center;padding:8px 32px 32px}
  .gate-card .lock-icon{width:38px;height:38px;border-radius:50%;background:var(--orange-light);
    color:var(--orange);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px}
  .gate-card h4{font-family:var(--font);color:var(--navy);font-size:18px;margin:0 0 6px}
  .gate-card p{color:var(--gray-600);font-size:13.5px;line-height:1.6;margin:0 auto 20px;max-width:26rem}
  .gate-card .cta-secondary{display:block;margin-top:14px;color:var(--gray-600);font-size:12px;text-decoration:underline}

  .dl-btn-locked{background:rgba(255,255,255,.12) !important;color:rgba(255,255,255,.6) !important;
    cursor:not-allowed;display:flex;align-items:center;gap:6px}

  /* Digital agreement acceptance */
  .accept-box{background:var(--navy);border-radius:10px;padding:32px 36px;text-align:center;margin-top:22px}
  .accept-box h4{font-family:var(--font);color:#fff;font-size:19px;margin:0 0 8px}
  .accept-box p{color:rgba(255,255,255,.72);font-size:13.5px;line-height:1.65;margin:0 auto 20px;max-width:32rem}
  .accept-btn{display:inline-flex;align-items:center;gap:8px;background:var(--orange);color:#fff;font-weight:700;
    font-size:14px;padding:14px 34px;border-radius:6px;border:none;cursor:pointer;font-family:var(--sans)}
  .accept-btn:hover{background:#cf8009}
  .accept-btn:disabled{opacity:.6;cursor:default}
  .accept-error{color:#ffb4b4;font-size:12.5px;margin-top:12px;display:none}
  .accepted-box{background:#f0fdf4;border:1px solid #b7e6c4;border-radius:10px;padding:22px 26px;
    display:flex;align-items:center;gap:14px}
  .accepted-box .ic{width:34px;height:34px;border-radius:50%;background:#1a7a34;color:#fff;flex:none;
    display:flex;align-items:center;justify-content:center;font-size:17px}
  .accepted-box h4{font-family:var(--font);color:#155d28;font-size:15px;margin:0 0 3px}
  .accepted-box p{color:#2f6b3f;font-size:12.5px;margin:0}

  .resp-table thead th:first-child{width:160px}
  .clause p{font-size:14px;color:var(--gray-600);line-height:1.75}
  .sig-row{display:flex;gap:24px;margin-top:20px}
  .sig-box{flex:1}
  .sig-line{border-top:1px solid var(--navy);margin-top:36px;padding-top:6px}
  .sig-line .label{font-size:13px;font-weight:700;color:var(--navy)}
  .sig-line .sub{font-size:11px;color:var(--gray-600);margin-top:2px}

  .chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .chip{background:var(--gray-50);border-radius:4px;padding:4px 10px;font-size:12px;font-weight:700;color:var(--navy)}

  .footer{background:var(--navy);color:rgba(255,255,255,.7);padding:30px 70px;display:flex;
    gap:26px;align-items:center;flex-wrap:wrap}
  .footer-info{font-size:12px;line-height:1.8}
  .footer-info strong{color:#fff}

  @media print{
    body{background:#fff}
    .dl-bar{display:none}
    .doc-wrap{margin:0;box-shadow:none;max-width:none}
    .section,.cover,.toc-page{page-break-inside:avoid}
    .cover{page-break-after:always}
    .fcard,.tier,.kpi,table,.tl-row,.step{break-inside:avoid}
  }
  @page{size:A4;margin:14mm}

  @media(max-width:720px){
    .cover{padding:40px 26px;min-height:auto}
    .cover-title{font-size:30px}
    .section,.toc-page,.footer{padding:30px 26px}
    .toc-grid,.cards,.kpi-row,.tiers{grid-template-columns:1fr}
    .tl-row{grid-template-columns:90px 26px 1fr}
    .sig-row{flex-direction:column}
  }
`;

const LOGO_SVG_LIGHT = `<svg viewBox="0 0 220 65" width="190" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="44" font-family="Georgia,serif" font-size="44" font-weight="700">
    <tspan fill="white">Bright</tspan><tspan fill="#E8920A">ex</tspan>
  </text>
  <text x="124" y="59" font-family="Helvetica Neue,Arial,sans-serif" font-size="11"
    fill="rgba(255,255,255,0.6)" letter-spacing="1.5">Solutions</text>
</svg>`;

/** Padlock icon (stroke = currentColor, so it picks up the surrounding
 * text color) — used on gated documents instead of a 🔒 emoji, which
 * renders inconsistently across mail clients and platforms. */
function lockIconSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
}

/** Escapes for safe HTML interpolation. Accepts unknown, not just string:
 * AI JSON output isn't guaranteed to match the requested shape exactly (a
 * field can come back as a number, an array, or missing) — coercing here
 * means one AI hiccup produces an odd-looking line instead of a crashed
 * document generation. */
export function esc(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escaped body-copy paragraph for legal/procedural clause text (AI-drafted
 * or fixed) — every AI-sourced string reaching an HTML document must go
 * through esc() before interpolation, never inserted raw. */
export function clauseParagraph(text: string): string {
  return `<div class="clause"><p>${esc(text)}</p></div>`;
}

/** Splits a title into [normal-weight line, bold line] for the cover, always
 * on a word boundary — a plain char-count split can cut mid-word (e.g.
 * "Servic" / "e Showcase"). The bold line is the last 1-3 words for
 * emphasis, unless the title is short enough to fit on one line already. */
export function splitTitleForCover(title: string): [string, string] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) return [title, ""];
  const boldCount = words.length > 6 ? 3 : 2;
  return [words.slice(0, -boldCount).join(" ") + " ", words.slice(-boldCount).join(" ")];
}

// ─── Document shell ────────────────────────────────────────────────────────

export interface DocShellOptions {
  title: string;
  dlBarLabel: string;
  coverTag: string;
  coverTitleLines: [string, string];
  coverSub?: string;
  metaFields: { label: string; value: string }[];
  badges?: { label: string; value: string }[];
  confidentialFor?: string | null;
  tocItems: { num: string; label: string }[];
  bodyHtml: string;
  /** Disables the "Download PDF" button — used on gated teasers, where a
   * downloadable copy would let the full (blurred-but-present) content be
   * captured regardless of the visual gate. */
  dlLocked?: boolean;
}

export function documentShell(opts: DocShellOptions): string {
  const badgesHtml = opts.badges?.length
    ? `<div class="cover-badges">${opts.badges.map((b) => `<span class="badge">${esc(b.label)} <b>${esc(b.value)}</b></span>`).join("")}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(opts.title)}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>

<div class="dl-bar">
  <span>${esc(opts.dlBarLabel)}</span>
  ${opts.dlLocked
    ? `<button class="dl-btn dl-btn-locked" disabled title="Available after your walkthrough call">${lockIconSvg(13)} Download PDF</button>`
    : `<button class="dl-btn" onclick="window.print()">Download PDF</button>`}
</div>

<div class="doc-wrap">

  <section class="cover">
    <div class="circ1"></div><div class="circ2"></div>
    <div class="cover-body">
      ${LOGO_SVG_LIGHT}
      <div class="cover-tag">${esc(opts.coverTag)}</div>
      <h1 class="cover-title">${esc(opts.coverTitleLines[0])}<strong>${esc(opts.coverTitleLines[1])}</strong></h1>
      ${opts.coverSub ? `<p class="cover-sub">${esc(opts.coverSub)}</p>` : ""}

      <div class="cover-meta">
        ${opts.metaFields.map((f) => `<div><div class="lbl">${esc(f.label)}</div><div class="val">${esc(f.value)}</div></div>`).join("")}
      </div>
      ${badgesHtml}
      ${opts.confidentialFor ? `<div class="confid">CONFIDENTIAL: prepared exclusively for ${esc(opts.confidentialFor)}. Not for redistribution.</div>` : `<div class="confid">INTERNAL DOCUMENT — not for external distribution.</div>`}
    </div>
  </section>

  <section class="toc-page">
    <h2>Contents</h2>
    <div class="toc-grid">
      ${opts.tocItems.map((t) => `<div class="toc-item"><span class="n">${esc(t.num)}</span> ${esc(t.label)}</div>`).join("")}
    </div>
  </section>

  ${opts.bodyHtml}

  <div class="footer">
    ${LOGO_SVG_LIGHT}
    <div class="footer-info">
      <strong>${BUSINESS_WEBSITE}</strong><br/>
      ${BUSINESS_PHONE} &nbsp;|&nbsp; ${BUSINESS_EMAIL}<br/>
      ${opts.confidentialFor ? `This document is confidential and prepared exclusively for ${esc(opts.confidentialFor)}.` : "Internal use only — not for external distribution."}
    </div>
  </div>

</div>
${opts.dlLocked ? "" : `<script>if (new URLSearchParams(location.search).get("print")) { window.addEventListener("load", () => window.print()); }</script>`}
</body>
</html>`;
}

// ─── Section building blocks ──────────────────────────────────────────────

export function sectionHeader(num: string, tag: string, title: string): string {
  return `<div class="section-header">
    <div class="sec-num">${esc(num)}</div>
    <div><div class="sec-tag">${esc(tag)}</div><div class="sec-title">${esc(title)}</div></div>
  </div>`;
}

export function execLede(text: string): string {
  return `<p class="exec-lede">${esc(text)}</p>`;
}

export function kpiRow(items: { value: string; label: string }[]): string {
  return `<div class="kpi-row">${items.map((i) => `<div class="kpi"><div class="v">${esc(i.value)}</div><div class="l">${esc(i.label)}</div></div>`).join("")}</div>`;
}

export function arrowList(items: string[]): string {
  return `<ul class="arrow-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

/** Arrow-list where each item has a bold lead-in (e.g. "Deposit (50%)")
 * followed by plain detail text — label and detail are escaped separately,
 * then wrapped in a real <strong>, so callers never need to hand-write
 * inline HTML (which would otherwise show as literal tags once esc() runs). */
export function arrowListKeyValue(items: { label: string; detail: string }[]): string {
  return `<ul class="arrow-list">${items.map((i) => `<li><strong>${esc(i.label)}</strong> — ${esc(i.detail)}</li>`).join("")}</ul>`;
}

export function investmentTable(rows: { desc: string; sub?: string; amount: string }[], total: { label: string; amount: string }): string {
  return `<table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td><strong>${esc(r.desc)}</strong>${r.sub ? `<br/><span style="font-size:12px;color:var(--gray-600)">${esc(r.sub)}</span>` : ""}</td><td class="amt">${esc(r.amount)}</td></tr>`).join("")}
      <tr class="total"><td>${esc(total.label)}</td><td class="amt">${esc(total.amount)}</td></tr>
    </tbody>
  </table>`;
}

export function timeline(rows: { week: string; title: string; desc: string; launch?: boolean }[]): string {
  return `<div class="tl">
    ${rows.map((r, i) => `<div class="tl-row">
      <div class="tl-week${r.launch ? " launch" : ""}">${esc(r.week)}</div>
      <div class="tl-mid"><span class="tl-dot"></span>${i < rows.length - 1 ? '<span class="tl-line"></span>' : ""}</div>
      <div class="tl-content${r.launch ? " launch" : ""}"><h4>${esc(r.title)}</h4><p>${esc(r.desc)}</p></div>
    </div>`).join("")}
  </div>`;
}

export function stepsList(steps: { title: string; desc: string }[]): string {
  return `<div class="steps">${steps.map((s, i) => `<div class="step"><div class="sn">${i + 1}</div><div><h4>${esc(s.title)}</h4><p>${esc(s.desc)}</p></div></div>`).join("")}</div>`;
}

export function noteBox(text: string): string {
  return `<div class="note">${esc(text)}</div>`;
}

export function aboutBox(text: string): string {
  return `<div class="about-box"><p style="margin:0">${esc(text)}</p></div>`;
}

/** Warm, human next-step prompt — used on teaser (gated) documents instead
 * of pricing detail. Never mentions payment; frames the next step as
 * getting the full plan and locking in a timeline, not a transaction. */
export function ctaBox(opts: {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}): string {
  return `<div class="cta-box">
    <h4>${esc(opts.heading)}</h4>
    <p>${esc(opts.body)}</p>
    <a class="cta-btn" href="${esc(opts.buttonHref)}">${esc(opts.buttonLabel)}</a>
    ${opts.secondaryLabel && opts.secondaryHref ? `<a class="cta-secondary" href="${esc(opts.secondaryHref)}">${esc(opts.secondaryLabel)}</a>` : ""}
  </div>`;
}

/** Wraps real, specific content (e.g. the actual pricing table) in a
 * Medium-style paywall: the content sits at full size but blurred, fading
 * to the page background toward the bottom instead of sitting under a
 * heavy tinted scrim, followed by a clean, minimal gate card below it in
 * normal document flow — not stacked on top. `contentHtml` should be
 * genuine content (built from the same data as the full document), not a
 * fake sample. */
export function blurredSection(contentHtml: string, overlay: {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}): string {
  return `<div class="gate-wrap">
    <div class="gate-fade"><div class="gate-fade-content">${contentHtml}</div></div>
    <div class="gate-card">
      <div class="lock-icon">${lockIconSvg(16)}</div>
      <h4>${esc(overlay.heading)}</h4>
      <p>${esc(overlay.body)}</p>
      <a class="cta-btn" href="${esc(overlay.buttonHref)}">${esc(overlay.buttonLabel)}</a>
      ${overlay.secondaryLabel && overlay.secondaryHref ? `<a class="cta-secondary" href="${esc(overlay.secondaryHref)}">${esc(overlay.secondaryLabel)}</a>` : ""}
    </div>
  </div>`;
}

export function respTable(rows: { role: string; responsibility: string }[]): string {
  return `<table class="resp-table">
    <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td><strong>${esc(r.role)}</strong></td><td>${esc(r.responsibility)}</td></tr>`).join("")}</tbody>
  </table>`;
}

export function chipRow(items: string[]): string {
  return `<div class="chip-row">${items.map((i) => `<span class="chip">${esc(i)}</span>`).join("")}</div>`;
}

export function signatureBlock(leftLabel: string, rightLabel: string): string {
  return `<div class="sig-row">
    <div class="sig-box"><div class="sig-line"><div class="label">${esc(leftLabel)}</div><div class="sub">Name, signature &amp; date</div></div></div>
    <div class="sig-box"><div class="sig-line"><div class="label">${esc(rightLabel)}</div><div class="sub">Name, signature &amp; date</div></div></div>
  </div>`;
}

/** Already-accepted status — shown in place of the accept button once a
 * client has confirmed, on both the public link and Godwin's own view. */
export function acceptedBox(clientLabel: string, acceptedAt: string): string {
  const when = new Date(acceptedAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  return `<div class="accepted-box">
    <div class="ic">✓</div>
    <div><h4>Accepted by ${esc(clientLabel)}</h4><p>Confirmed on ${esc(when)}. This marks the start of the project.</p></div>
  </div>`;
}

/** Live "I Agree" button — only ever shown on the public link for a full
 * (ungated) agreement that hasn't been accepted yet. Posts to
 * /api/public/documents/[id]/accept and swaps itself for the accepted
 * state in place, no page reload. */
export function acceptButton(documentId: string): string {
  return `<div class="accept-box" id="acceptBox">
    <h4>Ready to proceed?</h4>
    <p>Confirming below is your agreement to the scope, fees, and terms set out in this document. This is what starts the project.</p>
    <button class="accept-btn" id="acceptBtn" onclick="brxAcceptAgreement()">I Agree — Accept This Agreement</button>
    <p class="accept-error" id="acceptError"></p>
  </div>
  <script>
    function brxAcceptAgreement(){
      var btn = document.getElementById('acceptBtn');
      var err = document.getElementById('acceptError');
      btn.disabled = true; btn.textContent = 'Confirming…'; err.style.display = 'none';
      fetch('/api/public/documents/${esc(documentId)}/accept', { method: 'POST' })
        .then(function(r){ return r.json(); })
        .then(function(data){
          if (data.ok) {
            document.getElementById('acceptBox').outerHTML =
              '<div class="accepted-box"><div class="ic">\\u2713</div><div><h4>Agreement accepted</h4><p>Thank you — we will be in touch to schedule the next steps.</p></div></div>';
          } else {
            err.textContent = data.error || 'Something went wrong. Please try again or contact us directly.';
            err.style.display = 'block';
            btn.disabled = false; btn.textContent = 'I Agree — Accept This Agreement';
          }
        })
        .catch(function(){
          err.textContent = 'Network error. Please try again.';
          err.style.display = 'block';
          btn.disabled = false; btn.textContent = 'I Agree — Accept This Agreement';
        });
    }
  </script>`;
}

/** Scope-at-a-glance grid: what's included, what's out of scope, and what's
 * needed from the client — makes a deliverable's boundaries explicit instead
 * of leaving them implied by a one-line description. */
export function scope3Grid(included: string[], excluded: string[], neededFromClient: string[]): string {
  return `<div class="scope3">
    <div class="col inc"><h5>✓ Included</h5><ul>${included.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
    <div class="col out"><h5>✗ Out of scope</h5><ul>${excluded.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
    <div class="col"><h5>◦ We&apos;ll need from you</h5><ul>${neededFromClient.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
  </div>`;
}

export function scopeLabel(text: string): string {
  return `<p class="scope-label">${esc(text)}</p>`;
}

/** Small orange tag appended inline to a table cell, e.g. next to a
 * recommended line item — "YOUR FOCUS" / "RECOMMENDED". */
export function recTag(text: string): string {
  return `<span class="rec-tag">${esc(text)}</span>`;
}

/** 3-tier pricing cards — e.g. a monthly care/growth/scale retainer plan.
 * `featured` highlights one tier (orange header) as the recommended choice. */
export function tiersGrid(tiers: { name: string; price: number; priceSuffix?: string; features: string[]; featured?: boolean }[]): string {
  return `<div class="tiers">${tiers.map((t) => `<div class="tier${t.featured ? " feat" : ""}">
    <div class="head">${esc(t.name)}</div>
    <div class="body">
      <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <div class="price">KES ${t.price.toLocaleString("en-KE")}<span> ${esc(t.priceSuffix ?? "/ mo")}</span></div>
    </div>
  </div>`).join("")}</div>`;
}

export { SITE_NAME };
