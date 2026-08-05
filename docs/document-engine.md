# Document Engine: intake recap, block documents, signing, kick-off

Streamlined spec for the proposal-to-project pipeline. Written 2026-08-05.

The goal in one sentence: **an intake becomes a brief, a brief becomes an editable
block document, a proposal link becomes an accepted commercial decision, an
agreement becomes a signed record, and a signed record becomes a project with an
invoice schedule.** Each arrow is one deliberate click, and nothing is retyped.

---

## 0. What already exists (do not rebuild)

Auditing before designing, because most of the plumbing is here already.

| Capability | Where | State |
|---|---|---|
| Multi-service intake v2, CC list, client edits (2 max) | `src/lib/intake-schema.ts`, `intake-submission.ts`, migrations 032/037 | Done |
| Intake acknowledgement email | `src/lib/intake-mail.ts` | Done, but recap is a 180-char excerpt |
| Labelled Q&A reader and AI brief builder | `readAnswerGroups()`, `buildIntakeBrief()` | Done, reusable as-is |
| Per-scope CC routing | `client_contacts`, `src/lib/cc-recipients.ts`, `cc-scopes.ts` | Done |
| Brand-correct HTML document builders | `src/lib/document-html/*` (28 exported builders) | Done, keep all of it |
| Generated documents table, gating, raw HTML escape hatch, lifecycle | migrations 025/029/030/031/034 | Done |
| Public document link with read receipts | `/api/public/documents/[id]` | Done |
| Digital acceptance with evidence (name, email, IP, UA, read-to-end gate) | `/api/public/documents/[id]/accept`, `acceptButton()` | Done |
| Whole-document AI refine | `/api/admin/documents/[id]/refine` | Done |
| HTML upload path | `/api/admin/documents/upload` | Done |
| Invoices, payments, receipts, reminders, overdue crons | migration 001, `/api/cron/*` | Done |

Missing, and what this spec covers:

1. A **full formatted recap** of a submission back to the client, and to people
   the client names.
2. A **bridge to browser brainstorming**: get the brief out, get the result back in.
3. A **block document model**, so documents can be edited section by section,
   have sections hidden, and be built from templates.
4. An **editor with preview** instead of regenerate-or-nothing.
5. **Real signatures**: drawn or uploaded, background removed, Brightex
   countersigned by default.
6. **Client-chosen payment schedule** at acceptance, carried into the agreement.
7. **Kick-off**: signed agreement becomes a project, tasks, and invoice tranches.
8. **Fee gating**, upgraded from a manual boolean to an unlock invoice.

---

## 1. The flow, agreed end to end

```
                    ┌──────────────────────────────────────────┐
   client fills     │ 1. INTAKE                                │
   /intake  ───────▶│    recap email to client + named people  │
                    │    "Copy brief" for browser brainstorm   │
                    └───────────────┬──────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────────┐
   in-app AI  ─or─  │ 2. DRAFT (blocks)                        │
   paste from  ────▶│    editor: reorder, hide, gate, AI a     │
   browser Claude   │    single section, live preview, save    │
                    │    as template                           │
                    └───────────────┬──────────────────────────┘
                                    │ share link
                    ┌───────────────▼──────────────────────────┐
                    │ 3. PROPOSAL LINK (public)                │
                    │    teaser or full, print to PDF          │
                    │    client picks option + payment plan    │
                    │    then "Accept this proposal"           │
                    └───────────────┬──────────────────────────┘
                                    │ deterministic derivation
                    ┌───────────────▼──────────────────────────┐
                    │ 4. AGREEMENT (public)                    │
                    │    Brightex already countersigned        │
                    │    client: name, title, signature,       │
                    │    per-term checkboxes, read-to-end gate │
                    └───────────────┬──────────────────────────┘
                                    │ one reviewed click
                    ┌───────────────▼──────────────────────────┐
                    │ 5. KICK-OFF                              │
                    │    project + phase tasks                 │
                    │    invoice per payment tranche           │
                    └──────────────────────────────────────────┘
```

### The three decisions that make this workable

**Decision A: two links, not one.** A proposal is a commercial offer and an
agreement is a contract. Keeping them separate means the client can accept an
offer without being asked to sign legal terms in the same breath, and the
agreement can then state one price, one schedule, one timeline with no options
left open. Signing stays where it belongs: on the agreement only. This is
already how the code behaves (`accept` rejects non-agreements), so it is the
existing grain, not a new idea.

