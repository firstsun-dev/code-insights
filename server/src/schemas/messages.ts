import { z } from '@hono/zod-openapi';

/** Mirrors dashboard/src/lib/types.ts Message, field-for-field. */
export const MessageSchema = z
  .object({
    id: z.string(),
    session_id: z.string(),
    type: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    thinking: z.string().nullable(),
    tool_calls: z.string(), // JSON-encoded array from SQLite
    tool_results: z.string(), // JSON-encoded array from SQLite
    usage: z.string().nullable(), // JSON-encoded object from SQLite
    timestamp: z.string(), // ISO 8601
    parent_id: z.string().nullable(),
  })
  .openapi('Message');

export const MessagesResponseSchema = z
  .object({
    messages: z.array(MessageSchema),
  })
  .openapi('MessagesResponse');

export const MessagesParamsSchema = z.object({
  sessionId: z.string().openapi({ param: { name: 'sessionId', in: 'path' } }),
});

export const MessagesQuerySchema = z.object({
  limit: z.string().optional().openapi({ param: { name: 'limit', in: 'query' } }),
  offset: z.string().optional().openapi({ param: { name: 'offset', in: 'query' } }),
});
