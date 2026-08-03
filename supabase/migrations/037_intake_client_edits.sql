-- Lets a client revise their own intake after submitting it, twice.
--
-- People remember the thing they forgot about ten minutes after they hit
-- submit. Without this the only route back is emailing us to retype it, which
-- means the record we work from is the form plus a correction buried in a
-- thread. A bounded number of edits keeps the submission authoritative while
-- accepting that first drafts are rarely complete.
--
-- Two, not unlimited: an intake is the basis for a quote, and a document that
-- can change indefinitely after we have priced from it is not a basis for
-- anything.
--
-- edit_token is per intake, not per client: the generic /intake form has no
-- client token at all, and a client with several submissions must only be able
-- to edit the one they were given a link to.

ALTER TABLE client_intakes
  ADD COLUMN IF NOT EXISTS edit_token   text UNIQUE,
  ADD COLUMN IF NOT EXISTS edit_count   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
  -- Prior versions, newest last: [{ edited_at, changed_fields[], snapshot }].
  -- Kept so a revision can be compared against what we actually quoted from.
  ADD COLUMN IF NOT EXISTS revisions    jsonb DEFAULT '[]',
  -- Set when an edit lands after the intake was already marked reviewed. That
  -- is the case that needs a human to look again, rather than a silent update.
  ADD COLUMN IF NOT EXISTS edited_after_review boolean DEFAULT false;

-- Backfill tokens so intakes submitted before this migration are editable too.
UPDATE client_intakes
SET edit_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE edit_token IS NULL;

CREATE OR REPLACE FUNCTION generate_intake_edit_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.edit_token IS NULL THEN
    NEW.edit_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_intakes_edit_token ON client_intakes;
CREATE TRIGGER trg_client_intakes_edit_token
  BEFORE INSERT ON client_intakes
  FOR EACH ROW EXECUTE FUNCTION generate_intake_edit_token();

GRANT ALL ON client_intakes TO service_role;
