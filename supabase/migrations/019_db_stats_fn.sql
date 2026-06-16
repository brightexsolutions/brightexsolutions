-- Database stats function for the admin database health page
-- Queries PostgreSQL system views and returns a single JSONB payload
-- SECURITY DEFINER so it runs as the function owner (postgres) and can see pg_ views

CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'db_size_bytes',  pg_database_size(current_database()),
    'db_size_pretty', pg_size_pretty(pg_database_size(current_database())),
    'total_tables',   (
      SELECT count(*)::int FROM pg_stat_user_tables WHERE schemaname = 'public'
    ),
    'total_live_rows', (
      SELECT coalesce(sum(n_live_tup), 0)::bigint
      FROM pg_stat_user_tables WHERE schemaname = 'public'
    ),
    'connections', (
      SELECT jsonb_build_object(
        'total',  count(*)::int,
        'active', count(*) FILTER (WHERE state = 'active')::int,
        'idle',   count(*) FILTER (WHERE state = 'idle')::int
      )
      FROM pg_stat_activity
      WHERE datname = current_database()
    ),
    'tables', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name',        t.tablename,
            'live_rows',   coalesce(t.n_live_tup, 0),
            'dead_rows',   coalesce(t.n_dead_tup, 0),
            'data_size',   coalesce(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)), 0),
            'index_size',  coalesce(pg_indexes_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)), 0),
            'total_size',  coalesce(pg_total_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)), 0),
            'last_vacuum',   t.last_autovacuum,
            'last_analyze',  t.last_autoanalyze,
            'seq_scans',   coalesce(t.seq_scan, 0),
            'idx_scans',   coalesce(t.idx_scan, 0),
            'inserts',     coalesce(t.n_tup_ins, 0),
            'updates',     coalesce(t.n_tup_upd, 0),
            'deletes',     coalesce(t.n_tup_del, 0)
          )
          ORDER BY pg_total_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)) DESC NULLS LAST
        ),
        '[]'::jsonb
      )
      FROM pg_stat_user_tables t
      WHERE t.schemaname = 'public'
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_db_stats() TO service_role;
