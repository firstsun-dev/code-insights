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

export const CognitiveFunctionKeySchema = z.enum(['ni', 'ne', 'si', 'se', 'ti', 'te', 'fi', 'fe']);

export const CognitiveFunctionScoreSchema = z
  .object({
    key: CognitiveFunctionKeySchema,
    score: z.number().nullable(),
    band: z.enum(['low', 'moderate', 'high']).optional(),
    sampleSize: z.number(),
  })
  .openapi('CognitiveFunctionScore');

export const MBTITypeSchema = z.enum([
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]);

export const MBTICandidateSchema = z
  .object({
    type: MBTITypeSchema,
    rank: z.number(),
    likelihood: z.number(),
    reasoning: z.string(),
  })
  .openapi('MBTICandidate');

export const MBTIProfileSchema = z
  .object({
    type: MBTITypeSchema.nullable(),
    functionStack: z.array(CognitiveFunctionKeySchema).nullable(),
    confidence: z.enum(['low', 'moderate', 'high']).nullable(),
    topCandidates: z.array(MBTICandidateSchema).optional(),
  })
  .openapi('MBTIProfile');

export const PersonalityProfileSchema = z
  .object({
    profileVersion: z.union([z.literal(1), z.literal(2)]),
    traits: z.array(PersonalityTraitSchema),
    axis: PersonalityBipolarAxisSchema,
    pace: PersonalityPaceSchema,
    cognitiveFunctions: z.array(CognitiveFunctionScoreSchema),
    cognitiveFunctionScoringMode: z.enum(['formula', 'llm-vote']).optional(),
    mbti: MBTIProfileSchema,
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

export const PersonalityProjectsQuerySchema = z.object({
  period: z.string().optional().openapi({ param: { name: 'period', in: 'query' } }),
});

export const PersonalityProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .openapi('PersonalityProject');

export const PersonalityProjectsResponseSchema = z
  .object({
    projects: z.array(PersonalityProjectSchema),
  })
  .openapi('PersonalityProjectsResponse');

export const PersonalityWeeksQuerySchema = z.object({
  project: z.string().optional().openapi({ param: { name: 'project', in: 'query' } }),
});

/** Mirrors dashboard/src/lib/api.ts WeekInfo (also used by reflect.ts's /weeks). */
export const PersonalityWeekInfoSchema = z
  .object({
    week: z.string(),
    sessionCount: z.number(),
    hasSnapshot: z.boolean(),
    generatedAt: z.string().nullable(),
  })
  .openapi('PersonalityWeekInfo');

export const PersonalityWeeksResponseSchema = z
  .object({
    weeks: z.array(PersonalityWeekInfoSchema),
  })
  .openapi('PersonalityWeeksResponse');
