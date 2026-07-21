import { z } from '@hono/zod-openapi';

/**
 * Mirrors cli/src/types.ts PersonalityProfile and friends. See cli/src/analysis/
 * personality.ts for the deterministic scoring that produces traits/axis/pace, and
 * server/src/llm/reflect-prompts.ts generatePersonalityPrompt for the archetype prose.
 */
export const PersonalityTraitSchema = z
  .object({
    key: z.enum(['precision', 'resilience', 'autonomy', 'craft']),
    score: z.number().nullable(),
    band: z.enum(['low', 'moderate', 'high']).optional(),
    sampleSize: z.number(),
  })
  .openapi('PersonalityTrait');

export const PersonalityBipolarAxisSchema = z
  .object({
    key: z.literal('explorer_executor'),
    value: z.number().nullable(),
    sampleSize: z.number(),
  })
  .openapi('PersonalityBipolarAxis');

export const PersonalityPaceSchema = z
  .object({
    value: z.number().nullable(),
    sampleSize: z.number(),
  })
  .openapi('PersonalityPace');

export const PersonalityArchetypeSchema = z
  .object({
    tagline: z.string().optional(),
    tagline_subtitle: z.string().optional(),
    narrative: z.string(),
    strengths: z.array(z.string()),
    growthAreas: z.array(z.string()),
  })
  .openapi('PersonalityArchetype');

export const PersonalityProfileSchema = z
  .object({
    profileVersion: z.literal(1),
    traits: z.array(PersonalityTraitSchema),
    axis: PersonalityBipolarAxisSchema,
    pace: PersonalityPaceSchema,
    archetype: PersonalityArchetypeSchema.optional(),
    computedAt: z.string(),
    analysisVersion: z.string(),
    sessionCount: z.number(),
    facetCount: z.number(),
    period: z.string(),
    projectId: z.string(),
  })
  .openapi('PersonalityProfile');

export const PersonalityQuerySchema = z.object({
  period: z.string().optional().openapi({ param: { name: 'period', in: 'query' } }),
  projectId: z.string().optional().openapi({ param: { name: 'projectId', in: 'query' } }),
});

export const PersonalityTrendQuerySchema = z.object({
  projectId: z.string().optional().openapi({ param: { name: 'projectId', in: 'query' } }),
  weeks: z.string().optional().openapi({ param: { name: 'weeks', in: 'query' } }),
});

export const PersonalityTrendRowSchema = z
  .object({
    period: z.string(),
    profile: PersonalityProfileSchema,
  })
  .openapi('PersonalityTrendRow');

export const PersonalityTrendResponseSchema = z
  .object({
    rows: z.array(PersonalityTrendRowSchema),
  })
  .openapi('PersonalityTrendResponse');
