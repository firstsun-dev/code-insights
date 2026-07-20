import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getDb } from '@code-insights/cli/db/client';
import { parseIntParam } from '../utils.js';
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
    ORDER BY timestamp ASC
    LIMIT ? OFFSET ?
  `).all(c.req.param('sessionId'), parseIntParam(limit, 100), parseIntParam(offset, 0)) as z.infer<typeof MessageSchema>[];
  return c.json({ messages });
});

export default app;
