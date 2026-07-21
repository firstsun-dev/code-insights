import { describe, it, expect } from 'vitest';
import {
  computePersonalityProfile,
  deriveMbti,
  PERSONALITY_ANALYSIS_VERSION,
  type PersonalityFacetInput,
  type PersonalityInsightInput,
} from '../personality.js';
import type {
  FrictionPoint,
  EffectivePattern,
  PersonalityTrait,
  CognitiveFunctionScore,
  CognitiveFunctionKey,
} from '../../types.js';

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

function cogFn(traits: CognitiveFunctionScore[], key: string): CognitiveFunctionScore {
  const t = traits.find(t => t.key === key);
  if (!t) throw new Error(`cognitive function ${key} not found`);
  return t;
}

/** Build a full 8-entry CognitiveFunctionScore[] (stable order) from a partial score map,
 * with unspecified functions defaulting to null/0 — mirrors computeCognitiveFunctions'
 * null-handling for absent categories, used to unit-test deriveMbti in isolation. */
function cogFns(scores: Partial<Record<CognitiveFunctionKey, number>>): CognitiveFunctionScore[] {
  const order: CognitiveFunctionKey[] = ['ni', 'ne', 'si', 'se', 'ti', 'te', 'fi', 'fe'];
  return order.map(key => {
    const score = scores[key];
    if (score === undefined) return { key, score: null, sampleSize: 0 };
    return { key, score, sampleSize: 1 };
  });
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

    expect(profile.profileVersion).toBe(2);
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

// ── Cognitive functions ──────────────────────────────────────────────────────

const PATTERN_TO_FUNCTION: Record<string, string> = {
  'structured-planning': 'ni',
  'context-gathering': 'ne',
  'domain-expertise': 'si',
  'incremental-implementation': 'se',
  'systematic-debugging': 'ti',
  'verification-workflow': 'te',
  'self-correction': 'fi',
  'effective-tooling': 'fe',
};

describe('computePersonalityProfile — cognitive functions', () => {
  it('scores each function by its relative share of pattern instances, not mean confidence', () => {
    // 8 instances total: ni gets 2 (2x the 1/8 "fair share" -> capped at 100), six other
    // functions get exactly 1 each (exactly fair share -> 50/moderate), fe gets 0 (-> null).
    // Confidence is deliberately uniform (all 80) to prove the score no longer tracks it —
    // this is the fix for the old formula's "everything lands >=65 because confidence has a
    // 70 floor" bug (see computeCognitiveFunctions' doc comment in ../personality.ts).
    const facets: PersonalityFacetInput[] = [
      facet({
        effectivePatterns: [
          ep({ category: 'structured-planning', confidence: 80 }), // ni
          ep({ category: 'structured-planning', confidence: 80 }), // ni (2nd instance)
          ep({ category: 'context-gathering', confidence: 80 }),   // ne
          ep({ category: 'domain-expertise', confidence: 80 }),    // si
          ep({ category: 'incremental-implementation', confidence: 80 }), // se
          ep({ category: 'systematic-debugging', confidence: 80 }), // ti
          ep({ category: 'verification-workflow', confidence: 80 }), // te
          ep({ category: 'self-correction', confidence: 80 }),      // fi
          // effective-tooling (fe) deliberately absent
        ],
      }),
    ];

    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.cognitiveFunctions).toHaveLength(8);
    // Stable order check
    expect(profile.cognitiveFunctions.map(f => f.key)).toEqual(['ni', 'ne', 'si', 'se', 'ti', 'te', 'fi', 'fe']);

    expect(cogFn(profile.cognitiveFunctions, 'ni').score).toBe(100);
    expect(cogFn(profile.cognitiveFunctions, 'ni').sampleSize).toBe(2);
    for (const key of ['ne', 'si', 'se', 'ti', 'te', 'fi']) {
      expect(cogFn(profile.cognitiveFunctions, key).score).toBe(50);
      expect(cogFn(profile.cognitiveFunctions, key).sampleSize).toBe(1);
    }

    const fe = cogFn(profile.cognitiveFunctions, 'fe');
    expect(fe.score).toBeNull();
    expect(fe.sampleSize).toBe(0);
    expect(fe.band).toBeUndefined();
  });

  it('differentiates functions purely by relative frequency even when confidence is identical', () => {
    // se: 2 instances, fi: 1 instance, plus 6 one-off fillers spread across the other
    // categories so neither se nor fi's share hits the 2x-fair-share cap (which would make
    // both saturate at 100 and hide the ordering this test is checking for).
    const facets: PersonalityFacetInput[] = [
      facet({
        effectivePatterns: [
          ep({ category: 'incremental-implementation', confidence: 95 }), // se
          ep({ category: 'incremental-implementation', confidence: 95 }), // se
          ep({ category: 'self-correction', confidence: 95 }),            // fi
          ep({ category: 'structured-planning', confidence: 95 }),        // ni filler
          ep({ category: 'context-gathering', confidence: 95 }),          // ne filler
          ep({ category: 'domain-expertise', confidence: 95 }),           // si filler
          ep({ category: 'systematic-debugging', confidence: 95 }),       // ti filler
          ep({ category: 'verification-workflow', confidence: 95 }),      // te filler
          ep({ category: 'effective-tooling', confidence: 95 }),          // fe filler
        ],
      }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    const se = cogFn(profile.cognitiveFunctions, 'se');
    const fi = cogFn(profile.cognitiveFunctions, 'fi');
    expect(se.score).not.toBeNull();
    expect(fi.score).not.toBeNull();
    expect(se.score!).toBeGreaterThan(fi.score!);
  });

  it('is null with sampleSize 0 for a function whose category has zero pattern instances', () => {
    const facets: PersonalityFacetInput[] = [
      facet({ effectivePatterns: [ep({ category: 'structured-planning', confidence: 80 })] }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    const fe = cogFn(profile.cognitiveFunctions, 'fe');
    expect(fe.score).toBeNull();
    expect(fe.sampleSize).toBe(0);
    expect(fe.band).toBeUndefined();
  });

  it('scores an isolated single-category sample at 100 — its entire share of the total', () => {
    for (const [category, fn] of Object.entries(PATTERN_TO_FUNCTION)) {
      const facets: PersonalityFacetInput[] = [
        facet({ effectivePatterns: [ep({ category, confidence: 88 })] }),
      ];
      const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
      expect(cogFn(profile.cognitiveFunctions, fn).score).toBe(100);
    }
  });

  it('returns all-null functions when there are zero effective pattern instances', () => {
    const facets: PersonalityFacetInput[] = [facet({ effectivePatterns: [] })];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    for (const f of profile.cognitiveFunctions) {
      expect(f.score).toBeNull();
      expect(f.sampleSize).toBe(0);
    }
  });

  it('sets cognitiveFunctionScoringMode to formula (the only mode this pure function knows about)', () => {
    const profile = computePersonalityProfile([facet()], [], '2026-W29', '__all__');
    expect(profile.cognitiveFunctionScoringMode).toBe('formula');
  });
});

// ── MBTI derivation ──────────────────────────────────────────────────────────

describe('deriveMbti', () => {
  it('returns a null profile with fewer than 2 non-null function scores', () => {
    expect(deriveMbti(cogFns({}))).toEqual({ type: null, functionStack: null, confidence: null });
    expect(deriveMbti(cogFns({ ni: 80 }))).toEqual({ type: null, functionStack: null, confidence: null });
  });

  it('derives INTJ from dominant Ni with higher Te than Fe', () => {
    const result = deriveMbti(cogFns({ ni: 90, te: 70, fe: 40 }));
    expect(result.type).toBe('INTJ');
    expect(result.functionStack).toEqual(['ni', 'te', 'fi', 'se']);
    expect(result.confidence).not.toBeNull();
  });

  it('derives INFJ from dominant Ni with higher Fe than Te', () => {
    const result = deriveMbti(cogFns({ ni: 90, fe: 70, te: 40 }));
    expect(result.type).toBe('INFJ');
    expect(result.functionStack).toEqual(['ni', 'fe', 'ti', 'se']);
  });

  it('derives ESFP from dominant Se with higher Fi than Ti', () => {
    const result = deriveMbti(cogFns({ se: 95, fi: 60, ti: 30 }));
    expect(result.type).toBe('ESFP');
    expect(result.functionStack).toEqual(['se', 'fi', 'te', 'ni']);
  });

  it('derives ESTP from dominant Se with higher Ti than Fi', () => {
    const result = deriveMbti(cogFns({ se: 95, ti: 60, fi: 30 }));
    expect(result.type).toBe('ESTP');
    expect(result.functionStack).toEqual(['se', 'ti', 'fe', 'ni']);
  });

  it('breaks an exact auxiliary tie deterministically by lexicographically first type', () => {
    // Dominant ni, candidates INTJ (aux te) vs INFJ (aux fe) — tie both at 50.
    const result = deriveMbti(cogFns({ ni: 90, te: 50, fe: 50 }));
    // 'INFJ' < 'INTJ' lexicographically
    expect(result.type).toBe('INFJ');
    expect(result.functionStack).toEqual(['ni', 'fe', 'ti', 'se']);
  });

  it('breaks a tie deterministically when both auxiliary candidates are entirely absent (null)', () => {
    // Only ni has a score; but we need >=2 non-null to derive at all, so add a
    // non-competing function (si) with a low score that isn't an auxiliary candidate
    // for either INTJ or INFJ, leaving te/fe both unobserved (-Infinity vs -Infinity).
    const result = deriveMbti(cogFns({ ni: 90, si: 10 }));
    expect(result.type).toBe('INFJ');
    expect(result.functionStack).toEqual(['ni', 'fe', 'ti', 'se']);
  });

  it('is consistent across repeated calls with identical input (deterministic)', () => {
    const input = cogFns({ ni: 90, te: 50, fe: 50 });
    const first = deriveMbti(input);
    const second = deriveMbti(input);
    expect(second).toEqual(first);
  });
});

describe('computePersonalityProfile — profileVersion + mbti wiring', () => {
  it('sets profileVersion 2 and includes cognitiveFunctions + mbti', () => {
    const facets: PersonalityFacetInput[] = [
      facet({
        effectivePatterns: [
          ep({ category: 'structured-planning', confidence: 90 }),
          ep({ category: 'verification-workflow', confidence: 70 }),
        ],
      }),
    ];
    const profile = computePersonalityProfile(facets, [], '2026-W29', '__all__');
    expect(profile.profileVersion).toBe(2);
    expect(profile.cognitiveFunctions.map(f => f.key)).toEqual(['ni', 'ne', 'si', 'se', 'ti', 'te', 'fi', 'fe']);
    expect(profile.mbti.type).toBe('INTJ');
    expect(profile.mbti.functionStack).toEqual(['ni', 'te', 'fi', 'se']);
  });
});
