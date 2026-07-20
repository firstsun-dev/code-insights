import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { getDb } from '@code-insights/cli/db/client';
import { extractFacetsOnly, analyzePromptQuality } from '../llm/analysis.js';
import { buildWhereClause, getAggregatedData } from './shared-aggregation.js';
import { ErrorSchema } from '../schemas/common.js';
import { AggregatedDataSchema } from '../schemas/aggregation.js';
import {
  FacetsListQuerySchema,
  FacetsListResponseSchema,
  SessionIdsResponseSchema,
  OutdatedResponseSchema,
} from '../schemas/facets.js';
import type { FacetRow } from '../schemas/facets.js';
import { requireLLM, streamBatchBackfill } from './route-helpers.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// POST bodies for /backfill and /backfill-pq are intentionally NOT wired into
// createRoute()'s `request.body` — the handlers validate sessionIds presence/
// shape with custom error messages, which a zod body schema + defaultHook
// would collapse into the generic "Invalid request" message.
//
// /backfill and /backfill-pq are SSE endpoints (see route-helpers.ts
// streamBatchBackfill) — they return a raw streamed Response that doesn't fit
// a single JSON response schema, so they stay as plain app.post() routes on
// this OpenAPIHono instance rather than app.openapi(), same as the SSE
// endpoints in analysis.ts.

const MAX_BACKFILL_SESSIONS = 200;

// GET /api/facets
// Query params: project (project_id), period (7d|30d|90d|all), source (source_tool filter)
// Returns: { facets, missingCount, totalSessions }
const listRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: FacetsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: FacetsListResponseSchema } },
      description: 'Session facets in scope, plus counts',
    },
  },
});

app.openapi(listRoute, (c) => {
  const db = getDb();
  const project = c.req.query('project');
  const period = c.req.query('period') || '30d';
  const source = c.req.query('source');
  const homeId = c.req.query('homeId');

  const { where, params } = buildWhereClause(period, project, source, homeId);

  // Total sessions in scope
  const totalRow = db.prepare(
    `SELECT COUNT(*) as count FROM sessions s ${where}`
  ).get(...params) as { count: number };

  // Sessions with facets — join to sessions so period/project/source filters apply
  const facets = db.prepare(
    `SELECT sf.* FROM session_facets sf
     JOIN sessions s ON sf.session_id = s.id
     ${where}
     ORDER BY s.started_at DESC`
  ).all(...params) as FacetRow[];

  return c.json({
    facets,
    missingCount: totalRow.count - facets.length,
    totalSessions: totalRow.count,
  }, 200);
});

// GET /api/facets/aggregated
// Returns pre-aggregated friction categories and effective patterns for synthesis.
// Uses the shared getAggregatedData function to avoid duplication with reflect routes.
const aggregatedRoute = createRoute({
  method: 'get',
  path: '/aggregated',
  request: { query: FacetsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: AggregatedDataSchema } },
      description: 'Pre-aggregated friction categories and effective patterns',
    },
  },
});

app.openapi(aggregatedRoute, (c) => {
  const db = getDb();
  const project = c.req.query('project');
  const period = c.req.query('period') || '30d';
  const source = c.req.query('source');
  const homeId = c.req.query('homeId');

  const { where, params } = buildWhereClause(period, project, source, homeId);
  const aggregated = getAggregatedData(db, where, params, project, source, homeId);

  return c.json(aggregated, 200);
});

// GET /api/facets/missing
// Returns session IDs that have insights but no session_facets row.
// Used by CLI `reflect backfill` and dashboard facet status indicators.
const missingRoute = createRoute({
  method: 'get',
  path: '/missing',
  responses: {
    200: {
      content: { 'application/json': { schema: SessionIdsResponseSchema } },
      description: 'Session IDs with insights but no session_facets row',
    },
  },
});

