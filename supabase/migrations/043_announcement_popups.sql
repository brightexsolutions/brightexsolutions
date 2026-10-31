-- Site pop-ups: any announcement can also appear as a pop-up on the public
-- site. All settings live in one JSON column so the shape can grow without
-- further migrations. Validated by PopupConfigSchema in src/lib/popup-config.ts.
--
-- Shape:
-- {
--   "enabled": true,
--   "trigger": "load" | "delay" | "scroll" | "exit" | "after_contact",
--   "delaySeconds": 8,          -- trigger = delay
--   "scrollPercent": 50,        -- trigger = scroll
--   "pages": ["/", "/services", "/blog/*"],   -- empty = every public page
--   "audience": "all" | "new" | "returning",
--   "device": "all" | "mobile" | "desktop",
--   "frequency": "once" | "session" | "days" | "always",
--   "frequencyDays": 7,         -- frequency = days
--   "style": "modal" | "slide" | "bar"
-- }

alter table announcements add column if not exists popup jsonb;

-- Public pages look up enabled pop-ups on every request
create index if not exists announcements_popup_enabled_idx
  on announcements ((popup->>'enabled'))
  where active = true and deleted_at is null;
