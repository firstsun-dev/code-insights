import { Hono } from 'hono';
import { getDb } from '@code-insights/cli/db/client';

const app = new Hono();

const VALID_RANGES = ['7d', '30d', '90d', 'all'] as const;
type Range = typeof VALID_RANGES[number];

function periodStartFor(range: string): string | null {
  const now = new Date();
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  if (range === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

// Dashboard overview stats for a given time range (e.g. ?range=7d|30d|90d|all)
app.get('/dashboard', (c) => {
  const db = getDb();
  const { range = '7d', homeId } = c.req.query();

  if (!VALID_RANGES.includes(range as Range)) {
    return c.json({ error: `Invalid range. Must be one of: ${VALID_RANGES.join(', ')}` }, 400);
  }

  const periodStart = periodStartFor(range);

  const conditions: string[] = ['deleted_at IS NULL'];
  const params: string[] = [];
  if (periodStart) {
    conditions.push('started_at >= ?');
    params.push(periodStart);
  }
  if (homeId) {
    conditions.push('home_id = ?');
    params.push(homeId);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const stats = db.prepare(`
    SELECT
      COUNT(*) AS session_count,
      COUNT(DISTINCT project_id) AS active_projects,
      SUM(message_count) AS total_messages,
      SUM(tool_call_count) AS total_tool_calls,
      CAST(COALESCE(SUM(
        CASE WHEN ended_at IS NOT NULL AND started_at IS NOT NULL
          THEN (julianday(ended_at) - julianday(started_at)) * 1440
          ELSE 0
        END
      ), 0) AS INTEGER) AS total_duration_min,
      SUM(total_input_tokens) AS total_input_tokens,
      SUM(total_output_tokens) AS total_output_tokens,
      SUM(cache_creation_tokens) AS cache_creation_tokens,
      SUM(cache_read_tokens) AS cache_read_tokens,
      SUM(estimated_cost_usd) AS estimated_cost_usd
    FROM sessions ${where}
  `).get(...params);

  return c.json({ range, stats });
});

// Daily session/insight counts for the activity chart, aggregated entirely
// server-side (no row cap) so 'all' range genuinely covers full history
// regardless of total session count.
app.get('/daily', (c) => {
  const db = getDb();
  const { range = '7d', homeId } = c.req.query();

  if (!VALID_RANGES.includes(range as Range)) {
    return c.json({ error: `Invalid range. Must be one of: ${VALID_RANGES.join(', ')}` }, 400);
  }

  const periodStart = periodStartFor(range);

  const sessionConditions: string[] = ['deleted_at IS NULL'];
  const sessionParams: string[] = [];
  if (periodStart) {
    sessionConditions.push('started_at >= ?');
    sessionParams.push(periodStart);
  }
  if (homeId) {
    sessionConditions.push('home_id = ?');
    sessionParams.push(homeId);
  }

  const sessionRows = db.prepare(`
    SELECT date(started_at) AS date, COUNT(*) AS count
    FROM sessions
    WHERE ${sessionConditions.join(' AND ')}
    GROUP BY date(started_at)
  `).all(...sessionParams) as { date: string; count: number }[];

  const insightConditions: string[] = ['s.deleted_at IS NULL'];
  const insightParams: string[] = [];
  if (periodStart) {
    insightConditions.push('i.timestamp >= ?');
    insightParams.push(periodStart);
  }
  if (homeId) {
    insightConditions.push('s.home_id = ?');
    insightParams.push(homeId);
  }

  const insightRows = db.prepare(`
    SELECT date(i.timestamp) AS date, COUNT(*) AS count
    FROM insights i
    JOIN sessions s ON i.session_id = s.id
    WHERE ${insightConditions.join(' AND ')}
    GROUP BY date(i.timestamp)
  `).all(...insightParams) as { date: string; count: number }[];

  const grouped: Record<string, { session_count: number; insight_count: number }> = {};
  for (const row of sessionRows) {
    (grouped[row.date] ??= { session_count: 0, insight_count: 0 }).session_count = row.count;
  }
  for (const row of insightRows) {
    (grouped[row.date] ??= { session_count: 0, insight_count: 0 }).insight_count = row.count;
  }

  const daily = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      session_count: counts.session_count,
      insight_count: counts.insight_count,
    }));

  return c.json({ range, daily });
});

// Global cumulative usage stats
app.get('/usage', (c) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT total_input_tokens, total_output_tokens, cache_creation_tokens,
           cache_read_tokens, estimated_cost_usd, sessions_with_usage, last_updated_at
    FROM usage_stats WHERE id = 1
  `).get();
  return c.json({ stats: stats ?? null });
});

export default app;
