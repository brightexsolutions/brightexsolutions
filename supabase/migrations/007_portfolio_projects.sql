-- Portfolio projects (admin-managed, displayed on home page)
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  category     text NOT NULL,
  description  text,
  url          text NOT NULL,
  image_url    text,                        -- admin-uploaded image; null = auto ThumbIO screenshot
  tags         text[] DEFAULT '{}',
  accent_color text DEFAULT '#f9a825',
  featured     boolean DEFAULT false,
  display_order integer DEFAULT 0,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_projects TO service_role;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portfolio_projects_updated_at
  BEFORE UPDATE ON portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();
