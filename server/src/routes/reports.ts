import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { getDb } from '@code-insights/cli/db/client';
import { createLLMClient } from '../llm/client.js';
import { requireLLM } from './route-helpers.js';
import { ErrorSchema } from '../schemas/common.js';
import { ReportResponseSchema } from '../schemas/reports.js';
import { buildReportContext, buildReportSystemPrompt, type ReportSource, type ReportType } from '../llm/report-prompts.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => result.success ? undefined : c.json({ error: 'Invalid request' }, 400),
});

const REPORT_TYPES: ReportType[] = ['daily', 'weekly', 'project'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface SessionEvidenceRow {
  id: string;
  title: string;
  project_name: string;
  started_at: string;
  summary: string | null;
}

interface InsightEvidenceRow {
  session_id: string;
  type: string;
  title: string;
  summary: string;
}

const generateRoute = createRoute({
  method: 'post',
  path: '/generate',
  middleware: [requireLLM()] as const,
  responses: {
    200: { content: { 'application/json': { schema: ReportResponseSchema } }, description: 'Report generated successfully' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Invalid report request or LLM configuration' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'No session evidence found' },
  },
});

app.openapi(generateRoute, async (c) => {
  const body = await c.req.json<{
    reportType?: unknown; projectId?: unknown; projectIds?: unknown; homeId?: unknown; dateFrom?: unknown; dateTo?: unknown; instructions?: unknown;
  }>();
  if (!REPORT_TYPES.includes(body.reportType as ReportType)) {
    return c.json({ error: `reportType must be one of: ${REPORT_TYPES.join(', ')}` }, 400);
  }
  if (body.projectId !== undefined && typeof body.projectId !== 'string') return c.json({ error: 'projectId must be a string' }, 400);
  if (body.projectIds !== undefined && (!Array.isArray(body.projectIds) || body.projectIds.some((id) => typeof id !== 'string'))) return c.json({ error: 'projectIds must be an array of strings' }, 400);
  if (body.homeId !== undefined && typeof body.homeId !== 'string') return c.json({ error: 'homeId must be a string' }, 400);
  if (body.dateFrom !== undefined && (typeof body.dateFrom !== 'string' || !DATE_RE.test(body.dateFrom))) return c.json({ error: 'dateFrom must be YYYY-MM-DD' }, 400);
  if (body.dateTo !== undefined && (typeof body.dateTo !== 'string' || !DATE_RE.test(body.dateTo))) return c.json({ error: 'dateTo must be YYYY-MM-DD' }, 400);
  if (body.instructions !== undefined && (typeof body.instructions !== 'string' || body.instructions.length > 500)) return c.json({ error: 'instructions must be 500 characters or fewer' }, 400);

  const reportType = body.reportType as ReportType;
  const projectId = typeof body.projectId === 'string' && body.projectId.trim() ? body.projectId.trim() : undefined;
  const projectIds = Array.isArray(body.projectIds)
    ? [...new Set(body.projectIds.map((id) => id.trim()).filter(Boolean))]
    : projectId ? [projectId] : [];
  const homeId = typeof body.homeId === 'string' && body.homeId.trim() ? body.homeId.trim() : undefined;
  const dateFrom = body.dateFrom as string | undefined;
  const dateTo = body.dateTo as string | undefined;
  if (dateFrom && dateTo && dateFrom > dateTo) return c.json({ error: 'dateFrom must be on or before dateTo' }, 400);

  const clauses = ['s.deleted_at IS NULL'];
  const params: string[] = [];
  if (projectIds.length) { clauses.push('s.project_id IN (' + projectIds.map(() => '?').join(', ') + ')'); params.push(...projectIds); }
  if (homeId) { clauses.push('s.home_id = ?'); params.push(homeId); }
  if (dateFrom) { clauses.push("s.started_at >= ?"); params.push(`${dateFrom}T00:00:00.000Z`); }
  if (dateTo) { clauses.push("s.started_at < datetime(?, '+1 day')"); params.push(dateTo); }
  const db = getDb();
  const sessions = db.prepare(`
    SELECT s.id, COALESCE(s.custom_title, s.generated_title, 'Untitled session') AS title,
           s.project_name, s.started_at, s.summary
    FROM sessions s WHERE ${clauses.join(' AND ')}
    ORDER BY s.started_at DESC LIMIT 30
  `).all(...params) as SessionEvidenceRow[];
  if (!sessions.length) return c.json({ error: 'No sessions found for this report scope' }, 404);

  const ids = sessions.map((session) => session.id);
  const insights = db.prepare(`
    SELECT session_id, type, title, summary FROM insights
    WHERE session_id IN (${ids.map(() => '?').join(', ')})
    ORDER BY timestamp DESC
  `).all(...ids) as InsightEvidenceRow[];
  const insightMap = new Map<string, InsightEvidenceRow[]>();
  for (const insight of insights) {
    const items = insightMap.get(insight.session_id) ?? [];
    if (items.length < 5) items.push(insight);
    insightMap.set(insight.session_id, items);
  }
  const sources: ReportSource[] = sessions.map((session) => ({
    sessionId: session.id, title: session.title, projectName: session.project_name,
    startedAt: session.started_at, summary: session.summary, insights: insightMap.get(session.id) ?? [],
  }));

  const client = createLLMClient();
  const response = await client.chat([
    { role: 'system', content: buildReportSystemPrompt(reportType) },
    { role: 'user', content: buildReportContext({ type: reportType, dateFrom, dateTo, instructions: typeof body.instructions === 'string' ? body.instructions.trim() : undefined, sources }) },
  ], { temperature: 0.25, responseFormat: 'text' });

  return c.json({
    markdown: response.content.trim(), reportType, model: client.model, sourceCount: sources.length,
    sources: sources.map(({ sessionId, title, projectName, startedAt }) => ({ sessionId, title, projectName, startedAt })),
    tokensUsed: { input: response.usage?.inputTokens ?? 0, output: response.usage?.outputTokens ?? 0 },
  }, 200);
});

export default app;
