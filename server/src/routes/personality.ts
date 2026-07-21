import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';
import { getDb } from '@code-insights/cli/db/client';
import { jsonrepair } from 'jsonrepair';
import type { PersonalityProfile } from '@code-insights/cli/types';
import { createLLMClient } from '../llm/client.js';
import { requireLLM } from './route-helpers.js';
import { extractJsonPayload } from '../llm/response-parsers.js';
import { PERSONALITY_SYSTEM_PROMPT, generatePersonalityPrompt } from '../llm/reflect-prompts.js';
import { computePersonalityProfile, type PersonalityFacetInput, type PersonalityInsightInput } from '../llm/personality.js';
import { buildWhereClause, parseIsoWeek, formatIsoWeek } from './shared-aggregation.js';
import { safeParseJson } from '../utils.js';
import {
  PersonalityQuerySchema,
  PersonalityTrendQuerySchema,
  PersonalityProfileSchema,
  PersonalityTrendResponseSchema,
} from '../schemas/personality.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// POST /generate is an SSE endpoint (streamSSE) — same pattern as reflect.ts's
// POST /generate: it returns a raw streamed Response that doesn't fit a single JSON
// response schema, so it stays as a plain app.post() route rather than app.openapi().

const DEFAULT_TREND_WEEKS = 12;
const MAX_TREND_WEEKS = 52;

interface FrictionPointRow { category: string; description: string; severity: string; resolution: string; attribution?: string }
interface EffectivePatternRow { category: string; description: string; confidence: number; driver?: string }

/** Compute the current ISO week string (YYYY-WNN) in UTC. Duplicated from dashboard/src/
 * lib/date-utils.ts's getCurrentIsoWeek — same rationale as that file documents: avoiding
 * a cross-package import for a ~10-line calculation that both server and dashboard need. */
function getCurrentIsoWeekString(): string {
  const now = new Date();
  const nowDay = now.getUTCDay();
  const daysToMonday = nowDay === 0 ? 6 : nowDay - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - daysToMonday * 86400000);
  return formatIsoWeek(monday);
}

/**
 * Load facets + prompt_quality insights for the given scope and adapt them into the
 * plain-object shapes computePersonalityProfile expects. This is the one place that
 * bridges raw SQLite rows to the pure scoring module — keeps personality.ts testable
 * without a database.
 */
function loadPersonalityScopeData(
  db: ReturnType<typeof getDb>,
  where: string,
  params: (string | number)[],
): { facets: PersonalityFacetInput[]; insights: PersonalityInsightInput[] } {
  const facetRows = db.prepare(`
    SELECT sf.session_id, sf.had_course_correction, sf.iteration_count,
           sf.friction_points, sf.effective_patterns,
           s.session_character, s.message_count
    FROM session_facets sf
    JOIN sessions s ON sf.session_id = s.id
    ${where}
  `).all(...params) as Array<{
    session_id: string;
    had_course_correction: number;
    iteration_count: number;
    friction_points: string | null;
    effective_patterns: string | null;
    session_character: string | null;
    message_count: number;
  }>;

  const facets: PersonalityFacetInput[] = facetRows.map(row => ({
    sessionId: row.session_id,
    hadCourseCorrection: !!row.had_course_correction,
    iterationCount: row.iteration_count,
    frictionPoints: safeParseJson<FrictionPointRow[]>(row.friction_points, []) as PersonalityFacetInput['frictionPoints'],
    effectivePatterns: safeParseJson<EffectivePatternRow[]>(row.effective_patterns, []) as PersonalityFacetInput['effectivePatterns'],
    sessionCharacter: row.session_character,
    messageCount: row.message_count ?? 0,
  }));

  const hasWhere = where.length > 0;
  const extraPrefix = hasWhere ? 'AND' : 'WHERE';
  const insightRows = db.prepare(`
    SELECT i.session_id, i.metadata
    FROM insights i
    JOIN sessions s ON i.session_id = s.id
    ${where}
    ${extraPrefix} i.type = 'prompt_quality'
  `).all(...params) as Array<{ session_id: string; metadata: string }>;

  const insights: PersonalityInsightInput[] = insightRows.map(row => {
    const metadata = safeParseJson<Record<string, unknown>>(row.metadata, {});
    const scores = metadata.dimension_scores as PersonalityInsightInput['dimensionScores'] | undefined;
    return { sessionId: row.session_id, dimensionScores: scores ?? null };
  });

  return { facets, insights };
}

