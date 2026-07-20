import { z } from '@hono/zod-openapi';
import { SessionCharacterSchema } from './common.js';

/**
 * No matching interface exists in dashboard/src/lib/types.ts for these
 * shapes — they're search-result projections built by search.ts, not raw
 * table rows. Modeled directly off the route's actual output.
 */
export const SearchSessionResultSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    project_name: z.string(),
    session_character: SessionCharacterSchema.nullable(),
    started_at: z.string(),
    match_field: z.enum(['title', 'summary']),
    snippet: z.string(),
  })
  .openapi('SearchSessionResult');

export const SearchInsightResultSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    project_name: z.string(),
    session_id: z.string(),
    created_at: z.string(),
    snippet: z.string(),
  })
  .openapi('SearchInsightResult');

export const SearchResponseSchema = z
  .object({
    sessions: z.array(SearchSessionResultSchema),
    insights: z.array(SearchInsightResultSchema),
  })
  .openapi('SearchResponse');

export const SearchQuerySchema = z.object({
  q: z.string().optional().openapi({ param: { name: 'q', in: 'query' } }),
  limit: z.string().optional().openapi({ param: { name: 'limit', in: 'query' } }),
});
