import { describe, it, expect } from 'vitest';
import {
  computePersonalityProfile,
  PERSONALITY_ANALYSIS_VERSION,
  type PersonalityFacetInput,
  type PersonalityInsightInput,
} from '../personality.js';
import type { FrictionPoint, EffectivePattern, PersonalityTrait } from '../../types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function fp(overrides: Partial<FrictionPoint> = {}): FrictionPoint {
  return {
    category: 'wrong-approach',
    description: 'test friction',
    severity: 'medium',
    resolution: 'resolved',
    ...overrides,
  };
}

function ep(overrides: Partial<EffectivePattern> = {}): EffectivePattern {
  return {
    category: 'structured-planning',
    description: 'test pattern',
    confidence: 80,
    ...overrides,
  };
}

function facet(overrides: Partial<PersonalityFacetInput> = {}): PersonalityFacetInput {
  return {
    sessionId: 'session-1',
    hadCourseCorrection: false,
    iterationCount: 2,
    frictionPoints: [],
    effectivePatterns: [],
    sessionCharacter: 'feature_build',
    messageCount: 20,
    ...overrides,
  };
}

function trait(traits: PersonalityTrait[], key: string): PersonalityTrait {
  const t = traits.find(t => t.key === key);
  if (!t) throw new Error(`trait ${key} not found`);
  return t;
}

// ── Happy path: realistic mixed facets ─────────────────────────────────────────

describe('computePersonalityProfile — happy path', () => {
  it('scores all traits from a realistic mixed dataset', () => {
    const facets: PersonalityFacetInput[] = [
      facet({
        sessionId: 's1',
        hadCourseCorrection: false,
        iterationCount: 1,
        frictionPoints: [fp({ resolution: 'resolved' })],
        effectivePatterns: [ep({ confidence: 90 }), ep({ confidence: 70 })],
        sessionCharacter: 'feature_build',
        messageCount: 30,
      }),
      facet({
        sessionId: 's2',
        hadCourseCorrection: true,
        iterationCount: 4,
        frictionPoints: [fp({ resolution: 'workaround' }), fp({ resolution: 'unresolved' })],
        effectivePatterns: [ep({ confidence: 60 })],
        sessionCharacter: 'exploration',
        messageCount: 15,
      }),
      facet({
        sessionId: 's3',
        hadCourseCorrection: false,
        iterationCount: 0,
        frictionPoints: [fp({ resolution: 'resolved' })],
        effectivePatterns: [],
        sessionCharacter: 'bug_hunt',
        messageCount: 50,
      }),
    ];

    const insights: PersonalityInsightInput[] = [
      {
        sessionId: 's1',
        dimensionScores: {
          context_provision: 80,
          request_specificity: 70,
          scope_management: 90,
          information_timing: 60,
          correction_quality: 100,
        },
      },
      {
        sessionId: 's2',
        dimensionScores: {
          context_provision: 40,
          request_specificity: 50,
          scope_management: 30,
          information_timing: 20,
          correction_quality: 10,
        },
      },
    ];

    const profile = computePersonalityProfile(facets, insights, '2026-W29', '__all__');

    expect(profile.profileVersion).toBe(1);
    expect(profile.analysisVersion).toBe(PERSONALITY_ANALYSIS_VERSION);
    expect(profile.period).toBe('2026-W29');
    expect(profile.projectId).toBe('__all__');
    expect(profile.sessionCount).toBe(3);
    expect(profile.facetCount).toBe(3);

    // Precision: mean of 10 dimension values = (80+70+90+60+100+40+50+30+20+10)/10 = 55
    const precision = trait(profile.traits, 'precision');
    expect(precision.score).toBe(55);
    expect(precision.sampleSize).toBe(2);

    // Resilience: 2 resolved out of 4 total friction points = 50%
    const resilience = trait(profile.traits, 'resilience');
    expect(resilience.score).toBe(50);
    expect(resilience.sampleSize).toBe(4);

    // Autonomy: 1 of 3 sessions had a course correction -> 100 - 100/3 = 67 (rounded)
    const autonomy = trait(profile.traits, 'autonomy');
    expect(autonomy.score).toBe(67);
    expect(autonomy.sampleSize).toBe(3);

    // Craft: mean confidence across 3 pattern instances = (90+70+60)/3 = 73.33 -> 73
    const craft = trait(profile.traits, 'craft');
    expect(craft.score).toBe(73);
    expect(craft.sampleSize).toBe(3);

    // Axis: 1 executor (feature_build), 1 explorer (exploration), 1 neutral (bug_hunt)
    // -> (1-1)/3 * 100 = 0 (balanced)
    expect(profile.axis.value).toBe(0);
    expect(profile.axis.sampleSize).toBe(3);

    // Pace: some non-null value derived from iteration/message ratio
    expect(profile.pace.value).not.toBeNull();
    expect(profile.pace.sampleSize).toBe(3);

    expect(profile.archetype).toBeUndefined();
  });
});