app.openapi(missingRoute, (c) => {
  const db = getDb();
  const period = c.req.query('period') || 'all';
  const project = c.req.query('project');
  const source = c.req.query('source');

  // buildWhereClause can't be used here — it generates "WHERE ..." prefix,
  // but this query already needs "WHERE sf.session_id IS NULL".
  // Build conditions inline instead.
  const conditions: string[] = ['sf.session_id IS NULL', 's.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (period !== 'all') {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 0;
    if (days > 0) {
      conditions.push('s.started_at >= ?');
      params.push(new Date(now.getTime() - days * 86400000).toISOString());
    }
  }
  if (project) {
    conditions.push('s.project_id = ?');
    params.push(project);
  }
  if (source) {
    conditions.push('s.source_tool = ?');
    params.push(source);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(`
    SELECT DISTINCT i.session_id
    FROM insights i
    JOIN sessions s ON i.session_id = s.id
    LEFT JOIN session_facets sf ON i.session_id = sf.session_id
    ${where}
  `).all(...params) as Array<{ session_id: string }>;

  const sessionIds = rows.map(r => r.session_id);
  return c.json({ sessionIds, count: sessionIds.length }, 200);
});

// GET /api/facets/outdated
// Returns count and sessionIds of session_facets rows where:
//   - effective_patterns entries lack a category or driver field, OR
//   - friction_points entries lack an attribution field
// Accepts period + project to scope to the user's current view — avoids misleading counts
// when the user is viewing "last 7 days" but sees outdated sessions from all time.
const outdatedRoute = createRoute({
  method: 'get',
  path: '/outdated',
  request: { query: FacetsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: OutdatedResponseSchema } },
      description: 'Session facets rows with outdated schema (missing category/driver/attribution)',
    },
  },
});

app.openapi(outdatedRoute, (c) => {
  const db = getDb();
  const project = c.req.query('project');
  const period = c.req.query('period') || '30d';
  const homeId = c.req.query('homeId');

  const { where, params } = buildWhereClause(period, project, undefined, homeId);

  // UNION of two subqueries — each finds session_ids with a specific outdated signal.
  // UNION (not UNION ALL) deduplicates sessions that fail both checks.
  // The effective_patterns arm uses OR to catch both missing category and missing driver
  // in a single scan rather than two separate UNION arms.
  const rows = db.prepare(`
    SELECT DISTINCT sf.session_id
    FROM session_facets sf
    JOIN sessions s ON sf.session_id = s.id
    CROSS JOIN json_each(sf.effective_patterns) je
    ${where}
    AND json_array_length(sf.effective_patterns) > 0
    AND (json_extract(je.value, '$.category') IS NULL
         OR json_extract(je.value, '$.driver') IS NULL)
    UNION
    SELECT DISTINCT sf.session_id
    FROM session_facets sf
    JOIN sessions s ON sf.session_id = s.id
    CROSS JOIN json_each(sf.friction_points) je
    ${where}
    AND json_array_length(sf.friction_points) > 0
    AND json_extract(je.value, '$.attribution') IS NULL
  `).all(...params, ...params) as Array<{ session_id: string }>;

  const sessionIds = rows.map(r => r.session_id);
  return c.json({ count: sessionIds.length, sessionIds }, 200);
});

// POST /api/facets/backfill
// Body: { sessionIds: string[], force?: boolean }
// Streams progress as facets are extracted one-by-one for sessions that lack them.
// force=true skips the existing-facets guard, allowing re-extraction of outdated rows.
// Uses extractFacetsOnly (lightweight prompt: summary + first/last 20 messages).
app.post('/backfill', requireLLM(), async (c) => {
  const body = await c.req.json<{ sessionIds?: string[]; force?: boolean }>();
  if (!body.sessionIds || !Array.isArray(body.sessionIds) || body.sessionIds.length === 0) {
    return c.json({ error: 'sessionIds array required' }, 400);
  }
  if (body.sessionIds.length > MAX_BACKFILL_SESSIONS) {
    return c.json({ error: `Maximum ${MAX_BACKFILL_SESSIONS} sessions per backfill request` }, 400);
  }

  const db = getDb();

  return streamBatchBackfill(c, body.sessionIds, body.force ?? false, {
    shouldSkip: (sessionId) => {
      return !!db.prepare('SELECT 1 FROM session_facets WHERE session_id = ?').get(sessionId);
    },
    analysisFn: extractFacetsOnly,
  });
});

