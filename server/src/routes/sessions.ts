import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getDb } from '@code-insights/cli/db/client';
import { parseIntParam } from '../utils.js';
import { ErrorSchema, OkSchema } from '../schemas/common.js';
import {
  SessionSchema,
  SessionWithFacetsSchema,
  SessionsListResponseSchema,
  SessionResponseSchema,
  SessionIdParamSchema,
  SessionsListQuerySchema,
  DeletedCountQuerySchema,
  DeletedCountResponseSchema,
} from '../schemas/sessions.js';

/** Escape SQLite LIKE wildcard characters so user input is treated as literal text. */
function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

/** ISO 8601 date/datetime — accepts YYYY-MM-DD and YYYY-MM-DDTHH:MM:SSZ-style strings. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+\-]+)?$/;

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// PATCH body is intentionally NOT wired into createRoute()'s `request.body` —
// the handler performs its own field presence/shape validation with custom
// error messages, which a zod body schema + defaultHook would collapse into
// a single generic "Invalid request" message.

const listRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: SessionsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: SessionsListResponseSchema } },
      description: 'Sessions ordered by most recently started',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid from/to date',
    },
  },
});

app.openapi(listRoute, (c) => {
  const db = getDb();
  const { projectId, sourceTool, limit, offset, q, from, to, homeId } = c.req.query();

  // Validate from/to are ISO 8601 date strings before passing to SQLite comparisons.
  // Invalid date strings in SQLite produce silent wrong results rather than errors.
  if (from && !ISO_DATE_RE.test(from)) {
    return c.json({ error: 'Invalid from: must be an ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)' }, 400);
  }
  if (to && !ISO_DATE_RE.test(to)) {
    return c.json({ error: 'Invalid to: must be an ISO 8601 date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)' }, 400);
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (projectId) {
    conditions.push('project_id = ?');
    params.push(projectId);
  }
  if (sourceTool) {
    conditions.push('source_tool = ?');
    params.push(sourceTool);
  }
  if (homeId) {
    conditions.push('home_id = ?');
    params.push(homeId);
  }
  if (q) {
    const likeParam = `%${escapeLike(q)}%`;
    conditions.push("(custom_title LIKE ? ESCAPE '\\' OR generated_title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR project_name LIKE ? ESCAPE '\\')");
    params.push(likeParam, likeParam, likeParam, likeParam);
  }
  if (from) {
    conditions.push('started_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('started_at <= ?');
    params.push(to);
  }
  conditions.push('deleted_at IS NULL');
  const where = `WHERE ${conditions.join(' AND ')}`;
  const sessions = db.prepare(`
    SELECT id, project_id, project_name, project_path, git_remote_url,
           summary, custom_title, generated_title, title_source, session_character,
           started_at, ended_at, message_count, user_message_count,
           assistant_message_count, tool_call_count, git_branch,
           claude_version, source_tool, device_id, device_hostname,
           device_platform, synced_at, total_input_tokens, total_output_tokens,
           cache_creation_tokens, cache_read_tokens, estimated_cost_usd,
           models_used, primary_model, usage_source,
           compact_count, auto_compact_count, slash_commands, home_id
    FROM sessions
    ${where}
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseIntParam(limit, 50), parseIntParam(offset, 0)) as z.infer<typeof SessionSchema>[];

  return c.json({ sessions }, 200);
});

// GET /api/sessions/deleted/count — count of soft-deleted sessions for a project
// IMPORTANT: registered before /{id} so "deleted" isn't matched as a session ID
const deletedCountRoute = createRoute({
  method: 'get',
  path: '/deleted/count',
  request: { query: DeletedCountQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: DeletedCountResponseSchema } },
      description: 'Count of soft-deleted sessions',
    },
  },
});

app.openapi(deletedCountRoute, (c) => {
  const db = getDb();
  const { projectId } = c.req.query();
  let row: { count: number };
  if (projectId) {
    row = db.prepare(
      `SELECT COUNT(*) AS count FROM sessions WHERE deleted_at IS NOT NULL AND project_id = ?`
    ).get(projectId) as { count: number };
  } else {
    row = db.prepare(
      `SELECT COUNT(*) AS count FROM sessions WHERE deleted_at IS NOT NULL`
    ).get() as { count: number };
  }
  return c.json({ count: row.count }, 200);
});

const getRoute = createRoute({
  method: 'get',
  path: '/{id}',
  request: { params: SessionIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: SessionResponseSchema } },
      description: 'A single session by id, including facets if analyzed',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Session not found',
    },
  },
});

app.openapi(getRoute, (c) => {
  const db = getDb();
  const session = db.prepare(`
    SELECT id, project_id, project_name, project_path, git_remote_url,
           summary, custom_title, generated_title, title_source, session_character,
           started_at, ended_at, message_count, user_message_count,
           assistant_message_count, tool_call_count, git_branch,
           claude_version, source_tool, device_id, device_hostname,
           device_platform, synced_at, total_input_tokens, total_output_tokens,
           cache_creation_tokens, cache_read_tokens, estimated_cost_usd,
           models_used, primary_model, usage_source,
           compact_count, auto_compact_count, slash_commands, home_id
    FROM sessions WHERE id = ? AND deleted_at IS NULL
  `).get(c.req.param('id')) as z.infer<typeof SessionSchema> | undefined;

  if (!session) return c.json({ error: 'Not found' }, 404);

  const facets = db.prepare(`
    SELECT * FROM session_facets WHERE session_id = ?
  `).get(c.req.param('id'));

  return c.json({
    session: {
      ...session,
      facets: (facets ?? null) as z.infer<typeof SessionWithFacetsSchema>['facets'],
    },
  }, 200);
});

const patchRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  request: { params: SessionIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Session updated',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'No fields to update',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Session not found',
    },
  },
});

app.openapi(patchRoute, async (c) => {
  const db = getDb();
  const body = await c.req.json<{ customTitle?: string; projectName?: string; gitRemoteUrl?: string }>();
  const { customTitle, projectName, gitRemoteUrl } = body;

  if (customTitle === undefined && projectName === undefined && gitRemoteUrl === undefined) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (customTitle !== undefined) {
    updates.push('custom_title = ?');
    params.push(customTitle || null);
  }
  if (projectName !== undefined) {
    updates.push('project_name = ?');
    params.push(projectName);
  }
  if (gitRemoteUrl !== undefined) {
    updates.push('git_remote_url = ?');
    params.push(gitRemoteUrl || null);
  }

  params.push(c.req.param('id'));

  const result = db.prepare(`
    UPDATE sessions
    SET ${updates.join(', ')}
    WHERE id = ? AND deleted_at IS NULL
  `).run(...params);

  if (result.changes === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true as const }, 200);
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  request: { params: SessionIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Session soft-deleted',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Session not found',
    },
  },
});

app.openapi(deleteRoute, (c) => {
  const db = getDb();
  const result = db.prepare(
    `UPDATE sessions SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
  ).run(c.req.param('id'));
  if (result.changes === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true as const }, 200);
});

export default app;