// ── Zero-friction edge case ─────────────────────────────────────────────────────

describe('computePersonalityProfile — zero friction points', () => {
  it('returns null Resilience (not divide-by-zero) when no friction points exist', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ frictionPoints: [], effectivePatterns: [ep()] }),
      facet({ frictionPoints: [], effectivePatterns: [ep()] }),
    ];

    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    const resilience = trait(profile.traits, 'resilience');

    expect(resilience.score).toBeNull();
    expect(resilience.sampleSize).toBe(0);
    expect(resilience.band).toBeUndefined();
  });
});

// ── Empty dataset edge case ──────────────────────────────────────────────────────

describe('computePersonalityProfile — empty dataset', () => {
  it('returns all traits null and sessionCount 0 for no facets/insights', () => {
    const profile = computePersonalityProfile([], [], '2026-W29', '__all__');

    expect(profile.sessionCount).toBe(0);
    expect(profile.facetCount).toBe(0);
    for (const t of profile.traits) {
      expect(t.score).toBeNull();
      expect(t.sampleSize).toBe(0);
    }
    expect(profile.axis.value).toBeNull();
    expect(profile.axis.sampleSize).toBe(0);
    expect(profile.pace.value).toBeNull();
    expect(profile.pace.sampleSize).toBe(0);
  });
});

// ── Bipolar axis extremes + balance ─────────────────────────────────────────────

describe('computePersonalityProfile — explorer/executor axis', () => {
  it('is -100 when every session is exploration/learning', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ sessionCharacter: 'exploration' }),
      facet({ sessionCharacter: 'learning' }),
      facet({ sessionCharacter: 'exploration' }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.axis.value).toBe(-100);
    expect(profile.axis.sampleSize).toBe(3);
  });

  it('is +100 when every session is feature_build/quick_task', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ sessionCharacter: 'feature_build' }),
      facet({ sessionCharacter: 'quick_task' }),
      facet({ sessionCharacter: 'feature_build' }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.axis.value).toBe(100);
    expect(profile.axis.sampleSize).toBe(3);
  });

  it('is 0 (balanced) with equal explorer/executor weight', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ sessionCharacter: 'exploration' }),
      facet({ sessionCharacter: 'feature_build' }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.axis.value).toBe(0);
    expect(profile.axis.sampleSize).toBe(2);
  });

  it('is 0 (balanced) when every session is a neutral character', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ sessionCharacter: 'bug_hunt' }),
      facet({ sessionCharacter: 'deep_focus' }),
      facet({ sessionCharacter: 'refactor' }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.axis.value).toBe(0);
    expect(profile.axis.sampleSize).toBe(3);
  });

  it('is null with sampleSize 0 when no session has a character classification', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ sessionCharacter: null }),
      facet({ sessionCharacter: null }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.axis.value).toBeNull();
    expect(profile.axis.sampleSize).toBe(0);
  });
});

// ── Autonomy edge case: zero sessions handled by empty-dataset test above ──────
// ── Pace: zero-message-count sessions excluded from the sample ─────────────────

describe('computePersonalityProfile — pace', () => {
  it('excludes sessions with zero message count from the sample', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ messageCount: 0, iterationCount: 3 }),
      facet({ messageCount: 40, iterationCount: 4 }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.pace.sampleSize).toBe(1);
    expect(profile.pace.value).not.toBeNull();
  });
});