**Decision B: the client chooses the payment plan at acceptance, not in email.**
The proposal offers up to three schedules. The client picks one when accepting.
That single choice then drives the agreement's milestone table and the invoice
tranches, so all three can never disagree. Today that negotiation happens in a
thread and gets typed in three times.

**Decision C: the agreement is derived, never re-drafted.** Scope, fees,
timeline and schedule are copied from the accepted proposal's blocks by code.
AI touches nothing that carries a number. Legal clauses stay fixed text in
`document-html/agreement.ts`. This is what makes "context aware" safe: it is
aware because it is the same data, not because a model was told to remember.

---

## 2. Intake recap and referrals (M38)

### Recap email

New `src/lib/intake-recap.ts` exporting `renderIntakeRecap(intake)`, returning
`{ html, text }`. It walks the real submission, not a summary:

- Contact block: name, role, company, email, phone, preferred contact.
- Business context: industry, what the business does, customers, online presence.
- The ask: services chosen, project title, description, problem, success criteria.
- Commercials: timeline, hard deadline, budget range, budget position, decision stage.
- Readiness: the `assets` map rendered as a have / do not have checklist.
- Per service, a labelled Q&A table straight from `readAnswerGroups()`.
- Footer: reference, submitted at, edit link and edits remaining, who was copied.

Built with the same table-based email primitives already in `intake-mail.ts`, so
it renders in Gmail and Outlook. `sendNewClientIntakeAck` and
`sendExistingClientIntakeAck` both switch to it. No attachment: a printable web
copy is better, see below.

### Printable copy

`GET /intake/receipt/[edit_token]` renders the same recap through
`documentShell()` so it inherits Brightex house style and prints cleanly to PDF
from the browser. This matches the existing convention: real HTML, browser print
to PDF, no `@react-pdf` for anything new.

### People the client names

Add to the intake wizard's contact step a repeater: **"Who else should we bring
into this?"** capturing name, email, role, and why. Stored as
`client_intakes.referred_contacts jsonb` (array). On submission they are CC'd on
the recap. When the intake is converted to a client, each becomes a
`client_contacts` row with sensible default scopes inferred from the role text
(finance to `invoices,payments`, director to `documents`, ops to `projects`,
otherwise `general`), presented for confirmation rather than applied silently.

Plus an admin action on the intake sheet: **"Send recap to..."** with a free
email field, for forwarding to someone who was never on the form. Logged in
`communications` with scope `intake`.

### Copy brief for browser brainstorming

Button on the intake detail sheet: **"Copy brief"**. Puts
`buildIntakeBrief(intake)` on the clipboard as markdown with a heading and the
reference code. This is the honest, zero-risk version of the browser workflow:
what you paste into Claude in the browser is now one click instead of a manual
scrape of the admin page.

Second button: **"Copy proposal prompt"**. Same brief, wrapped in the output
contract from section 4, so what comes back pastes straight into the importer.

Schema: migration 038 adds `referred_contacts jsonb default '[]'` to
`client_intakes`. That is the only schema change in M38.

---

## 3. Block document model (M39)

The single most important change, and the one everything else depends on.

Today `generated_documents.data` holds a type-specific shape (`ProposalData`,
`AgreementData`, `SopData`) and anything that shape cannot express falls back to
`raw_html`, which is unfixable and ungateable. Neither path supports hiding a
section, editing one section, or a template.

### The shape

```ts
type BlockKind =
  | "exec_summary" | "kpi_row" | "understanding" | "cards_grid"
  | "scope_3col" | "deliverables" | "phases"
  | "investment_table" | "scope_out" | "data_table" | "tiers"
  | "timeline" | "steps"
  | "note" | "about" | "cta" | "clauses" | "signature" | "rich_text";

type Block = {
  id: string;            // stable, so edits and AI refines address a block
  kind: BlockKind;
  title?: string;        // section heading override
  hidden?: boolean;      // excluded from every render
  gated?: boolean;       // blurred in the teaser when the document is gated
  locked?: boolean;      // AI may not touch it (fixed legal clauses, totals)
  /** Present in the document but never part of the contracted total: out of
   * scope items, suggested future work, post-launch retainer tiers. A
   * derivation that sums these into an agreement is a wrong contract, so the
   * flag is on the block rather than left to a naming convention. */
  indicative?: boolean;
  content: unknown;      // shape determined by kind
};

type DocumentData = {
  version: 2;
  meta: { project_title: string; reference_code: string; client: ClientRef; ... };
  blocks: Block[];
  schedule?: PaymentSchedule;   // see section 7
  options?: ProposalOption[];   // tiers the client can pick from
};
```