// GET /api/facets/missing-pq
// Returns session IDs that have at least one non-PQ insight but no prompt_quality insight row.
// Accepts period + project + source to scope results (same params as /missing).
// Uses buildWhereClause so ISO week periods (e.g., 2026-W10) are supported.
const missingPqRoute = createRoute({
  method: 'get',
  path: '/missing-pq',
  request: { query: FacetsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: SessionIdsResponseSchema } },
      description: 'Sessions with a non-PQ insight but no prompt_quality insight',
    },
  },
});

app.openapi(missingPqRoute, (c) => {
  const db = getDb();
  const period = c.req.query('period') || 'all';
  const project = c.req.query('project');
  const source = c.req.query('source');
  const homeId = c.req.query('homeId');

  const { where, params } = buildWhereClause(period, project, source, homeId);

  // Sessions with a non-PQ insight but no prompt_quality insight row.
  const rows = db.prepare(`
    SELECT DISTINCT i.session_id
    FROM insights i
    JOIN sessions s ON i.session_id = s.id
    ${where}
    AND i.type != 'prompt_quality'
    AND NOT EXISTS (
      SELECT 1 FROM insights pq
      WHERE pq.session_id = i.session_id AND pq.type = 'prompt_quality'
    )
  `).all(...params) as Array<{ session_id: string }>;

  const sessionIds = rows.map(r => r.session_id);
  return c.json({ sessionIds, count: sessionIds.length }, 200);
});

// GET /api/facets/outdated-pq
// Returns session IDs where the prompt_quality insight's metadata lacks a `findings` array
// (old schema pre-PR #136). Accepts period + project + source to scope results.
// Uses buildWhereClause so ISO week periods (e.g., 2026-W10) are supported.
const outdatedPqRoute = createRoute({
  method: 'get',
  path: '/outdated-pq',
  request: { query: FacetsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: SessionIdsResponseSchema } },
      description: 'PQ insights with metadata lacking the findings array',
    },
  },
});

app.openapi(outdatedPqRoute, (c) => {
  const db = getDb();
  const period = c.req.query('period') || 'all';
  const project = c.req.query('project');
  const source = c.req.query('source');
  const homeId = c.req.query('homeId');

  const { where, params } = buildWhereClause(period, project, source, homeId);

  // PQ insights where metadata lacks the findings array (old schema).
  const rows = db.prepare(`
    SELECT DISTINCT i.session_id
    FROM insights i
    JOIN sessions s ON i.session_id = s.id
    ${where}
    AND i.type = 'prompt_quality'
    AND json_type(i.metadata, '$.findings') IS NULL
  `).all(...params) as Array<{ session_id: string }>;

  const sessionIds = rows.map(r => r.session_id);
  return c.json({ sessionIds, count: sessionIds.length }, 200);
});

// POST /api/facets/backfill-pq
// Body: { sessionIds: string[], force?: boolean }
// Streams progress as PQ analysis runs one-by-one for sessions that lack or have outdated PQ insights.
// force=true skips the existing-PQ-insight guard, allowing re-analysis of sessions with old schema.
// Uses analyzePromptQuality() from analysis.ts — same function used in the primary analysis pipeline.
app.post('/backfill-pq', requireLLM(), async (c) => {
  const body = await c.req.json<{ sessionIds?: string[]; force?: boolean }>();
  if (!body.sessionIds || !Array.isArray(body.sessionIds) || body.sessionIds.length === 0) {
    return c.json({ error: 'sessionIds array required' }, 400);
  }
  if (body.sessionIds.length > MAX_BACKFILL_SESSIONS) {
    return c.json({ error: `Maximum ${MAX_BACKFILL_SESSIONS} sessions per backfill request` }, 400);
  }

  const db = getDb();

  return streamBatchBackfill(c, body.sessionIds, body.force ?? false, {
    shouldSkip: (sessionId) => {
      return !!db.prepare("SELECT 1 FROM insights WHERE session_id = ? AND type = 'prompt_quality'").get(sessionId);
    },
    analysisFn: analyzePromptQuality,
  });
});

export default app;
