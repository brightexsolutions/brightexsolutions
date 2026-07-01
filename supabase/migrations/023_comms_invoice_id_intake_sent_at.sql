-- Per-invoice communication tracking: lets the invoices table show send count + last sent time
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS communications_invoice_id_idx ON communications(invoice_id);

GRANT ALL ON communications TO service_role;

-- Track when the onboarding intake email was sent to a client
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS intake_sent_at timestamptz;

GRANT ALL ON clients TO service_role;