function resolvePeriod(period: string | undefined): string {
  return period && period.trim().length > 0 ? period : getCurrentIsoWeekString();
}

function resolveProjectId(projectId: string | undefined): string {
  return projectId && projectId.trim().length > 0 ? projectId : '__all__';
}

interface PersonalitySnapshotRow {
  period: string;
  project_id: string;
  results_json: string;
  generated_at: string;
  window_start: string | null;
  window_end: string | null;
  session_count: number;
  facet_count: number;
}

function readSnapshot(db: ReturnType<typeof getDb>, period: string, projectId: string): PersonalityProfile | null {
  const row = db.prepare(
    `SELECT * FROM personality_snapshots WHERE period = ? AND project_id = ?`
  ).get(period, projectId) as PersonalitySnapshotRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.results_json) as PersonalityProfile;
  } catch {
    return null;
  }
}

// GET /api/personality
// Query: period (ISO week, defaults to current week), projectId (defaults '__all__').
// Returns the most recent cached snapshot if one exists for (period, projectId);
// otherwise computes the deterministic (rule-based, no-LLM) profile fresh and returns
// it WITHOUT persisting — persisting only happens via POST /generate, which also
// attaches the LLM archetype narrative. This keeps GET cheap/synchronous.
const getRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: PersonalityQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: PersonalityProfileSchema } },
      description: 'Personality profile for a period/project — cached snapshot or freshly computed',
    },
  },
});

app.openapi(getRoute, (c) => {
  const db = getDb();
  const period = resolvePeriod(c.req.query('period'));
  const projectId = resolveProjectId(c.req.query('projectId'));

  const cached = readSnapshot(db, period, projectId);
  if (cached) {
    return c.json(cached, 200);
  }

  const { where, params } = buildWhereClause(period, projectId === '__all__' ? undefined : projectId);
  const { facets, insights } = loadPersonalityScopeData(db, where, params);
  const profile = computePersonalityProfile(facets, insights, period, projectId);

  return c.json(profile, 200);
});

// GET /api/personality/trend
// Query: projectId (defaults '__all__'), weeks (defaults 12, capped at 52).
// Returns up to `weeks` most recent cached personality_snapshots rows for the project,
// most recent first. Unlike GET /, this does NOT compute fresh profiles for weeks that
// were never generated — trend is a view over what's already been generated via
// POST /generate, since the archetype narrative requires an LLM call.
const trendRoute = createRoute({
  method: 'get',
  path: '/trend',
  request: { query: PersonalityTrendQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: PersonalityTrendResponseSchema } },
      description: 'Up to N most recent cached personality snapshots for a project',
    },
  },
});

app.openapi(trendRoute, (c) => {
  const db = getDb();
  const projectId = resolveProjectId(c.req.query('projectId'));
  const weeksParam = parseInt(c.req.query('weeks') ?? '', 10);
  const weeks = Number.isFinite(weeksParam) && weeksParam > 0
    ? Math.min(weeksParam, MAX_TREND_WEEKS)
    : DEFAULT_TREND_WEEKS;

  const rows = db.prepare(
    `SELECT * FROM personality_snapshots WHERE project_id = ? ORDER BY period DESC LIMIT ?`
  ).all(projectId, weeks) as PersonalitySnapshotRow[];

  const result = rows
    .map(row => {
      try {
        return { period: row.period, profile: JSON.parse(row.results_json) as PersonalityProfile };
      } catch {
        return null;
      }
    })
    .filter((r): r is { period: string; profile: PersonalityProfile } => r !== null)
    .reverse(); // chronological order (oldest first) for trend charting

  return c.json({ rows: result }, 200);
});

