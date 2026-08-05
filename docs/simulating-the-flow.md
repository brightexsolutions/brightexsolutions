# Simulating the document flow

How to exercise the proposal to signed agreement pipeline end to end, what to
look at while you do, and what should be true afterwards.

## Before anything

The dev server must be running (`npm run dev`), because every link in every
email points at `NEXT_PUBLIC_SITE_URL`, which is `http://localhost:3000` in
`.env.local`. Those links work in a browser on this machine and nowhere else.
Once the app is deployed, the same scripts against the deployed URL produce
links that work from a phone.

Three commands, three different jobs:

| Command | What it does | Sends to |
|---|---|---|
| `npm run check:docs` | 120 assertions, no database, no network | nothing |
| `npm run simulate:flow` | drives the whole pipeline programmatically and asserts | gbrown |
| `npm run simulate:client` | puts you at the start as the client, then stops | gbrown |
| `npm run chanf:prepare` | prepares a real client's proposal as a draft | nobody |

## 1. The automated pass: `npm run simulate:flow`

Drives every step and checks the result. Run this first, and after any change to
documents, signing, or invoicing. It resets the demo proposal each run, so it is
safe to repeat.

It asserts, among others:

- the accept and request-changes controls are offered, and both payment
  schedules are presented as a real choice
- the read receipt is recorded (this was silently broken until the simulation
  caught it: the update was a floating promise that raced the response)
- acceptance stores the role, the notes, and the schedule the client picked,
  and accepting twice is idempotent
- derivation **refuses** while the proposal quotes ranges, and names the
  unresolved lines
- once figures are pinned, the contract total equals their sum and the
  milestones sum exactly to it, including when the split does not divide evenly
- indicative sections (retainer tiers, suggested enhancements) never reach the
  contract
- an unsigned agreement is not downloadable; a signed one is
- a blank signature photograph is refused
- kick-off creates one invoice per stage, only the deposit is live, and
  completing the milestone task releases the next one through the cron

## 2. The human pass: `npm run simulate:client`

This is the one to walk through. It submits a real intake through the public
endpoint and emails the proposal, then stops and leaves the rest to you.

Three emails arrive, in this order:

1. **We received your requirements** — the acknowledgement
2. **Your submission to Brightex** — everything you told us, in full
3. **Your proposal from Brightex** — the link

### What to look at

**The recap email.** Every answer you gave, sectioned. Check the readiness list
in particular: it shows what you have and, more usefully, what you still need to
sort out. This is the email a client forwards to whoever signs.

**The proposal, on a phone.** The layout should collapse to one column, tables
should become stacked cards rather than scrolling sideways, and the sticky bar
should truncate its title rather than wrapping the download button.

**The proposal, printed.** Cmd+P. It must come out A4 and in the desktop
layout, not the phone one, whatever device you print from. This was broken
before: A4 at 14mm margins is 688px, the mobile breakpoint was 720px, so every
PDF the system produced was in the phone layout.

**Then choose a path.**

- **Request changes.** You get an acknowledgement, and the full text arrives at
  the Brightex inbox. Nothing on the proposal changes, and it is recorded
  against the document so the note and the thing it is about stay together.
- **Accept.** Pick 60/40 or 40/20/40. The confirmation says the final figure
  within each range will be confirmed before signing, because the proposal
  quotes ranges.

### After accepting

Acceptance deliberately does not produce the agreement, because the proposal
quotes ranges and a contract cannot. Confirm the figures, then derive:

```
POST /api/admin/documents/<proposal-id>/derive-agreement
  { "figures": [
      { "blockId": "inv-table", "rowIndex": 0, "amount": 18000 },
      { "blockId": "inv-table", "rowIndex": 1, "amount": 130000 },
      { "blockId": "inv-table", "rowIndex": 2, "amount": 32000 } ] }
```

The agreement is derived in code from the accepted proposal. No model is
involved, so no number can drift. It arrives countersigned by Brightex.

### Signing

On the agreement link: read to the end (the control unlocks on scroll), give
your full legal name, title and the entity being bound, sign by drawing or by
uploading a photo of a signature on paper, and confirm each of the six terms
separately.

Upload path worth testing properly: photograph a signature on plain paper in
reasonable light. The background is removed by threshold, and **you see the
processed result before you sign** and can retry. It will struggle with lined
paper in poor light, which is why drawing is the default.

Afterwards the agreement ends with an execution block: both parties, their
marks, titles, the entity, and the exact time each signed, with the evidence
line below it.

### Kick-off

`GET /api/admin/documents/<agreement-id>/kickoff` previews what would be
created. `POST` creates it: the project, one task per delivery phase with dates
spread across their durations, and one invoice per payment stage. Only the
deposit is issued; the rest wait for their trigger and are released by
`/api/cron/schedule-invoices`.

## 3. Real clients: the dashboard, never a script

**Scripts never send to real clients.** `scripts/demo-target.ts` holds the one
demo identity every script sends to, and `assertDemoRecipient()` throws on
anything else. There is deliberately no flag, override or environment variable
that relaxes it: the safeguard that can be switched off is the one that
eventually is.

Real correspondence goes out from the dashboard, by a human, after reading it.
The send button belongs where the person pressing it can see what they are
sending.

### `npm run chanf:prepare`

Prepares CHANF's proposal as a validated section document and leaves it a
**draft** in Admin > Documents. It emails nobody.

Contact details are read from the client record at send time, so updating
CHANF's email and CC contacts on the client record is all that is needed:
nothing is baked into the document.

`-- --preview` additionally sends the three emails CHANF would receive to the
demo account, so the wording can be read in a real inbox first. The call summary
is worth reading closely: it states what was agreed and what CHANF owes us
before work can start, and it is far easier to correct now than to argue about
in six weeks.

If the document has already been sent or accepted, the script leaves it alone
rather than overwriting something a client has seen.

## What should be true afterwards

- `activity_log` holds the client's own actions, tagged `source = 'client'`:
  accepted, requested changes, signed
- `communications` shows every email, with who was copied
- `document_signatures` holds one row per party, with the terms each confirmed
  and their timestamps
- `system_alerts` holds the notifications, and the push went to the phone
- invoices exist per stage, and only the ones whose trigger has fired are live

## Known gaps

- **Audit coverage is incomplete.** 62 state-changing routes still write nothing
  to `activity_log`. The document pipeline is now covered; the rest is a
  separate piece of work and is the top finding in the platform raincheck.
- **Email links are localhost** until the app is deployed.
