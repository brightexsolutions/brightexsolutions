-- Track when an automated reminder was last sent for each invoice.
-- The cron uses this to enforce a cooldown between repeat reminders.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

GRANT ALL ON invoices TO service_role;
