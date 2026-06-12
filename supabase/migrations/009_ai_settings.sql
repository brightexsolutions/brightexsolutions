-- Seed default AI settings into the settings table.
-- These power Admin → Settings → AI and the Brixo chat fallback.
-- Uses ON CONFLICT DO NOTHING so re-running is safe and existing
-- admin-saved values are never overwritten.

insert into settings (key, value) values
  ('ai_enabled',  'true'),
  ('ai_provider', 'gemini'),
  ('ai_model',    'gemini-2.0-flash')
on conflict (key) do nothing;
