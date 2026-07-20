import { z } from '@hono/zod-openapi';

/**
 * Shared aggregation response schema — mirrors routes/shared-aggregation.ts's
 * AggregatedData interface (returned by getAggregatedData(), consumed by both
 * facets.ts's GET /aggregated and reflect.ts's synthesis endpoints). No matching
 * interface exists in dashboard/src/lib/types.ts — this is a server-computed
 * projection, not a raw table row.
 */
export const AggregatedFrictionCategorySchema = z
  .object({
    category: z.string(),
    count: z.number(),
    avg_severity: z.number(),
    examples: z.array(z.string()),
  })
  .openapi('AggregatedFrictionCategory');

export const AggregatedEffectivePatternSchema = z
  .object({
    category: z.string(),
    label: z.string(),
    frequency: z.number(),
    avg_confidence: z.number(),
    descriptions: z.array(z.string()),
    drivers: z.record(z.string(), z.number()),
  })
  .openapi('AggregatedEffectivePattern');

export const AggregatedPQCategorySchema = z
  .object({
    category: z.string(),
    label: z.string(),
    count: z.number(),
  })
  .openapi('AggregatedPQCategory');

export const RateLimitInfoSchema = z
  .object({
    count: z.number(),
    sessionsAffected: z.number(),
    examples: z.array(z.string()),
  })
  .openapi('RateLimitInfo');

export const PQDimensionScoresSchema = z
  .object({
    overall: z.number(),
    context_provision: z.number().nullable(),
    request_specificity: z.number().nullable(),
    scope_management: z.number().nullable(),
    information_timing: z.number().nullable(),
    correction_quality: z.number().nullable(),
  })
  .openapi('PQDimensionScores');

export const AggregatedDataSchema = z
  .object({
    frictionCategories: z.array(AggregatedFrictionCategorySchema),
    effectivePatterns: z.array(AggregatedEffectivePatternSchema),
    outcomeDistribution: z.record(z.string(), z.number()),
    workflowDistribution: z.record(z.string(), z.number()),
    characterDistribution: z.record(z.string(), z.number()),
    totalSessions: z.number(),
    frictionTotal: z.number(),
    totalAllSessions: z.number(),
    rateLimitInfo: RateLimitInfoSchema.nullable(),
    streak: z.number(),
    sourceToolCount: z.number(),
    sourceTools: z.array(z.string()),
    pqDeficits: z.array(AggregatedPQCategorySchema),
    pqStrengths: z.array(AggregatedPQCategorySchema),
    pqScores: PQDimensionScoresSchema.nullable(),
    lifetimeSessions: z.number(),
    totalTokens: z.number(),
  })
  .openapi('AggregatedData');