// POST /api/personality/generate
// Body: { period?: string, project?: string, source?: string }
// SSE endpoint mirroring reflect.ts's POST /generate: computes the deterministic
// profile, calls the LLM once for the archetype narrative, sanitizes the response,
// merges it in, persists to personality_snapshots, and streams back the full profile.
// Only persists if the request was not aborted mid-generation (mirrors reflect.ts).
app.post('/generate', requireLLM(), async (c) => {
  const body = await c.req.json<{ period?: string; project?: string; source?: string }>();
  const period = resolvePeriod(body.period);
  const projectId = resolveProjectId(body.project);

  const db = getDb();
  // Same normalization as GET / (see resolveProjectId): '__all__' is only the snapshot
  // table's sentinel PK value, never a literal sessions.project_id — must be treated as
  // "no project filter" here too. Without this, project: '__all__' would filter
  // s.project_id = '__all__' (matching zero rows) and persist an empty profile.
  const { where, params } = buildWhereClause(period, body.project === '__all__' ? undefined : body.project, body.source);

  return streamSSE(c, async (stream) => {
    const abortSignal = c.req.raw.signal;

    try {
      await stream.writeSSE({
        event: 'progress',
        data: JSON.stringify({ phase: 'aggregating', message: 'Scoring personality traits...' }),
      });

      const { facets, insights } = loadPersonalityScopeData(db, where, params);

      if (facets.length === 0) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'No analyzed sessions found for this period/project. Run session analysis first.' }),
        });
        return;
      }

      const profile = computePersonalityProfile(facets, insights, period, projectId);

      await stream.writeSSE({
        event: 'progress',
        data: JSON.stringify({ phase: 'synthesizing', message: 'Generating personality narrative...' }),
      });

      const client = createLLMClient();
      const traitScore = (key: 'precision' | 'resilience' | 'autonomy' | 'craft') =>
        profile.traits.find(t => t.key === key)?.score ?? null;

      const prompt = generatePersonalityPrompt({
        precision: traitScore('precision'),
        resilience: traitScore('resilience'),
        autonomy: traitScore('autonomy'),
        craft: traitScore('craft'),
        explorerExecutorAxis: profile.axis.value,
        pace: profile.pace.value,
      });

      const response = await client.chat([
        { role: 'system', content: PERSONALITY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ], { signal: abortSignal });

      const payload = extractJsonPayload(response.content);
      let parsed: Record<string, unknown> | null = null;
      if (payload) {
        try {
          parsed = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          try {
            parsed = JSON.parse(jsonrepair(payload)) as Record<string, unknown>;
          } catch {
            parsed = null;
          }
        }
      }

      // Defensive sanitization — never trust a numeric field from the LLM response.
      // Every number on `profile` was already set deterministically above; this only
      // ever touches string/string[] archetype fields. Mirrors reflect.ts's tagline
      // sanitization exactly (see POST /generate in reflect.ts).
      const tagline = typeof parsed?.['tagline'] === 'string' ? (parsed['tagline'] as string).slice(0, 40) : undefined;
      const tagline_subtitle = typeof parsed?.['tagline_subtitle'] === 'string' ? (parsed['tagline_subtitle'] as string).slice(0, 80) : undefined;
      const narrative = typeof parsed?.['narrative'] === 'string' ? parsed['narrative'] as string : '';
      const strengths = Array.isArray(parsed?.['strengths'])
        ? (parsed['strengths'] as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 3)
        : [];
      const growthAreas = Array.isArray(parsed?.['growthAreas'])
        ? (parsed['growthAreas'] as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 2)
        : [];

      profile.archetype = { tagline, tagline_subtitle, narrative, strengths, growthAreas };

      if (!c.req.raw.signal.aborted) {
        const isoWeekBounds = parseIsoWeek(period);
        const windowStart = isoWeekBounds ? isoWeekBounds.start.toISOString() : null;
        const windowEnd = isoWeekBounds ? isoWeekBounds.end.toISOString() : new Date().toISOString();

        db.prepare(`
          INSERT INTO personality_snapshots (period, project_id, results_json, generated_at, window_start, window_end, session_count, facet_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(period, project_id) DO UPDATE SET
            results_json = excluded.results_json,
            generated_at = excluded.generated_at,
            window_start = excluded.window_start,
            window_end = excluded.window_end,
            session_count = excluded.session_count,
            facet_count = excluded.facet_count
        `).run(
          period,
          projectId,
          JSON.stringify(profile),
          new Date().toISOString(),
          windowStart,
          windowEnd,
          profile.sessionCount,
          profile.facetCount,
        );
      }

      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({ profile }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: message }),
      }).catch(() => {});
    }
  });
});

export default app;
