-- Add health_endpoint column to sites table
-- This stores the custom health check URL for active/wordpress integration levels.
-- If null, the cron uses the default path (/api/health or /wp-json/brightex/v1/health).

alter table sites add column if not exists health_endpoint text;

grant all on sites to service_role;
