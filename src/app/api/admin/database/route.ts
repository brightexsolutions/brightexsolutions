import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Free-tier thresholds (bytes)
const DB_FREE_LIMIT  = 500 * 1024 * 1024;   // 500 MB
const DB_WARN_PCT    = 0.75;
const DB_CRIT_PCT    = 0.90;

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("get_db_stats");
  if (error) {
    console.error("[database/GET] rpc:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats = data as {
    db_size_bytes:   number;
    db_size_pretty:  string;
    total_tables:    number;
    total_live_rows: number;
    connections: { total: number; active: number; idle: number };
    tables: Array<{
      name:         string;
      live_rows:    number;
      dead_rows:    number;
      data_size:    number;
      index_size:   number;
      total_size:   number;
      last_vacuum:  string | null;
      last_analyze: string | null;
      seq_scans:    number;
      idx_scans:    number;
      inserts:      number;
      updates:      number;
      deletes:      number;
    }>;
  };

  // Compute per-table health flags
  const tables = (stats.tables ?? []).map((t) => {
    const totalRows    = t.live_rows + t.dead_rows;
    const deadPct      = totalRows > 0 ? t.dead_rows / totalRows : 0;
    const daysSinceAnalyze = t.last_analyze
      ? (Date.now() - new Date(t.last_analyze).getTime()) / 86_400_000
      : null;
    const needsVacuum  = deadPct > 0.1 && t.dead_rows > 100;
    const needsAnalyze = daysSinceAnalyze !== null && daysSinceAnalyze > 7;
    const health: "good" | "warn" | "crit" =
      (deadPct > 0.3 && t.dead_rows > 500) ? "crit"
      : (needsVacuum || needsAnalyze)       ? "warn"
      : "good";
    return { ...t, dead_pct: deadPct, needs_vacuum: needsVacuum, needs_analyze: needsAnalyze, health };
  });

  // Overall DB status
  const dbPct    = stats.db_size_bytes / DB_FREE_LIMIT;
  const hasWarn  = dbPct >= DB_WARN_PCT || tables.some((t) => t.health === "warn");
  const hasCrit  = dbPct >= DB_CRIT_PCT || tables.some((t) => t.health === "crit");
  const status   = hasCrit ? "critical" : hasWarn ? "warning" : "healthy";

  return NextResponse.json({
    status,
    db_size_bytes:     stats.db_size_bytes,
    db_size_pretty:    stats.db_size_pretty,
    db_limit_bytes:    DB_FREE_LIMIT,
    db_used_pct:       dbPct,
    total_tables:      stats.total_tables,
    total_live_rows:   stats.total_live_rows,
    connections:       stats.connections,
    tables,
    fetched_at:        new Date().toISOString(),
  });
}
