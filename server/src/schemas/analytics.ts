import { z } from '@hono/zod-openapi';

// The `range` query param is validated manually in each handler (not via a zod
// enum) so that invalid values produce the existing custom error message
// ("Invalid range. Must be one of: ...") instead of the generic defaultHook
// "Invalid request" message.
export const RangeQuerySchema = z.object({
  range: z.string().optional().openapi({ param: { name: 'range', in: 'query' } }),
  homeId: z.string().optional().openapi({ param: { name: 'homeId', in: 'query' } }),
});

export const CacheBySourceQuerySchema = RangeQuerySchema.extend({
  source: z.string().optional().openapi({ param: { name: 'source', in: 'query' } }),
});

export const DashboardStatsSchema = z
  .object({
    session_count: z.number().nullable(),
    active_projects: z.number().nullable(),
    total_messages: z.number().nullable(),
    total_tool_calls: z.number().nullable(),
    total_duration_min: z.number().nullable(),
    total_input_tokens: z.number().nullable(),
    total_output_tokens: z.number().nullable(),
    cache_creation_tokens: z.number().nullable(),
    cache_read_tokens: z.number().nullable(),
    estimated_cost_usd: z.number().nullable(),
  })
  .openapi('DashboardStats');

export const DashboardResponseSchema = z
  .object({
    range: z.string(),
    stats: DashboardStatsSchema,
  })
  .openapi('DashboardResponse');

export const DailyStatsEntrySchema = z
  .object({
    date: z.string(),
    session_count: z.number(),
    insight_count: z.number(),
  })
  .openapi('DailyStatsEntry');

export const DailyResponseSchema = z
  .object({
    range: z.string(),
    daily: z.array(DailyStatsEntrySchema),
  })
  .openapi('DailyResponse');

export const UsageStatsSchema = z
  .object({
    total_input_tokens: z.number().nullable(),
    total_output_tokens: z.number().nullable(),
    cache_creation_tokens: z.number().nullable(),
    cache_read_tokens: z.number().nullable(),
    estimated_cost_usd: z.number().nullable(),
    sessions_with_usage: z.number().nullable(),
    last_updated_at: z.string().nullable(),
  })
  .openapi('UsageStats');

export const UsageResponseSchema = z
  .object({
    stats: UsageStatsSchema.nullable(),
  })
  .openapi('UsageResponse');

export const CacheBySourceRowSchema = z
  .object({
    sourceTool: z.string().nullable(),
    sessionCount: z.number(),
    totalInputTokens: z.number().nullable(),
    cacheCreationTokens: z.number().nullable(),
    cacheReadTokens: z.number().nullable(),
  })
  .openapi('CacheBySourceRow');

export const CacheBySourceResponseSchema = z
  .object({
    range: z.string(),
    homeId: z.string().optional(),
    source: z.string().optional(),
    rows: z.array(CacheBySourceRowSchema),
  })
  .openapi('CacheBySourceResponse');
