-- Proposal acceptance, as a distinct stage from agreement signing.
--
-- Migration 034 added signature evidence for agreements. Accepting a PROPOSAL
-- is a different event: a commercial decision, not a legal one, and it carries
-- two pieces of information that nothing in the schema could previously hold.
--
-- 1. Who accepted, in what capacity
--    accepted_by_name/email already exist. A role matters because the person
--    who accepts a proposal is frequently not the person who will sign the
--    agreement, and knowing that up front is the difference between sending the
--    agreement to the right person and chasing the wrong one.
--
-- 2. Which payment schedule they chose
--    A proposal may offer more than one schedule. The client's choice then has
--    to drive the agreement's milestone table AND the invoice tranches. Storing
--    it once, here, is what stops those three disagreeing: previously this was
--    negotiated in a thread and retyped into each document by hand.
--
-- 3. Final figures, where the proposal quoted ranges
--    Real phased proposals quote ranges, because at proposal stage the scope is
--    not pinned: the CHANF proposal quotes 135,000 to 210,000 overall and a
--    range per phase. A contract cannot, and an invoice certainly cannot. So
--    acceptance does not generate an agreement directly where ranges exist:
--    someone pins the numbers, and locked_figures records what was pinned and
--    figures_locked_at records that it happened.
--
-- Note on `status`: proposals now reach 'accepted', which is deliberately NOT
-- 'final'. 'final' has always meant a signed agreement and keeping that meaning
-- intact is what lets "accepted but unsigned" be visible at a glance.

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS accepted_by_role  text,
  -- Anything the client asked to change while accepting. Frequently the single
  -- most useful sentence in the whole exchange, and previously it had nowhere
  -- to go but a reply email nobody would link back to the document.
  ADD COLUMN IF NOT EXISTS accepted_notes    text,
  -- The PaymentSchedule the client chose: { mode, stages[] }.
  ADD COLUMN IF NOT EXISTS chosen_schedule   jsonb,
  -- Pinned amounts, once ranges have been resolved to single figures:
  -- [{ block_id, label, amount }]
  ADD COLUMN IF NOT EXISTS locked_figures    jsonb,
  ADD COLUMN IF NOT EXISTS figures_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS figures_locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Finding accepted-but-not-yet-contracted proposals is the query that drives
-- the follow-up, so it gets an index rather than a table scan.
CREATE INDEX IF NOT EXISTS generated_documents_accepted_proposals_idx
  ON generated_documents (type, accepted_at DESC)
  WHERE accepted_at IS NOT NULL;

GRANT ALL ON generated_documents TO service_role;
