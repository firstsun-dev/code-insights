import { z } from '@hono/zod-openapi';

/**
 * No matching interface exists in dashboard/src/lib/types.ts for this
 * endpoint — mirrored instead from cli/src/db/queue.ts's QueueItem/QueueStatus
 * (already snake_case; these are raw analysis_queue table rows, not the
 * camelCase domain model in cli/src/types.ts).
 */
export const QueueItemSchema = z
  .object({
    session_id: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    runner_type: z.string(),
    enqueued_at: z.string(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    error_message: z.string().nullable(),
    attempt_count: z.number(),
    max_attempts: z.number(),
  })
  .openapi('QueueItem');

export const QueueStatusSchema = z
  .object({
    pending: z.number(),
    processing: z.number(),
    completed: z.number(),
    failed: z.number(),
    items: z.array(QueueItemSchema),
  })
  .openapi('QueueStatus');
