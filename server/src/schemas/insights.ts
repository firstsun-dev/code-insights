import { z } from '@hono/zod-openapi';
import { InsightTypeSchema } from './common.js';

export const InsightScopeSchema = z.enum(['session', 'project', 'overall']).openapi('InsightScope');

/** Mirrors dashboard/src/lib/types.ts Insight, field-for-field. */
export const InsightSchema = z
  .object({
    id: z.string(),
    session_id: z.string(),
    project_id: z.string(),
    project_name: z.string(),
    type: InsightTypeSchema,
    title: z.string(),
    content: z.string(),
    summary: z.string(),
    bullets: z.string(), // JSON-encoded string[]
    confidence: z.number(),
    source: z.literal('llm'),
    metadata: z.string(), // JSON-encoded Record<string, unknown>
    timestamp: z.string(),
    created_at: z.string(),
    scope: InsightScopeSchema,
    analysis_version: z.string(),
    linked_insight_ids: z.string().nullable(), // JSON-encoded string[] | null
  })
  .openapi('Insight');

export const InsightsListResponseSchema = z
  .object({
    insights: z.array(InsightSchema),
  })
  .openapi('InsightsListResponse');

export const InsightIdParamSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
});

export const InsightsListQuerySchema = z.object({
  projectId: z.string().optional().openapi({ param: { name: 'projectId', in: 'query' } }),
  sessionId: z.string().optional().openapi({ param: { name: 'sessionId', in: 'query' } }),
  type: z.string().optional().openapi({ param: { name: 'type', in: 'query' } }),
  limit: z.string().optional().openapi({ param: { name: 'limit', in: 'query' } }),
  offset: z.string().optional().openapi({ param: { name: 'offset', in: 'query' } }),
  q: z.string().optional().openapi({ param: { name: 'q', in: 'query' } }),
});

export const CreateInsightResponseSchema = z
  .object({
    id: z.string(),
  })
  .openapi('CreateInsightResponse');