Most kinds map 1:1 onto a builder that already exists in
`src/lib/document-html/index.ts`: `scope_3col` to `scope3Grid()`,
`investment_table` to `investmentTable()`, `tiers` to `tiersGrid()`, `timeline`
to `timeline()`, `kpi_row` to `kpiRow()`, `about` to `aboutBox()`, `steps` to
`stepsList()`, `note` to `noteBox()`.

Four need new builders, established by checking a real hand-authored document
(the CHANF proposal, see section 3.1) against the library:

- `cards_grid`: an n-card feature or problem grid. The CSS exists (`.cards`,
  `.fcard`, `.ficon`) but the only caller is hardcoded to a problem/solution
  **pair** in `proposal.ts`. Needs a real builder taking any number of cards,
  each with an icon, a heading, and either prose or an arrow list.
- `phases`: the phase block with a coloured header, a name, a duration and a
  deliverable list. No CSS for this exists yet.
- `data_table`: a generic three-column table for anything that is not pricing
  (success metrics, tracked outcomes, comparison rows).
- `scope_out`: the orange label-and-detail table for out-of-scope items.

Also: `.kpi-row` is `repeat(3,1fr)` and real documents use four KPIs, so it
becomes `auto-fit`.

The table of contents and the section numbers are **derived from the block list**,
never authored. Hand-maintained numbering drifts, which is observable in the
CHANF file where the HTML comments and the rendered numbers disagree.

### Compatibility

`src/lib/document-html/blocks.ts` exports:

- `renderBlocks(data, shellOpts)`: the new renderer.
- `toBlocks(type, legacyData)`: adapts a v1 `ProposalData` / `AgreementData` /
  `SopData` into blocks in memory, so every existing row renders unchanged
  without a data migration.
- `fromBlocks(blocks)`: projects back to `AgreementData` where a legacy consumer
  still needs it.

Read path: `if (data.version === 2) renderBlocks(data) else renderBlocks(toBlocks(type, data))`.
Write path: new documents are v2 from the start. `raw_html` stays as the escape
hatch for genuinely bespoke files, but stops being the default answer.

Teaser rendering stops being a separate function. A gated document renders
normally and every block with `gated: true` passes through `blurredSection()`.
`renderProposalTeaserHtml` and `renderAgreementTeaserHtml` become thin wrappers
kept for v1 rows.

Per-block AI refine: `POST /api/admin/documents/[id]/refine` accepts an optional
`blockId`. With it, only that block's content goes to the model and only that
block comes back, which is cheaper, faster, and cannot drift the rest of the
document. `locked` blocks reject the request outright.

Migration 039: `ALTER TABLE generated_documents ADD COLUMN data_version int DEFAULT 1`.
Nothing else. The blocks live in the existing `data` jsonb.

### 3.1 Reference fixture: the CHANF proposal

`brightex_chanf_proposal_2026-08.html` (August 2026, hand-authored in the browser
after an intake and a discovery call) is the golden fixture for this work. It is
a complete, real, house-style proposal that exercises ten section types, and its
CSS tokens are identical to `documentShell()`, which is the evidence that
importing to blocks preserves rather than degrades the design.

Acceptance test for M39 and M41: expressed as blocks and rendered, it should be
visually indistinguishable from the authored file on a wide screen, and better
than it on a phone and in print (see section 7.1).

Drop the original file into `docs/fixtures/` from disk rather than recreating it,
so the fixture keeps its real bytes including whatever the encoding actually is.

What it also exposes, and each of these is now handled above:

