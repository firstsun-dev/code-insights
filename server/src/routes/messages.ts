import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getDb } from '@code-insights/cli/db/client';
import { parseIntParam } from '../utils.js';
import { resolveTurnReference } from '@code-insights/cli/analysis/turn-citations';
import {
  MessageSchema,
  MessagesResponseSchema,
  MessagesParamsSchema,
  MessagesQuerySchema,
} from '../schemas/messages.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

const listRoute = createRoute({
  method: 'get',
  path: '/{sessionId}',
  request: {
    params: MessagesParamsSchema,
    query: MessagesQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: MessagesResponseSchema },
      },
      description: 'Messages for a session, ordered by timestamp ascending',
    },
  },
});

app.openapi(listRoute, (c) => {
  const db = getDb();
  const { limit, offset } = c.req.query();
  const messages = db.prepare(`
    SELECT id, session_id, type, content, thinking,
           tool_calls, tool_results, usage, timestamp, parent_id
    FROM messages
    WHERE session_id = ?
    ORDER BY timestamp ASC, rowid ASC
    LIMIT ? OFFSET ?
  `).all(c.req.param('sessionId'), parseIntParam(limit, 100), parseIntParam(offset, 0)) as z.infer<typeof MessageSchema>[];
  return c.json({ messages });
});

const citationRoute = createRoute({
  method: 'get',
  path: '/{sessionId}/citation/{role}/{index}',
  request: { params: z.object({
    sessionId: z.string().min(1),
    role: z.enum(['User', 'Assistant']),
    index: z.string().regex(/^(0|[1-9][0-9]*)$/),
  }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({
        messageId: z.string(), offset: z.number().int().nonnegative(), ref: z.string(),
      }) } },
      description: 'Resolved role-ordinal citation',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Session or turn not found',
    },
  },
});

app.openapi(citationRoute, (c) => {
  const { sessionId, role, index } = c.req.valid('param');
  const db = getDb();
  const exists = db.prepare('SELECT id FROM sessions WHERE id = ? AND deleted_at IS NULL').get(sessionId);
  if (!exists) return c.json({ error: 'Session not found' }, 404);

  // Use the same role indexing as formatMessagesForAnalysis; load one session only.
  const messages = db.prepare(`
    SELECT id, type, content FROM messages
    WHERE session_id = ? ORDER BY timestamp ASC, rowid ASC
  `).all(sessionId) as Array<{ id: string; type: string; content: string }>;
  const result = resolveTurnReference(messages, role, Number(index));
  if (!result) return c.json({ error: 'Turn reference not found' }, 404);
  return c.json({ ...result, ref: `${role}#${index}` }, 200);
});

export default app;
