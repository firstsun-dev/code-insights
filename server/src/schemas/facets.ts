import { z } from '@hono/zod-openapi';

/** Mirrors dashboard/src/lib/types.ts Session's `facets` sub-object — see schemas/sessions.ts SessionFacetsSchema. */
export const FacetRowSchema = z
  .object({
    session_id: z.string(),
    outcome_satisfaction: z.string(),
    workflow_pattern: z.string().nullable(),
    had_course_correction: z.number(),
    course_correction_reason: z.string().nullable(),
    iteration_count: z.number(),
    friction_points: z.string(), // JSON
    effective_patterns: z.string(), // JSON
    extracted_at: z.string(),
    analysis_version: z.string(),
  })
  .openapi('FacetRow');

export type FacetRow = z.infer<typeof FacetRowSchema>;

export const FacetsListQuerySchema = z.object({
  project: z.string().optional().openapi({ param: { name: 'project', in: 'query' } }),
  period: z.string().optional().openapi({ param: { name: 'period', in: 'query' } }),
  source: z.string().optional().openapi({ param: { name: 'source', in: 'query' } }),
  homeId: z.string().optional().openapi({ param: { name: 'homeId', in: 'query' } }),
});

export const FacetsListResponseSchema = z
  .object({
    facets: z.array(FacetRowSchema),
    missingCount: z.number(),
    totalSessions: z.number(),
  })
  .openapi('FacetsListResponse');

export const SessionIdsResponseSchema = z
  .object({
    sessionIds: z.array(z.string()),
    count: z.number(),
  })
  .openapi('SessionIdsResponse');

export const OutdatedResponseSchema = z
  .object({
    count: z.number(),
    sessionIds: z.array(z.string()),
  })
  .openapi('OutdatedResponse');