| Observation in the file | Consequence |
|---|---|
| `onclick="window.print()"` on the Download PDF button | Stripped on upload, so the client gets a dead button. Block rendering restores it because the shell owns the script. |
Six em dashes (U+2014), all in client-visible text: the `<title>`, the sticky bar label, the confidentiality line, and all three phase names. The file is valid UTF-8, so this is a copy breach, not an encoding fault. | The importer normalises em dashes to a colon or an en dash on the way in, and the check runs on import rather than trusting the author. `lint:copy` cannot catch these because it only walks `src`. |
| Pricing is a range (KES 135,000 to 210,000), per phase and per retainer tier | A range cannot be invoiced. See the lock-the-figures step in section 6. |
| Section 04 Suggested Enhancements is explicitly out of scope; section 08 retainers are a post-launch decision | Needs the `indicative` block flag so no derivation sums them into a contract. |
| Hand-maintained TOC, and HTML comments whose numbers disagree with the rendered ones | TOC and numbering derive from the block list. |
| No accept affordance anywhere | A `raw_html` proposal cannot be accepted. Blocks fix this. |
| 37KB, all imagery as inline SVG, nothing external | The 2MB upload cap is not a real constraint for documents authored this way. |

**These faults are systemic, not one file's mistakes.** The Linka roadmap proposal
from July 2026 (`brightex_linka_roadmap-proposal-draft-v1_2026-07.html`, same
authoring route) has seven em dashes, no `@page`, no responsive breakpoint and the
same single `onclick` print button. Two out of two. A document authored outside
the system does not inherit the system's rules, and no amount of care at authoring
time fixes that reliably. This is the whole case for the importer: not that
hand-authoring is bad, but that the house rules have to be applied by code at the
point of import rather than remembered by whoever is writing.

Concretely, the importer runs a normalisation pass on every document that enters:
em dashes replaced, `@page` and the responsive breakpoint guaranteed by the shell,
tables given their `data-label` attributes, the print button owned by the shell so
it cannot be stripped, TOC and section numbers derived. None of that is optional
or configurable.

---

## 4. Editor, templates, and the import bridge (M40, M41)

### Editor

`/admin/documents/[id]/edit`, three panes:

- **Left, section list.** Drag to reorder (`@dnd-kit` is already a dependency and
  already used in tasks). Per row: eye icon to hide, lock icon when locked, a
  blur icon to mark the section gated, and a delete. An "Add section" menu lists
  the block kinds with one-line descriptions.
- **Centre, the section editor.** Fields typed per kind: a textarea for prose, a
  row editor for `investment_table` (description, note, amount) with a live
  total, a three-column list editor for `scope_3col`, a phase editor for
  `timeline`. Every section has **Improve with AI** taking a plain instruction.
- **Right, live preview.** An iframe on `/api/admin/documents/[id]/view?draft=1`,
  with a toggle for **Full / Client teaser / Print**. Teaser shows exactly what a
  gated client sees, which is the only way to trust the gate.

Draft edits autosave to `data_draft jsonb`; **Publish changes** promotes draft to
`data`. A published proposal link never changes under a client mid-read.

`document-refine-panel.tsx` becomes the AI box inside this page.
`document-viewer-sheet.tsx` stays for read-only quick looks from the list.

### Templates

Migration 040:

