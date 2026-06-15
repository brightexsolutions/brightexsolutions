-- Client portal: shareable token-gated project status page
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_enabled boolean DEFAULT false;

-- Backfill tokens for all existing projects
UPDATE projects
SET portal_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE portal_token IS NULL;

-- Ensure new projects always get a token on insert
CREATE OR REPLACE FUNCTION generate_portal_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_portal_token ON projects;
CREATE TRIGGER trg_projects_portal_token
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION generate_portal_token();

GRANT ALL ON projects TO service_role;
