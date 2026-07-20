/**
 * GET /api/analysis/queue
 *
 * Returns current analysis_queue status for dashboard polling.
 * Dashboard polls at 5s intervals when pending > 0 or processing > 0,
 * and stops polling when both reach 0.
 */

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { getQueueStatus } from '@code-insights/cli/db/queue';
import { QueueStatusSchema } from '../schemas/analysis-queue.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// GET /api/analysis/queue
// Returns counts by status and details for active/pending/failed items.
// Returns 200 with empty items[] when queue is empty.
const statusRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': { schema: QueueStatusSchema },
      },
      description: 'Current analysis queue status',
    },
  },
});

app.openapi(statusRoute, (c) => {
  const status = getQueueStatus();
  return c.json(status);
});

export default app;
