-- Track when invoices and payment receipts were last sent to clients
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

GRANT ALL ON invoices TO service_role;
GRANT ALL ON payments TO service_role;
