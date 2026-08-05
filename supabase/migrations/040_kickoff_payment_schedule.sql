-- Kick-off: turning a signed agreement into a project, its tasks, and the
-- invoices that bill it.
--
-- The design decision worth recording: a payment schedule becomes ONE INVOICE
-- PER STAGE, not one invoice with milestone line items.
--
-- Every piece of machinery this app already has (sending, reminders, overdue
-- detection, receipts, income records, the payment-reminders cron, the
-- stale-invoices cron) operates per invoice. A three-stage schedule expressed
-- as three invoices inherits all of it for free and correctly: stage 2 can be
-- overdue while stage 3 is not yet due, which a single invoice cannot express
-- at all. Expressed as milestone lines inside one invoice, every one of those
-- behaviours would need rewriting, and "how much is actually outstanding"
-- becomes a calculation rather than a column.
--
-- Stage 1 is issued immediately on signing. Later stages are created as drafts
-- carrying their trigger, and are issued when it fires (a milestone task
-- completes, or a date arrives) by /api/cron/schedule-invoices. Creating them
-- up front rather than on demand means the whole commercial shape of the
-- engagement is visible from day one instead of appearing piecemeal.

ALTER TABLE invoices
  -- Position in the schedule: 1 of 3, 2 of 3. Both stored, so an invoice can
  -- describe itself ("Deposit, 1 of 3") without loading the project.
  ADD COLUMN IF NOT EXISTS schedule_stage       int,
  ADD COLUMN IF NOT EXISTS schedule_total       int,
  -- on_signature | on_milestone | on_completion | on_date
  ADD COLUMN IF NOT EXISTS schedule_trigger     text,
  -- For on_milestone: the task whose completion issues this invoice.
  ADD COLUMN IF NOT EXISTS schedule_trigger_ref uuid,
  -- The agreement this invoice bills against, so a query about money can reach
  -- the contract that justifies it.
  ADD COLUMN IF NOT EXISTS document_id          uuid REFERENCES generated_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_document_id_idx ON invoices (document_id);
-- The cron's query: draft invoices waiting on a trigger.
CREATE INDEX IF NOT EXISTS invoices_pending_schedule_idx
  ON invoices (status, schedule_trigger)
  WHERE schedule_trigger IS NOT NULL;

ALTER TABLE projects
  -- The agreed schedule, kept on the project because that is the thing the
  -- schedule belongs to once work starts.
  ADD COLUMN IF NOT EXISTS payment_schedule   jsonb,
  ADD COLUMN IF NOT EXISTS source_document_id uuid REFERENCES generated_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_source_document_idx ON projects (source_document_id);

-- Marks the task that releases a payment stage, so completing it is visibly
-- consequential on the board rather than quietly triggering an invoice.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_payment_milestone boolean DEFAULT false;

GRANT ALL ON invoices TO service_role;
GRANT ALL ON projects TO service_role;
GRANT ALL ON tasks    TO service_role;
