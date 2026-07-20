import { z } from '@hono/zod-openapi';

export const ReflectQuerySchema = z.object({
  period: z.string().optional().openapi({ param: { name: 'period', in: 'query' } }),
  project: z.string().optional().openapi({ param: { name: 'project', in: 'query' } }),
  source: z.string().optional().openapi({ param: { name: 'source', in: 'query' } }),
  homeId: z.string().optional().openapi({ param: { name: 'homeId', in: 'query' } }),
});

export const WeeksQuerySchema = z.object({
  project: z.string().optional().openapi({ param: { name: 'project', in: 'query' } }),
});

export const SnapshotQuerySchema = z.object({
  period: z.string().optional().openapi({ param: { name: 'period', in: 'query' } }),
  project: z.string().optional().openapi({ param: { name: 'project', in: 'query' } }),
});

/** Mirrors dashboard/src/lib/api.ts WeekInfo. */
export const WeekInfoSchema = z
  .object({
    week: z.string(),
    sessionCount: z.number(),
    hasSnapshot: z.boolean(),
    generatedAt: z.string().nullable(),
  })
  .openapi('WeekInfo');

export const WeeksResponseSchema = z
  .object({
    weeks: z.array(WeekInfoSchema),
  })
  .openapi('WeeksResponse');

/**
 * Mirrors dashboard/src/lib/api.ts ReflectSnapshot. `results` is a free-form
 * record — its shape is whatever the LLM synthesis for each ReflectSection
 * (friction-wins / rules-skills / working-style) produced, merged with
 * aggregated facet data at write time (see POST /generate below). Not worth
 * modeling more strictly since the LLM output shape can drift across prompt
 * versions without a schema migration.
 */
export const ReflectSnapshotSchema = z
  .object({
    period: z.string(),
    projectId: z.string(),
    results: z.record(z.string(), z.unknown()),
    generatedAt: z.string(),
    windowStart: z.string().nullable(),
    windowEnd: z.string(),
    sessionCount: z.number(),
    facetCount: z.number(),
  })
  .openapi('ReflectSnapshot');

export const SnapshotResponseSchema = z
  .object({
    snapshot: ReflectSnapshotSchema.nullable(),
  })
  .openapi('SnapshotResponse');