```sql
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,                -- proposal | agreement | techdoc | sop
  service_types text[] DEFAULT '{}', -- suggested when the intake matches
  blocks jsonb NOT NULL,             -- skeleton, prose left empty
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

"Save as template" from any document strips the client-specific prose and keeps
the structure. Seed set: Standard Proposal, Lean Quote, Phased Build, Retainer,
Standard Agreement, Technical Documentation.

### Import bridge

The browser brainstorming loop, closed properly. The mistake would be trying to
parse arbitrary HTML that a chat produced. Instead, hand the browser an output
contract and parse that.

**"Copy proposal prompt"** on an intake or client produces: the brief, the
Brightex copy rules, and a markdown contract, roughly:

```
Return markdown only. Use these exact section headings, omit any that do not apply:
## Executive Summary
## Understanding the Brief
## Scope            (three subsections: Included / Not included / Needed from you)
## Investment       (a markdown table: Item | Detail | Amount KES)
## Timeline         (a table: Phase | Duration | Outcome)
## Payment Schedule (a table: Stage | Percent | Trigger)
## Next Steps
```

**Import** in the documents page accepts a paste or a `.md` / `.html` file:
markdown is parsed heading by heading into blocks, tables into row arrays; HTML
still lands in `raw_html` as today. What arrives is a normal editable v2
document, so it can be refined, gated, section-hidden and signed like any other.

**Technical documentation** joins as a document type: `techdoc`. Internal only,
never served by `/api/public/documents`, rendered through the SOP shell, exported
as markdown for the repo. Generated from the same brief plus the accepted
proposal's scope blocks, so the build doc and the sold scope start from one source.

---

## 5. Signing (M42)

### Brightex side

Countersigned by default, from settings: signer name, title, signature image,
and it is stamped at the moment the agreement is created, not when the client
signs. Settings keys: `signatory_name`, `signatory_title`, `signature_path`.

### Client side

On the agreement link, after the existing read-to-end gate:

1. **Full legal name** of the person agreeing, plus **role or title** and the
   entity they bind. Free text, required, minimum two words.
2. **Signature**, two ways in one control:
   - **Draw** on a canvas. Recommended default: works on a phone, produces clean
     transparent PNG, needs no library and has no background to remove.
   - **Upload** a photo of a signature on paper. Client-side downscale first
     with the existing `compressImageClientSide()`, then server-side with
     **sharp**, which is already a dependency: grayscale, normalise, threshold,
     derive alpha from luminance so paper becomes transparent, trim whitespace,
     resize to 600px wide PNG. That is background removal with no new package
     and no external service.
3. **Per-term checkboxes**, one per material term rather than a single blanket
   tick, because a single tick proves nothing about which term was understood:
   deposit percentage and that work starts on receipt, the chosen payment
   schedule, revision limits, IP transferring on final payment, cancellation
   terms. Each checkbox stores its own label and timestamp.
4. Existing evidence capture stays: IP, user agent, read-to-end, timestamps.

### Storage

Signature images go to a private Supabase Storage bucket `signatures`, served to
the document through a proxied route rather than a public URL.

Migration 041:

```sql
CREATE TABLE document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  party text NOT NULL,               -- brightex | client
  signer_name text NOT NULL,
  signer_title text,
  signer_email text,
  entity text,                       -- the business being bound
  method text NOT NULL,              -- drawn | upload | typed
  image_path text,
  terms_accepted jsonb DEFAULT '[]', -- [{ key, label, at }]
  ip text,
  user_agent text,
  signed_at timestamptz DEFAULT now()
);
```

A table rather than more columns, so a second client signatory or a witness is
possible later without another migration. The existing `accepted_*` columns on
`generated_documents` stay as the canonical summary, so every current query,
badge and cron keeps working.

---

## 6. Proposal acceptance and agreement derivation (M43)

The proposal link gains an accept box distinct from the agreement's signing box:
no signature, no legal checkboxes. It captures who accepted, and their two real
decisions:

- **Which option**, when the proposal offered tiers (`options` in the data).
- **Which payment schedule**, from the ones offered.

On accept:

1. Record acceptance on the proposal (same evidence columns).
2. **Lock the figures.** Real proposals quote ranges, because at proposal stage
   the scope is not yet pinned: the CHANF file quotes KES 135,000 to 210,000
   overall and a range per phase. A range cannot become a milestone table or an
   invoice. So where any accepted amount is a range, acceptance does not
   generate the agreement directly. It raises a **Confirm figures** step for
   Godwin: each ranged line is shown with its range and an input for the final
   number, totals recompute live, and the schedule percentages apply to the
   confirmed total. Blocks flagged `indicative` are excluded from the total and
   shown greyed, so out-of-scope and retainer numbers can never leak in.
   A proposal quoting fixed amounts skips this step entirely.
3. Derive the agreement **in code**: scope, deliverables and timeline blocks
   copied from the proposal, fees from the confirmed figures, milestone table
   computed from the chosen schedule, legal clauses from fixed text. AI is not
   called. If the proposal has no scope prose at all, AI writes only that.
4. Link it with the existing `source_document_id`.
5. Send the agreement link to the client, already countersigned by Brightex.
   Immediately when no figures needed confirming, otherwise as soon as Godwin
   confirms them.
6. Notify Brightex: `system_alerts` and push, both already wired.

The ranged case is why acceptance cannot silently chain all the way to a signed
contract. A client accepting "135,000 to 210,000" has agreed to a direction, not
a price, and the agreement is the document that has to state one number.

Today's `prepareAgreement()` in `documents-client.tsx` does a lossy version of
this by flattening line items into an engagement summary and asking AI to
re-draft. That is exactly the step that lets numbers drift, and it is replaced.

---

## 7. Payment schedule and kick-off (M44)

### The schedule object

Stored once, on the document, and reused by the agreement, the invoices, and the
project:

```ts
type ScheduleStage = {
  label: string;                 // "Deposit", "Midpoint", "On completion"
  percent: number;
  trigger: "on_signature" | "on_milestone" | "on_completion" | "on_date";
  milestone_index?: number;      // when trigger is on_milestone
  due_date?: string;             // when trigger is on_date
};

