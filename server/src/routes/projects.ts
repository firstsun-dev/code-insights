import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getDb } from '@code-insights/cli/db/client';
import { parseIntParam } from '../utils.js';
import { ErrorSchema, OkSchema } from '../schemas/common.js';
import {
  ProjectSchema,
  ProjectsListResponseSchema,
  ProjectResponseSchema,
  ProjectIdParamSchema,
  ProjectsListQuerySchema,
} from '../schemas/projects.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// PATCH body is intentionally NOT wired into createRoute()'s `request.body`
// in this pass — the handler still calls c.req.json() directly. Adding zod
// body validation would let the validator intercept malformed JSON before
// app.onError's SyntaxError handler sees it, changing the response shape.
// See PR description for the deliberate follow-up to tighten this.

const listRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: ProjectsListQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: ProjectsListResponseSchema } },
      description: 'Projects ordered by most recently active',
    },
  },
});

app.openapi(listRoute, (c) => {
  const db = getDb();
  const { limit, offset } = c.req.query();
  const projects = db.prepare(`
    SELECT id, name, path, git_remote_url, session_count, last_activity,
           total_input_tokens, total_output_tokens, cache_creation_tokens,
           cache_read_tokens, estimated_cost_usd, created_at, updated_at
    FROM projects
    ORDER BY last_activity DESC
    LIMIT ? OFFSET ?
  `).all(parseIntParam(limit, 100), parseIntParam(offset, 0)) as z.infer<typeof ProjectSchema>[];
  return c.json({ projects }, 200);
});

const getRoute = createRoute({
  method: 'get',
  path: '/{id}',
  request: { params: ProjectIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: ProjectResponseSchema } },
      description: 'A single project by id',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Project not found',
    },
  },
});

app.openapi(getRoute, (c) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT id, name, path, git_remote_url, session_count, last_activity,
           total_input_tokens, total_output_tokens, cache_creation_tokens,
           cache_read_tokens, estimated_cost_usd, created_at, updated_at
    FROM projects
    WHERE id = ?
  `).get(c.req.param('id')) as z.infer<typeof ProjectSchema> | undefined;
  if (!project) return c.json({ error: 'Not found' }, 404);
  return c.json({ project }, 200);
});

const patchRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  request: { params: ProjectIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Project updated',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'No fields to update',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Project not found',
    },
  },
});

app.openapi(patchRoute, async (c) => {
  const db = getDb();
  const projectId = c.req.param('id');
  const body = await c.req.json<{ name?: string; gitRemoteUrl?: string }>();
  const { name, gitRemoteUrl } = body;

  if (name === undefined && gitRemoteUrl === undefined) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  const sessionUpdates: string[] = [];
  const sessionParams: unknown[] = [];
  const insightUpdates: string[] = [];
  const insightParams: unknown[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);

    sessionUpdates.push('project_name = ?');
    sessionParams.push(name);

    insightUpdates.push('project_name = ?');
    insightParams.push(name);
  }
  if (gitRemoteUrl !== undefined) {
    updates.push('git_remote_url = ?');
    params.push(gitRemoteUrl || null);

    sessionUpdates.push('git_remote_url = ?');
    sessionParams.push(gitRemoteUrl || null);
  }

  params.push(projectId);
  sessionParams.push(projectId);
  insightParams.push(projectId);

  const tx = db.transaction(() => {
    const result = db.prepare(`
      UPDATE projects
      SET ${updates.join(', ')}, updated_at = datetime('now')
      WHERE id = ?
    `).run(...params);

    if (result.changes === 0) return false;

    if (sessionUpdates.length > 0) {
      db.prepare(`
        UPDATE sessions
        SET ${sessionUpdates.join(', ')}
        WHERE project_id = ?
      `).run(...sessionParams);
    }

    if (insightUpdates.length > 0) {
      db.prepare(`
        UPDATE insights
        SET ${insightUpdates.join(', ')}
        WHERE project_id = ?
      `).run(...insightParams);
    }

    return true;
  });

  const updated = tx();

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true as const }, 200);
});

export default app;
