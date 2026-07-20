import { z } from '@hono/zod-openapi';

/**
 * Mirrors cli/src/analysis/analysis-db.ts InsightRow (server re-exports it from
 * src/llm/analysis-db.ts). Not identical to dashboard/src/lib/types.ts Insight —
 * that type additionally carries `linked_insight_ids` (set later, by the reflect
 * pipeline) and omits `embedding_status`, which is set here.
 */
export const InsightRowSchema = z
  .object({
    id: z.string(),
    session_id: z.string(),
    project_id: z.string(),
    project_name: z.string(),
    type: z.string(),
    title: z.string(),
    content: z.string(),
    summary: z.string(),
    bullets: z.string(), // JSON-encoded string[]
    confidence: z.number(),
    source: z.literal('llm'),
    metadata: z.string().nullable(), // JSON-encoded object
    timestamp: z.string(),
    created_at: z.string(),
    scope: z.string(),
    analysis_version: z.string(),
    embedding_status: z.enum(['pending', 'computed', 'stale', 'failed']),
  })
  .openapi('InsightRow');

const AnalysisUsageDetailSchema = z
  .object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheCreationTokens: z.number().optional(),
    cacheReadTokens: z.number().optional(),
  })
  .optional();

/** Mirrors server/src/llm/analysis-internal.ts AnalysisResult. */
export const AnalysisResultSchema = z
  .object({
    success: z.boolean(),
    insights: z.array(InsightRowSchema),
    error: z.string().optional(),
    error_type: z.string().optional(),
    response_length: z.number().optional(),
    response_preview: z.string().optional(),
    usage: AnalysisUsageDetailSchema,
  })
  .openapi('AnalysisResult');

/** Mirrors cli/src/analysis/analysis-usage-db.ts AnalysisUsageRow. */
export const AnalysisUsageRowSchema = z
  .object({
    session_id: z.string(),
    analysis_type: z.string(),
    provider: z.string(),
    model: z.string(),
    input_tokens: z.number(),
    output_tokens: z.number(),
    cache_creation_tokens: z.number(),
    cache_read_tokens: z.number(),
    estimated_cost_usd: z.number(),
    duration_ms: z.number().nullable(),
    chunk_count: z.number(),
    analyzed_at: z.string(),
  })
  .openapi('AnalysisUsageRow');

export const AnalysisUsageResponseSchema = z
  .object({
    usage: z.array(AnalysisUsageRowSchema),
    totalCostUsd: z.number(),
    cacheSavingsUsd: z.number(),
  })
  .openapi('AnalysisUsageResponse');

export const AnalysisUsageQuerySchema = z.object({
  sessionId: z.string().optional().openapi({ param: { name: 'sessionId', in: 'query' } }),
});

export const SessionIdBodyResponseSchema = AnalysisResultSchema;

/** Mirrors server/src/llm/recurring-insights.ts RecurringInsightResult. */
export const RecurringInsightResultSchema = z
  .object({
    success: z.boolean(),
    groups: z.array(
      z.object({
        insightIds: z.array(z.string()),
        theme: z.string(),
      }),
    ),
    updatedCount: z.number(),
    error: z.string().optional(),
    usage: z
      .object({
        inputTokens: z.number(),
        outputTokens: z.number(),
      })
      .optional(),
  })
  .openapi('RecurringInsightResult');