type PaymentSchedule = {
  mode: "standard" | "flexible";
  stages: ScheduleStage[];       // max 3, percents must sum to 100
};
```

- **standard**: 60 on signature, 40 on completion. The default offered.
- **flexible**: up to three stages, validated to sum to 100, each with a trigger
  and, where relevant, a date.

Validation is server side and hard: a schedule that does not sum to 100 cannot
be saved, because it would produce invoices that do not add up to the contract.

### Kick-off

When an agreement is signed, do **not** silently create records. A wrongly dated
project and a wrong invoice sent to a client are worse than one click. Instead,
the acceptance handler raises the existing `system_alerts` and push entries, and
the documents list shows a **Start project** badge linking to
`/admin/documents/[id]/kickoff`.

That screen is a pre-filled review showing exactly what will be created, editable
before confirming:

- **Project**: title, client, status active, start date from the signature,
  deadline computed from the timeline blocks, budget from the agreed total.
- **Tasks**: one per phase from the timeline blocks, due dates spread across the
  phase durations, deliverables as the task description. Uses the existing
  `tasks` table, so the project board, the automation columns and the client
  update emails all work immediately.
- **Invoices**: **one invoice per schedule stage, not one invoice with milestone
  lines.** This is the deliberate choice. Every piece of existing machinery
  (send, reminders, overdue detection, receipts, income records, payment
  reminders cron) operates per invoice, so a three-stage schedule inherits all of
  it for free. Stage 1 is created as `sent` with a due date three days out.
  Later stages are created as `draft` with their trigger recorded, and are issued
  automatically when the trigger fires.

Migration 042:

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS schedule_stage int,
  ADD COLUMN IF NOT EXISTS schedule_total int,
  ADD COLUMN IF NOT EXISTS schedule_trigger text,
  ADD COLUMN IF NOT EXISTS schedule_trigger_ref text,
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES generated_documents(id) ON DELETE SET NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS payment_schedule jsonb,
  ADD COLUMN IF NOT EXISTS source_document_id uuid REFERENCES generated_documents(id) ON DELETE SET NULL;
```

A new cron, `/api/cron/schedule-invoices`, issues draft tranches whose trigger
has fired: a milestone task completed, or a date reached. It follows the existing
cron auth and registration convention, and is registered on cron-job.org, not in
`vercel.json`.

---

## 7.1 Responsive on screen, A4 on paper

One document, three renderings, from one stylesheet. This is a hard requirement,
not a nice-to-have.

Where responsiveness matters is **the public link**: `/api/public/documents/[id]`,
opened on whatever device the client happens to have, which for a Kenyan SME
client is a phone far more often than a laptop. That view is a web page and has
to behave like one. The **downloaded PDF is the opposite case**: it is a document,
it goes to A4 at a fixed width, and it must look the same whatever device it was
generated from. The two requirements pull in opposite directions, which is why
the separation below is stated explicitly rather than left to the cascade.

**Screen, wide.** `.doc-wrap` at `max-width:900px`, centred, on a grey field with
a shadow, so it reads as a document rather than a web page.

**Screen, narrow.** Everything collapses to one column. The shell already has a
720px breakpoint doing this for `.toc-grid`, `.cards`, `.kpi-row`, `.tiers` and
`.sig-row`. Two gaps to close:

