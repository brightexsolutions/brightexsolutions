-- Client requirements intake: shareable discovery questionnaire
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS intake_token text UNIQUE;

-- Backfill tokens for existing clients
UPDATE clients
SET intake_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE intake_token IS NULL;

-- Auto-generate token for new clients
CREATE OR REPLACE FUNCTION generate_intake_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.intake_token IS NULL THEN
    NEW.intake_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_intake_token ON clients;
CREATE TRIGGER trg_clients_intake_token
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION generate_intake_token();

-- Requirements intake submissions
CREATE TABLE IF NOT EXISTS client_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  -- Step 1: Service type
  service_type text NOT NULL,          -- website | mobile | erp | design | consultancy | other
  -- Step 2: Core info
  project_title text,
  description text NOT NULL,
  problem_statement text,
  -- Step 3: Type-specific answers (flexible JSONB)
  specifics jsonb DEFAULT '{}',
  -- Step 4: Timeline & Budget
  timeline text,
  budget_range text,
  additional_notes text,
  -- Step 5: Submitter (pre-filled from client or editable)
  submitter_name text,
  submitter_email text,
  -- Admin meta
  status text DEFAULT 'new',           -- new | reviewed | archived
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

GRANT ALL ON clients TO service_role;
GRANT ALL ON client_intakes TO service_role;
