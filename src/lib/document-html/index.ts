/**
 * Brightex document HTML system: matches the brightex-proposals skill and
 * its reference implementation exactly (projects/magic-movers/proposal/
 * brightex_magic-movers_proposal_2026-07.html): cover, table of contents,
 * numbered sections, KPI rows, feature cards, investment tables, timeline,
 * retainer tiers, steps, and a navy/orange footer. Same CSS class names, so
 * any document generated through this file looks exactly like that
 * reference: not an approximation of it.
 *
 * Every document is a single self-contained HTML page. It IS the artifact:
 * viewed directly (in an iframe or a new tab) or turned into a PDF via the
 * browser's own print dialog (the "Download PDF" button just calls
 * window.print(): no separate server-side PDF pipeline, same as the
 * reference proposal).
 */
import { SITE_NAME, BUSINESS_WEBSITE, BUSINESS_EMAIL, BUSINESS_PHONE } from "@/lib/constants";

// ─── Shared CSS: copied 1:1 from the reference implementation ───────────────
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

  /* Sticky bar. The title is allowed to shrink and truncate; the button never
     is. A wrapped "Download / PDF" over two lines was the previous behaviour on
     a phone, because the title was free to push the button until its own text
     broke. min-width:0 is what actually permits the flex item to shrink below
     its content width, and is the fix. */
  .dl-bar{position:sticky;top:0;z-index:50;background:var(--navy);color:#fff;display:flex;
    align-items:center;justify-content:space-between;gap:14px;padding:12px 22px;
    font-size:13px;letter-spacing:.04em}
  .dl-bar span{font-weight:600;opacity:.9;min-width:0;flex:1 1 auto;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dl-btn{background:var(--orange);color:#fff;border:none;font-weight:700;font-size:13px;
    padding:9px 18px;border-radius:4px;cursor:pointer;font-family:var(--sans);
    flex:0 0 auto;white-space:nowrap}
  .dl-btn:hover{background:#cf8009}
  /* On a phone the document title is already on the cover a scroll away; the
     bar's job there is the button, so the label steps aside for it. */
  @media screen and (max-width:560px){
    .dl-bar{padding:10px 14px;gap:10px;font-size:12px}
    .dl-btn{padding:8px 14px;font-size:12px}
  }
  @media screen and (max-width:380px){
    .dl-bar span{display:none}
    .dl-bar{justify-content:flex-end}
  }

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

  /* auto-fit, not repeat(3): real documents run 3 or 4 KPIs and a hardcoded
     column count silently wraps the fourth onto a row of its own. */
  .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:22px 0}
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
  .arrow-list li:before{content:"→";position:absolute;left:0;color:var(--orange);font-weight:700}
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
  .tier .body li:before{content:"✓";position:absolute;left:0;color:var(--orange);font-weight:700}
  .tier .price{margin-top:auto;font-family:var(--font);font-size:20px;font-weight:700;color:var(--navy)}
  .tier .price span{font-size:12px;color:var(--gray-600);font-weight:400}

  .steps{margin-top:16px}
  .step{display:flex;gap:14px;align-items:flex-start;border:1px solid var(--gray-200);border-radius:8px;padding:14px 16px;margin-bottom:10px}
  .step .sn{width:32px;height:32px;flex:none;background:var(--orange);color:#fff;border-radius:6px;
    display:flex;align-items:center;justify-content:center;font-weight:700}
  .step h4{font-family:var(--font);color:var(--navy);margin:0 0 2px;font-size:15px}
  .step p{margin:0;font-size:13.5px;color:var(--gray-600)}

  .note{border:1px dashed var(--gray-200);border-radius:6px;padding:12px 14px;color:var(--gray-600);font-size:12px;margin-top:16px}
  .note.solid{border-style:solid;border-color:var(--navy)}
  .note h5{font-family:var(--font);color:var(--navy);font-size:13px;margin:0 0 8px}
  .note .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--gray-800);
    background:var(--gray-50);border:1px solid var(--gray-200);border-radius:4px;padding:12px 14px;
    white-space:pre-wrap;line-height:1.8;margin:10px 0 0}
  .about-box{background:var(--gray-50);border-radius:8px;padding:22px 24px}

  /* Delivery phases: a named, time-boxed block with its own deliverable list.
     Distinct from the timeline, which is the schedule view of the same work. */
  .phase{border:1px solid var(--gray-200);border-radius:8px;overflow:hidden;margin-top:14px}
  .phase-head{background:var(--navy-light);padding:12px 18px;display:flex;justify-content:space-between;
    align-items:baseline;gap:14px;flex-wrap:wrap}
  .phase-head .p-name{font-family:var(--font);color:var(--navy);font-size:15px;font-weight:700}
  .phase-head .p-len{font-size:11.5px;color:var(--gray-600);font-weight:600;white-space:nowrap}
  .phase-body{padding:14px 18px}
  .phase-body .arrow-list li{margin-bottom:6px}

  /* Out of scope: available separately, priced separately. Orange so it reads
     as a boundary rather than as part of what is being bought. */
  .scope-out{border:1px solid var(--orange);background:var(--orange-light);border-radius:8px;
    padding:18px 20px;margin-top:20px}
  .scope-out h5{font-family:var(--font);color:var(--navy);font-size:14px;margin:0 0 10px}
  .scope-out dl{margin:0}
  .scope-out .row{display:grid;grid-template-columns:230px 1fr;gap:16px;padding:9px 0;
    border-bottom:1px solid rgba(13,31,78,.08)}
  .scope-out .row:last-child{border-bottom:none}
  .scope-out dt{color:var(--navy);font-weight:700;font-size:12.5px}
  .scope-out dd{margin:0;font-size:12.5px;color:var(--gray-600);line-height:1.7}

  /* Indicative content: present in the document, deliberately not part of the
     contracted total (future enhancements, post-launch retainers). */
  .indicative-note{display:inline-block;background:var(--gray-50);border:1px solid var(--gray-200);
    border-radius:4px;padding:5px 11px;font-size:11px;font-weight:700;letter-spacing:.06em;
    text-transform:uppercase;color:var(--gray-600);margin-bottom:4px}

  /* Scope-at-a-glance: included / out of scope / needed from client */
  .scope3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px;
    background:var(--gray-50);border:1px solid var(--gray-100);border-radius:8px;padding:16px 18px}
  .scope3 .col h5{font-family:var(--sans);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
    color:var(--navy);margin:0 0 9px;display:flex;align-items:center;gap:6px}
  .scope3 .col.inc h5{color:#1a7a34}
  .scope3 .col.out h5{color:#b23b3b}
  .scope3 ul{list-style:none;padding:0;margin:0}
  .scope3 li{font-size:12px;color:var(--gray-600);margin-bottom:6px;padding-left:14px;position:relative;line-height:1.45}
  .scope3 li:before{content:"·";position:absolute;left:2px;color:var(--orange);font-weight:700}
  .scope-label{font-family:var(--sans);font-size:10px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--gray-600);margin:22px 0 0}
  /* screen-scoped: see the note on the main breakpoint at the end of this file */
  @media screen and (max-width:720px){.scope3{grid-template-columns:1fr}}

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
  .tier .body li:before{content:"✓";position:absolute;left:0;color:var(--orange);font-weight:700}
  .tier .price{margin-top:auto;font-family:var(--font);font-size:20px;font-weight:700;color:var(--navy)}
  .tier .price span{font-size:12px;color:var(--gray-600);font-weight:400}
  @media screen and (max-width:720px){.tiers{grid-template-columns:1fr}}

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
  .gate-fade:after{content:"";position:absolute;inset:0;
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

  /* Read gate and signature capture */
  .accept-progress{height:4px;border-radius:2px;background:rgba(255,255,255,.14);margin:0 auto 18px;max-width:32rem;overflow:hidden}
  .accept-progress span{display:block;height:100%;width:0;background:var(--orange);transition:width .25s ease}
  .accept-gate{color:rgba(255,255,255,.6);font-size:12.5px;margin:0 auto 18px;max-width:32rem}
  .accept-fields{max-width:26rem;margin:0 auto 18px;text-align:left}
  .accept-fields label{display:block;color:rgba(255,255,255,.72);font-size:11.5px;font-weight:700;
    text-transform:uppercase;letter-spacing:.06em;margin:0 0 5px}
  .accept-fields input[type=text],.accept-fields input[type=email]{width:100%;box-sizing:border-box;padding:11px 13px;
    border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);
    color:#fff;font-size:14px;font-family:var(--sans);margin:0 0 14px}
  .accept-fields input::placeholder{color:rgba(255,255,255,.35)}
  .accept-fields input:focus{outline:none;border-color:var(--orange)}
  .accept-check{display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin:0 0 4px}
  .accept-check input{margin-top:3px;flex:none;width:15px;height:15px;accent-color:var(--orange)}
  .accept-check span{color:rgba(255,255,255,.78);font-size:12.5px;line-height:1.6;text-transform:none;
    letter-spacing:0;font-weight:400}
  .accept-legal{color:rgba(255,255,255,.42);font-size:11.5px;line-height:1.6;margin:16px auto 0;max-width:32rem}
  /* Standalone field label outside .accept-fields (the schedule picker's). */
  .accept-label{display:block;max-width:26rem;margin:0 auto 8px;text-align:left;
    color:rgba(255,255,255,.72);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}

  /* Proposal acceptance: payment schedule picker and multi-column fields.
     Lives here, not in accept.ts, because documentShell() emits the document's
     only <style> block: CSS defined next to the markup that uses it would be
     dropped silently and the control would ship unstyled. */
  .sched-list{display:grid;gap:10px;max-width:26rem;margin:0 auto 18px}
  .sched-opt{display:flex;gap:11px;align-items:flex-start;text-align:left;cursor:pointer;
    border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:13px 15px;
    background:rgba(255,255,255,.04);transition:border-color .15s ease,background .15s ease}
  .sched-opt:hover{border-color:rgba(255,255,255,.34)}
  .sched-opt.on{border-color:var(--orange);background:rgba(232,146,10,.1)}
  .sched-opt input{margin-top:3px;flex:none;width:15px;height:15px;accent-color:var(--orange)}
  .sched-opt .sd-name{display:block;color:#fff;font-size:13.5px;font-weight:700;margin-bottom:3px}
  .sched-opt .sd-detail{display:block;color:rgba(255,255,255,.62);font-size:12px;line-height:1.6}
  .sched-fixed{border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:13px 15px;
    background:rgba(255,255,255,.04);text-align:left;max-width:26rem;margin:0 auto 18px}
  .sched-fixed .sd-name{color:#fff;font-size:13px;font-weight:700;margin-bottom:4px}
  .sched-fixed .sd-detail{color:rgba(255,255,255,.62);font-size:12px;line-height:1.6}
  .accept-fields .field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media screen and (max-width:560px){.accept-fields .field-row{grid-template-columns:1fr}}

  /* "Something needs changing first": collapsed until asked for, so the
     default path stays a single clear action rather than two competing ones. */
  .accept-btn.secondary{background:rgba(255,255,255,.12);color:#fff}
  .accept-btn.secondary:hover{background:rgba(255,255,255,.2)}
  .changes-panel{display:none;max-width:26rem;margin:20px auto 0;padding-top:20px;
    border-top:1px solid rgba(255,255,255,.14);text-align:left}
  .changes-panel.open{display:block}
  .changes-panel textarea{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:6px;
    border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;
    font-size:14px;font-family:var(--sans);line-height:1.6;resize:vertical;margin:0 0 14px}
  .changes-panel textarea::placeholder{color:rgba(255,255,255,.35)}
  .changes-panel textarea:focus{outline:none;border-color:var(--orange)}
  .changes-panel .accept-legal{margin-top:12px;text-align:left}

  /* Signature capture: draw or upload. */
  .sig-tabs{display:flex;gap:8px;max-width:26rem;margin:0 auto 12px}
  .sig-tab{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.7);
    border-radius:6px;padding:9px 12px;font-size:13px;font-weight:600;font-family:var(--sans);cursor:pointer}
  .sig-tab.on{background:rgba(232,146,10,.14);border-color:var(--orange);color:#fff}
  .sig-pane{max-width:26rem;margin:0 auto 6px}
  .sig-canvas{width:100%;height:150px;background:#fff;border:1px solid rgba(255,255,255,.2);border-radius:8px;
    touch-action:none;cursor:crosshair;display:block}
  .sig-actions{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
  .sig-hint{color:rgba(255,255,255,.5);font-size:11.5px;line-height:1.6;text-align:left;display:block}
  .sig-clear{background:none;border:none;color:rgba(255,255,255,.62);font-size:12px;text-decoration:underline;
    cursor:pointer;font-family:var(--sans);padding:0}
  .sig-pane input[type=file]{width:100%;color:rgba(255,255,255,.7);font-size:12.5px;margin:10px 0;
    font-family:var(--sans)}
  .sig-preview{background:#fff;border-radius:8px;padding:14px;margin-top:8px;text-align:center}
  .sig-preview img{max-width:100%;max-height:110px;display:block;margin:0 auto 8px}
  .sig-preview .sig-hint{color:var(--gray-600)}

  /* Acceptance controls are interactive: they have no place on paper. */
  @media print{
    .accept-box,.sched-list,.sched-fixed,.changes-panel,.sig-tabs,.sig-pane{display:none}
  }

  /* Executed signature block: what a signed contract actually ends with.
     Both parties side by side, each with their mark, who they are, and when.
     The acknowledgement that used to sit here on its own is now a small note
     below it, because a status pill is not an execution record. */
  .exec-sig{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:22px}
  .exec-party{border:1px solid var(--gray-200);border-radius:8px;padding:18px 20px;background:#fff}
  .exec-party .role{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
    color:var(--orange);margin:0 0 14px}
  .exec-mark{height:74px;display:flex;align-items:flex-end;border-bottom:1px solid var(--navy);
    margin-bottom:10px;padding-bottom:6px}
  .exec-mark img{max-height:70px;max-width:100%;display:block}
  .exec-mark .typed{font-family:"Segoe Script","Bradley Hand","Snell Roundhand",cursive;
    font-size:27px;color:var(--navy);line-height:1.1;padding-bottom:2px}
  .exec-party .who{font-size:14px;font-weight:700;color:var(--navy);margin:0}
  .exec-party .title{font-size:12px;color:var(--gray-600);margin:2px 0 0}
  .exec-party .entity{font-size:12px;color:var(--gray-600);margin:2px 0 0}
  .exec-party .when{font-size:11.5px;color:var(--gray-600);margin:10px 0 0;
    border-top:1px dotted var(--gray-200);padding-top:9px}
  .exec-party .when b{color:var(--navy);font-weight:700}
  .exec-note{margin-top:16px;border:1px solid #b7e6c4;background:#f0fdf4;border-radius:8px;
    padding:11px 15px;display:flex;align-items:center;gap:10px}
  .exec-note .ic{width:20px;height:20px;border-radius:50%;background:#1a7a34;color:#fff;flex:none;
    display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
  .exec-note p{margin:0;font-size:12px;color:#2f6b3f;line-height:1.55}
  .exec-evidence{margin-top:10px;font-size:11px;color:var(--gray-600);line-height:1.65}
  @media screen and (max-width:720px){.exec-sig{grid-template-columns:1fr;gap:16px}}

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

  @page{size:A4;margin:14mm}

  @media print{
    body{background:#fff}
    .dl-bar{display:none}
    .doc-wrap{margin:0;box-shadow:none;max-width:none}
    .section,.cover,.toc-page{page-break-inside:avoid}
    .cover{page-break-after:always}
    .fcard,.tier,.kpi,table,.tl-row,.step,.phase,.scope-out{break-inside:avoid}
  }

  /* ── Responsive: SCREEN ONLY ──────────────────────────────────────────────
     'screen and' is load-bearing, not decoration. A4 at 14mm margins leaves
     182mm of content, which is 688px at 96dpi, so a bare (max-width:720px)
     query MATCHES WHILE PRINTING and every PDF comes out in the phone layout.
     The printed document must be identical whatever device produced it, so
     every collapse rule below stays scoped to screen. */
  @media screen and (max-width:720px){
    .cover{padding:40px 26px;min-height:auto}
    .cover-title{font-size:30px}
    .section,.toc-page,.footer{padding:30px 26px}
    .toc-grid,.cards,.kpi-row,.tiers,.scope3{grid-template-columns:1fr}
    .tl-row{grid-template-columns:90px 26px 1fr}
    .sig-row{flex-direction:column}
    .scope-out .row{grid-template-columns:1fr;gap:3px}

    /* Data becomes stacked cards, never a horizontally scrolling table.
       Column headings are carried per cell in data-label by the builders. */
    table.stack thead{display:none}
    table.stack tbody tr{display:block;background:#fff;border:1px solid var(--gray-200);
      border-radius:8px;margin-bottom:12px;overflow:hidden}
    table.stack tbody tr:nth-child(even){background:#fff}
    table.stack tbody td{display:flex;justify-content:space-between;align-items:baseline;gap:16px;
      padding:10px 14px;border-bottom:1px solid var(--gray-100);text-align:left}
    table.stack tbody td:last-child{border-bottom:none}
    table.stack tbody td:before{content:attr(data-label);flex:none;font-size:10px;font-weight:700;
      letter-spacing:.1em;text-transform:uppercase;color:var(--gray-600)}
    table.stack tbody td:not([data-label]):before{content:none}
    table.stack td.amt{text-align:right}
    table.stack tr.total{background:var(--navy);border-color:var(--navy)}
    table.stack tr.total td{color:#fff;border-bottom-color:rgba(255,255,255,.16)}
    table.stack tr.total td:before{color:rgba(255,255,255,.6)}
  }

  /* Small phones: the timeline's fixed week column stops fitting. */
  @media screen and (max-width:420px){
    .tl-row{grid-template-columns:1fr}
    .tl-mid{display:none}
    .tl-week{align-self:stretch;text-align:left;margin-bottom:8px}
    .tl-content{padding:0 0 20px}
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
 * text color): used on gated documents instead of a 🔒 emoji, which
 * renders inconsistently across mail clients and platforms. */
function lockIconSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
}

/** Escapes for safe HTML interpolation. Accepts unknown, not just string:
 * AI JSON output isn't guaranteed to match the requested shape exactly (a
 * field can come back as a number, an array, or missing): coercing here
 * means one AI hiccup produces an odd-looking line instead of a crashed
 * document generation. */
export function esc(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escaped body-copy paragraph for legal/procedural clause text (AI-drafted
 * or fixed): every AI-sourced string reaching an HTML document must go
 * through esc() before interpolation, never inserted raw. */
export function clauseParagraph(text: string): string {
  return `<div class="clause"><p>${esc(text)}</p></div>`;
}

/** Splits a title into [normal-weight line, bold line] for the cover, always
 * on a word boundary: a plain char-count split can cut mid-word (e.g.
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
  /** Disables the "Download PDF" button. Used on gated teasers, where a
   * downloadable copy would let the full (blurred-but-present) content be
   * captured regardless of the visual gate, and on unsigned agreements,
   * where a downloadable copy could circulate as if it were executed. */
  dlLocked?: boolean;
  /** Tooltip explaining why the download is locked, so the client knows what
   * unlocks it rather than just finding a dead button. */
  dlLockedReason?: string;
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
    ? `<button class="dl-btn dl-btn-locked" id="dlBtn" disabled title="${esc(opts.dlLockedReason ?? "Available after your walkthrough call")}">${lockIconSvg(13)} Download PDF</button>`
    : `<button class="dl-btn" id="dlBtn" onclick="window.print()">Download PDF</button>`}
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
      ${opts.confidentialFor ? `<div class="confid">CONFIDENTIAL: prepared exclusively for ${esc(opts.confidentialFor)}. Not for redistribution.</div>` : `<div class="confid">INTERNAL DOCUMENT: not for external distribution.</div>`}
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
      ${opts.confidentialFor ? `This document is confidential and prepared exclusively for ${esc(opts.confidentialFor)}.` : "Internal use only: not for external distribution."}
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
 * followed by plain detail text: label and detail are escaped separately,
 * then wrapped in a real <strong>, so callers never need to hand-write
 * inline HTML (which would otherwise show as literal tags once esc() runs). */
export function arrowListKeyValue(items: { label: string; detail: string }[]): string {
  return `<ul class="arrow-list">${items.map((i) => `<li><strong>${esc(i.label)}</strong>: ${esc(i.detail)}</li>`).join("")}</ul>`;
}

export function investmentTable(rows: { desc: string; sub?: string; amount: string }[], total: { label: string; amount: string }): string {
  return `<table class="stack">
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td><strong>${esc(r.desc)}</strong>${r.sub ? `<br/><span style="font-size:12px;color:var(--gray-600)">${esc(r.sub)}</span>` : ""}</td><td class="amt" data-label="Amount">${esc(r.amount)}</td></tr>`).join("")}
      <tr class="total"><td>${esc(total.label)}</td><td class="amt" data-label="Total">${esc(total.amount)}</td></tr>
    </tbody>
  </table>`;
}

/**
 * Investment table with an explicit phase or stage column: the shape real
 * phased proposals use. Kept separate from investmentTable() rather than
 * bolting an optional column onto it, because the two have different mobile
 * collapses (the phase becomes the card's heading, not one of its rows).
 */
export function phasedInvestmentTable(
  rows: { phase: string; desc: string; amount: string }[],
  total: { label: string; amount: string }
): string {
  return `<table class="stack">
    <thead><tr><th>Phase</th><th>Deliverable</th><th style="text-align:right">Investment (KES)</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>
        <td><strong>${esc(r.phase)}</strong></td>
        <td data-label="Deliverable">${esc(r.desc)}</td>
        <td class="amt" data-label="Investment">${esc(r.amount)}</td>
      </tr>`).join("")}
      <tr class="total"><td colspan="2">${esc(total.label)}</td><td class="amt" data-label="Total">${esc(total.amount)}</td></tr>
    </tbody>
  </table>`;
}

/**
 * Feature or problem card grid, any number of cards.
 *
 * The house CSS has always had `.cards`/`.fcard`/`.ficon`, but the only
 * callers were hardcoded problem/solution pairs, so a document needing four
 * framing cards had no way to say so and had to be hand-written outside the
 * system. Each card takes either prose or an arrow list, because both occur:
 * a problem card explains, a capability card enumerates.
 */
export function cardsGrid(
  cards: { icon?: string; title: string; body?: string; points?: string[] }[]
): string {
  return `<div class="cards">${cards.map((c, i) => `<div class="fcard">
    <div class="ficon">${esc(c.icon ?? String(i + 1))}</div>
    <h4>${esc(c.title)}</h4>
    ${c.body ? `<p style="margin:0;font-size:13.5px;color:var(--gray-600)">${esc(c.body)}</p>` : ""}
    ${c.points?.length ? arrowList(c.points) : ""}
  </div>`).join("")}</div>`;
}

/**
 * Delivery phases: what happens in each stage of the work, with its duration.
 *
 * This is the scope view of the work; timeline() is the schedule view of the
 * same phases. Both earn their place: a client reads the phase list to
 * understand what they are buying and the timeline to understand when.
 */
export function phaseList(
  phases: { name: string; duration: string; items: string[] }[]
): string {
  return phases.map((p) => `<div class="phase">
    <div class="phase-head">
      <div class="p-name">${esc(p.name)}</div>
      <div class="p-len">${esc(p.duration)}</div>
    </div>
    <div class="phase-body">${arrowList(p.items)}</div>
  </div>`).join("");
}

/**
 * Generic tabular data that is not pricing: tracked metrics, comparisons,
 * anything with headings and rows. Collapses to stacked cards on a phone,
 * where the first column becomes the card heading and the rest become
 * labelled rows.
 */
export function dataTable(headers: string[], rows: string[][]): string {
  return `<table class="stack">
    <thead><tr>${headers.map((h, i) => `<th${i === headers.length - 1 && headers.length > 2 ? ' style="text-align:right"' : ""}>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.map((cells) => `<tr>${cells.map((cell, i) => i === 0
        ? `<td><strong>${esc(cell)}</strong></td>`
        : `<td data-label="${esc(headers[i] ?? "")}"${i === cells.length - 1 && cells.length > 2 ? ' style="text-align:right"' : ""}>${esc(cell)}</td>`
      ).join("")}</tr>`).join("")}
    </tbody>
  </table>`;
}

/**
 * Out of scope, available separately.
 *
 * Stating boundaries plainly is what stops "can you also just..." arriving
 * mid-build as an assumption rather than a request. Orange, so it reads as a
 * boundary rather than as part of what is being bought.
 */
export function scopeOut(heading: string, rows: { label: string; detail: string }[]): string {
  return `<div class="scope-out">
    <h5>${esc(heading)}</h5>
    <dl>${rows.map((r) => `<div class="row">
      <dt>${esc(r.label)}</dt>
      <dd>${esc(r.detail)}</dd>
    </div>`).join("")}</dl>
  </div>`;
}

/**
 * Note box with a heading, and optionally a monospace block (a folder
 * structure, a naming convention: things where the shape carries meaning and
 * reflowing it as prose destroys it).
 */
export function noteBoxTitled(heading: string, body: string, opts?: { items?: string[]; mono?: string; solid?: boolean }): string {
  return `<div class="note${opts?.solid ? " solid" : ""}">
    <h5>${esc(heading)}</h5>
    ${body ? `<p style="margin:0">${esc(body)}</p>` : ""}
    ${opts?.items?.length ? arrowList(opts.items) : ""}
    ${opts?.mono ? `<p class="mono">${esc(opts.mono)}</p>` : ""}
  </div>`;
}

/** Marks a section as present but deliberately outside the contracted total. */
export function indicativeNote(text: string): string {
  return `<p><span class="indicative-note">${esc(text)}</span></p>`;
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

/** Warm, human next-step prompt: used on teaser (gated) documents instead
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
 * normal document flow: not stacked on top. `contentHtml` should be
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
  return `<table class="resp-table stack">
    <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td><strong>${esc(r.role)}</strong></td><td data-label="Responsibility">${esc(r.responsibility)}</td></tr>`).join("")}</tbody>
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

export interface ExecutedParty {
  /** "Brightex Solutions" / the client's registered name. */
  role: string;
  name: string;
  title?: string | null;
  entity?: string | null;
  /** URL to the signature image, or null for a typed signature. */
  imageUrl?: string | null;
  signedAt: string;
}

/**
 * The execution block of a signed agreement: both parties, their marks, and
 * when each signed.
 *
 * This is what a contract ends with, and it was missing: a signed agreement
 * showed only a green "accepted by" pill, which records the fact of acceptance
 * without evidencing it. The block below is the record; the acknowledgement
 * note beneath is the reassurance, in that order of prominence.
 */
export function executedSignatures(
  parties: ExecutedParty[],
  evidence?: { ip?: string | null; method?: string | null; termsCount?: number }
): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-KE", {
      dateStyle: "long", timeStyle: "short", timeZone: "Africa/Nairobi",
    });

  const cards = parties.map((p) => `<div class="exec-party">
    <p class="role">${esc(p.role)}</p>
    <div class="exec-mark">
      ${p.imageUrl
        ? `<img src="${esc(p.imageUrl)}" alt="Signature of ${esc(p.name)}" />`
        : `<span class="typed">${esc(p.name)}</span>`}
    </div>
    <p class="who">${esc(p.name)}</p>
    ${p.title ? `<p class="title">${esc(p.title)}</p>` : ""}
    ${p.entity ? `<p class="entity">for and on behalf of ${esc(p.entity)}</p>` : ""}
    <p class="when">Signed <b>${esc(fmt(p.signedAt))}</b></p>
  </div>`).join("");

  const parts: string[] = [];
  if (evidence?.method) {
    parts.push(evidence.method === "drawn" ? "signed on screen" : evidence.method === "upload" ? "signature uploaded" : "typed signature");
  }
  if (evidence?.termsCount) parts.push(`${evidence.termsCount} terms confirmed individually`);
  if (evidence?.ip) parts.push(`recorded from ${evidence.ip}`);

  return `<div class="exec-sig">${cards}</div>
  <div class="exec-note">
    <span class="ic">✓</span>
    <p>This agreement is fully executed. Both parties hold an identical copy, and this page is the record.</p>
  </div>
  ${parts.length ? `<p class="exec-evidence">${esc(parts.join(" &middot; ").replace(/&middot;/g, "·"))}</p>` : ""}`;
}

/** Already-accepted status: shown in place of the accept button once a
 * client has confirmed, on both the public link and Godwin's own view. */
export function acceptedBox(clientLabel: string, acceptedAt: string): string {
  const when = new Date(acceptedAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  return `<div class="accepted-box">
    <div class="ic">✓</div>
    <div><h4>Accepted by ${esc(clientLabel)}</h4><p>Confirmed on ${esc(when)}. This marks the start of the project.</p></div>
  </div>`;
}

/** Live "I Agree" button: only ever shown on the public link for a full
 * (ungated) agreement that hasn't been accepted yet. Posts to
 * /api/public/documents/[id]/accept and swaps itself for the accepted
 * state in place, no page reload. */
/**
 * Digital sign-off block for an agreement.
 *
 * A signature is only worth anything if the signer actually saw what they
 * signed, so the button unlocks on three conditions rather than one:
 *   1. the reader has scrolled to the end of the agreement,
 *   2. they have ticked a confirmation that they read and accept it,
 *   3. they have typed their full name, which is the signature itself.
 *
 * Name, email, timestamp and request metadata are recorded server side (see
 * /api/public/documents/[id]/accept), which is what turns a button click into
 * a defensible record if the scope is ever disputed.
 */
export function acceptButton(documentId: string, opts?: { clientName?: string | null; clientEmail?: string | null }): string {
  return `<div class="accept-box" id="acceptBox">
    <h4>Ready to proceed?</h4>
    <p>Signing below confirms your agreement to the scope, fees, and terms set out in this document. This is what starts the project.</p>

    <div class="accept-progress"><span id="acceptProgressBar"></span></div>
    <p class="accept-gate" id="acceptGate">Please read to the end of the agreement to enable signing.</p>

    <div class="accept-fields">
      <label for="acceptName">Your full name (this is your signature)</label>
      <input type="text" id="acceptName" autocomplete="name" placeholder="e.g. Jane Wanjiru Mwangi"
        value="${esc(opts?.clientName ?? "")}" oninput="brxAcceptSync()">

      <label for="acceptEmail">Your email</label>
      <input type="email" id="acceptEmail" autocomplete="email" placeholder="you@company.co.ke"
        value="${esc(opts?.clientEmail ?? "")}" oninput="brxAcceptSync()">

      <label class="accept-check">
        <input type="checkbox" id="acceptConfirm" onchange="brxAcceptSync()">
        <span>I have read this agreement in full, I understand the scope, fees and terms, and I have the authority to accept it on behalf of my business.</span>
      </label>
    </div>

    <button class="accept-btn" id="acceptBtn" disabled onclick="brxAcceptAgreement()">Sign and accept this agreement</button>
    <p class="accept-error" id="acceptError"></p>
    <p class="accept-legal">Your name, email, the time of signing and your device details are recorded as evidence of acceptance. A copy is emailed to you automatically.</p>
  </div>
  <script>
    (function(){
      var readToEnd = false;

      // Tracks how far through the document the reader has actually got.
      // The end marker is the sign-off block itself, so reaching it means
      // every clause above has passed through the viewport.
      function updateProgress(){
        var box = document.getElementById('acceptBox');
        if (!box) return;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 100;
        var bar = document.getElementById('acceptProgressBar');
        if (bar) bar.style.width = pct + '%';

        var rect = box.getBoundingClientRect();
        if (!readToEnd && rect.top < window.innerHeight) {
          readToEnd = true;
          var gate = document.getElementById('acceptGate');
          if (gate) gate.textContent = 'Thank you for reading it through. Complete the details below to sign.';
          brxAcceptSync();
        }
      }

      window.brxAcceptSync = function(){
        var name  = (document.getElementById('acceptName')  || {}).value || '';
        var email = (document.getElementById('acceptEmail') || {}).value || '';
        var ok    = (document.getElementById('acceptConfirm') || {}).checked;
        var btn   = document.getElementById('acceptBtn');
        if (!btn) return;
        var valid = readToEnd && ok
          && name.trim().length >= 3
          && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim());
        btn.disabled = !valid;
      };

      window.brxAcceptAgreement = function(){
        var btn = document.getElementById('acceptBtn');
        var err = document.getElementById('acceptError');
        var name  = document.getElementById('acceptName').value.trim();
        var email = document.getElementById('acceptEmail').value.trim();

        btn.disabled = true; btn.textContent = 'Signing...'; err.style.display = 'none';
        fetch('/api/public/documents/${esc(documentId)}/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, confirmed_read: true })
        })
          .then(function(r){ return r.json(); })
          .then(function(data){
            if (data.ok) {
              document.getElementById('acceptBox').outerHTML =
                '<div class="accepted-box"><div class="ic">\\u2713</div><div><h4>Agreement signed</h4>' +
                '<p>Signed by ' + name.replace(/[<>&]/g,'') + '. Thank you, we will be in touch to schedule the next steps. ' +
                'You can now download a PDF copy for your records.</p></div></div>';

              // The PDF is deliberately withheld until signing, so that an
              // unsigned draft cannot circulate looking like an executed one.
              // Signing is what releases it, without needing a page reload.
              var dl = document.getElementById('dlBtn');
              if (dl) {
                dl.disabled = false;
                dl.className = 'dl-btn';
                dl.title = 'Download your signed copy';
                dl.textContent = 'Download PDF';
                dl.onclick = function(){ window.print(); };
              }
            } else {
              err.textContent = data.error || 'Something went wrong. Please try again or contact us directly.';
              err.style.display = 'block';
              btn.disabled = false; btn.textContent = 'Sign and accept this agreement';
            }
          })
          .catch(function(){
            err.textContent = 'Network error. Please try again.';
            err.style.display = 'block';
            btn.disabled = false; btn.textContent = 'Sign and accept this agreement';
          });
      };

      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
      updateProgress();
    })();
  </script>`;
}

/** Scope-at-a-glance grid: what's included, what's out of scope, and what's
 * needed from the client: makes a deliverable's boundaries explicit instead
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
 * recommended line item: "YOUR FOCUS" / "RECOMMENDED". */
export function recTag(text: string): string {
  return `<span class="rec-tag">${esc(text)}</span>`;
}

/** 3-tier pricing cards: e.g. a monthly care/growth/scale retainer plan.
 * `featured` highlights one tier (orange header) as the recommended choice. */
export function tiersGrid(tiers: {
  name: string;
  /** A number formats as KES with thousands separators. A string passes
   * through verbatim, which is what a real retainer quote needs: tiers are
   * routinely offered as a range ("8,000 to 15,000") until scope is pinned,
   * and a number type cannot say that without inventing a figure. */
  price: number | string;
  priceSuffix?: string;
  desc?: string;
  features: string[];
  featured?: boolean;
}[]): string {
  return `<div class="tiers">${tiers.map((t) => `<div class="tier${t.featured ? " feat" : ""}">
    <div class="head">${esc(t.name)}</div>
    <div class="body">
      ${t.desc ? `<p style="font-size:12.5px;color:var(--gray-600);margin:0 0 10px">${esc(t.desc)}</p>` : ""}
      <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <div class="price">${typeof t.price === "number" ? `KES ${t.price.toLocaleString("en-KE")}` : esc(t.price)}<span> ${esc(t.priceSuffix ?? "/ mo")}</span></div>
    </div>
  </div>`).join("")}</div>`;
}

export { SITE_NAME };