- **Tables become stacked cards below 720px, never horizontal scroll.** This is
  the standing rule across Brightex work and the shell currently ignores it: the
  pricing table, the new `data_table` and the `scope_out` table all stay as
  tables on a phone today. Each row becomes a card with the column headings as
  labels, driven by `data-label` attributes emitted by the builders.
- **The timeline** is `90px 26px 1fr` at the breakpoint, which is tight but
  survives. Below 420px the week column stacks above its content instead.

**Print and PDF: always A4, regardless of the viewport it was printed from.**
The shell already sets `@page{size:A4;margin:14mm}` and drops `.doc-wrap` to full
width, hides the sticky bar, forces a page break after the cover and prevents
cards, tiers, KPIs, tables, timeline rows and steps from breaking across pages.
The rule to hold to: **print styles must never inherit the mobile breakpoint.**
A PDF generated from a phone has to be identical to one generated from a laptop,
so every collapse-to-one-column rule lives in `@media(max-width:720px)` only,
and `@media print` restores the full-width layout explicitly. Worth an explicit
test, because it is the failure that would go unnoticed for months.

The CHANF file is the counter-example on both counts, and this is the strongest
argument for importing rather than serving verbatim. It has **no breakpoint at
all**: fixed `padding:50px 70px`, a hard `1fr 1fr` card grid, a three-column
retainer grid and a `90px 24px 1fr` timeline, all of which overflow on a phone.
Its `@media print` block has four rules and **no `@page`**, so the PDF takes
whatever the browser defaults to rather than A4. The house shell already does
both correctly. Rendering through blocks is what makes every document inherit
that instead of depending on whether it was remembered.

## 8. Fee gating, upgraded (M45, last)

Today: `gated boolean`, flipped by hand. Keep that, add a paid path.

```sql
ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS gate_mode text DEFAULT 'off',   -- off | manual | fee
  ADD COLUMN IF NOT EXISTS unlock_fee numeric,
  ADD COLUMN IF NOT EXISTS unlock_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;
```

- `manual`: exactly today's behaviour, kept because it is the common case.
- `fee`: the teaser's CTA creates or reuses a small invoice and shows payment
  details. On payment the document unlocks.

Deliberately phased last, and deliberately manual-confirm first: automatic
unlocking needs a payment webhook this app does not have yet. The M-Pesa route
exists as a separate project (`brightex-mpesa-gateway`) and wiring it in is its
own piece of work. Until then, marking the unlock invoice paid sets
`unlocked_at`, which is a one-click admin action on a rare event.

---

## 9. Build order

Each milestone is independently shippable and leaves the app working.

| M | Scope | Migration | Depends on |
|---|---|---|---|
| M38 | Intake recap email, printable receipt, referred contacts, copy brief | 038 | none |
| M39 | Block model, renderer dispatcher, v1 adapter, per-block refine | 039 | none |
| M40 | Editor with preview, hide and gate toggles, templates | 040 | M39 |
| M41 | Import bridge (markdown contract), techdoc type | none | M39 |
| M42 | Signing v2: canvas and upload, sharp processing, countersign, per-term checkboxes | 041 | M39 |
| M43 | Proposal accept with option and schedule choice, derived agreement | none | M39, M42 |
| M44 | Kick-off: project, tasks, invoice tranches, schedule cron | 042 | M43 |
| M45 | Fee gating with unlock invoice | 043 | M44 |

Recommended first session: **M38 and M39 together.** M38 is small, visible, and
independent. M39 is invisible to the user but unblocks everything after it, and
doing it before the editor exists means no UI has to be rewritten.

## 10. Open items and constraints

- **Migrations cannot be applied from here.** Every migration in this plan has to
  be handed over as SQL and run in the Supabase dashboard. Before relying on any
  new column, confirm it exists. Check first whether 036 and 037 are actually
  applied, because the record of that is unclear.
- **Every migration needs explicit GRANTs** per table for projects created after
  30 May 2026.
- **No em dashes** anywhere, enforced by `npm run lint:copy`.
- **Signature background removal is a threshold, not magic.** A photo taken on
  lined paper in poor light will keep artefacts. The canvas is the primary path
  for that reason, and the upload preview must let the client see the processed
  result and retry before signing.
- **Print to PDF, not `@react-pdf`.** New documents are real HTML with a print
  stylesheet. `@react-pdf` stays only where it is already in use (invoices,
  receipts).
