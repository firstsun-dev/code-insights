// Personality Analysis — deterministic rule-scoring module.
//
// Single source of truth for computing a PersonalityProfile from session facets +
// insights. Both the CLI (future `code-insights personality` command, if added) and
// the server route (server/src/routes/personality.ts) import this module — no
// reimplementation of scoring logic in either caller.
//
// Every numeric field THIS MODULE produces is deterministic and reproducible from the
// same inputs — this file itself never calls an LLM. Two callers layer optional
// LLM-authored numbers on top of what this module computes, both in server/src/llm/:
//   - reflect-prompts.ts generatePersonalityPrompt: the `archetype` prose plus
//     `mbti.topCandidates[].likelihood`, a top-5 ranked MBTI guess.
//   - personality-vote.ts scoreCognitiveFunctionsByLlmVote: an OPT-IN alternative to
//     computeCognitiveFunctions below, gated on dashboard.analysis.personality.
//     cognitiveFunctionScoring === 'llm-vote' in config.json. When active, it replaces
//     `cognitiveFunctions` (and therefore `mbti`, re-derived from those scores) with the
//     average of N independent LLM scoring rounds instead of the formula in this file —
//     see PersonalityProfile.cognitiveFunctionScoringMode, which records which path ran.
//     computePersonalityProfile below always returns the deterministic 'formula' scores;
//     only the server route (POST /generate) can override them post hoc.

import type {
  FrictionPoint,
  EffectivePattern,
  PersonalityProfile,
  PersonalityTrait,
  PersonalityTraitKey,
  PersonalityBipolarAxis,
  PersonalityPace,
  CognitiveFunctionKey,
  CognitiveFunctionScore,
  MBTIType,
  MBTIProfile,
} from '../types.js';

/** Formula version for the deterministic scoring below. Bump when any formula changes
 * so cached personality_snapshots rows can be identified as stale by consumers that care.
 * Bumped to 2.0.0 for the cognitiveFunctions + mbti addition (profileVersion 2).
 * Bumped to 2.1.0 when computeCognitiveFunctions switched from mean-confidence to
 * relative-frequency-share scoring (see that function's doc comment) — readSnapshot in
 * server/src/routes/personality.ts treats any cached row below this version as stale so
 * old confidence-scored rows get recomputed instead of served forever. */
export const PERSONALITY_ANALYSIS_VERSION = '2.1.0';

/**
 * Per-session facet input. Deliberately a flattened, caller-friendly shape rather than
 * the raw session_facets SQLite row (which stores friction_points/effective_patterns as
 * JSON strings) — callers (the server route) parse JSON and join in session_character +
 * message_count from the sessions table before calling computePersonalityProfile. This
 * keeps this module pure and trivially testable with plain objects.
 */
export interface PersonalityFacetInput {
  sessionId: string;
  hadCourseCorrection: boolean;
  iterationCount: number;
  frictionPoints: FrictionPoint[];
  effectivePatterns: EffectivePattern[];
  /** sessions.session_character for this session; null if not yet classified. */
  sessionCharacter: string | null;
  /** sessions.message_count for this session — denominator for the Pace formula. */
  messageCount: number;
}

/**
 * Per-insight input, scoped to what Precision needs. Only prompt_quality insights
 * carry dimension_scores — insights of other types should be passed with
 * dimensionScores omitted/null (or simply excluded by the caller before invoking).
 */
export interface PersonalityInsightInput {
  sessionId: string;
  dimensionScores?: {
    context_provision: number;
    request_specificity: number;
    scope_management: number;
    information_timing: number;
    correction_quality: number;
  } | null;
}

const DIMENSION_KEYS = [
  'context_provision',
  'request_specificity',
  'scope_management',
  'information_timing',
  'correction_quality',
] as const;

// Character buckets for the Explorer<->Executor bipolar axis.
// exploration/learning pull toward Explorer (-100); feature_build/quick_task pull
// toward Executor (+100); bug_hunt/deep_focus/refactor are treated as neutral —
// excluded from the numerator but counted in sampleSize (the denominator) so a
// session-mix dominated by neutral characters still shows as "Balanced" (0) rather
// than being excluded from the axis's sample entirely.
const EXPLORER_CHARACTERS = new Set(['exploration', 'learning']);
const EXECUTOR_CHARACTERS = new Set(['feature_build', 'quick_task']);
const NEUTRAL_CHARACTERS = new Set(['bug_hunt', 'deep_focus', 'refactor']);

/** Normalize a confidence value to a 0-100 scale. Effective pattern confidence is
 * written by the LLM analysis prompts on a 0-100 scale in practice (see cli/src/
 * analysis/prompts.ts), but this defensively rescales anything that looks like a
 * legacy 0-1 fraction so a stray old row can't silently corrupt the average. */
function normalizeConfidence(raw: number): number {
  if (raw <= 1) return raw * 100;
  return raw;
}

export function bandFor(score: number): 'low' | 'moderate' | 'high' {
  if (score >= 65) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

/**
 * Precision = mean of all 5 dimension_scores fields across prompt_quality insights in
 * scope, each dimension weighted equally, normalized to 0-100. Flat mean over every
 * individual dimension value present (not "average the 5 dims per insight, then
 * average insights") — mathematically equivalent when every insight has all 5 values,
 * but degrades gracefully if a future insight has partial dimension coverage.
 */
function computePrecision(insights: PersonalityInsightInput[]): PersonalityTrait {
  let sum = 0;
  let count = 0;
  const contributingSessions = new Set<string>();

  for (const insight of insights) {
    if (!insight.dimensionScores) continue;
    for (const key of DIMENSION_KEYS) {
      const val = insight.dimensionScores[key];
      if (typeof val === 'number' && Number.isFinite(val)) {
        sum += val;
        count++;
      }
    }
    contributingSessions.add(insight.sessionId);
  }

  if (count === 0) {
    return { key: 'precision', score: null, sampleSize: 0 };
  }

  const score = Math.round(sum / count);
  return { key: 'precision', score, band: bandFor(score), sampleSize: contributingSessions.size };
}

/**
 * Resilience = resolved / (resolved + workaround + unresolved) * 100, rounded, across
 * every friction point in scope. Zero friction points -> null score, sampleSize 0
 * (there is nothing to resolve, which is a genuinely different signal than "resolves
 * everything" — must not default to a perfect score).
 */
function computeResilience(facets: PersonalityFacetInput[]): PersonalityTrait {
  let resolved = 0;
  let total = 0;

  for (const facet of facets) {
    for (const fp of facet.frictionPoints) {
      total++;
      if (fp.resolution === 'resolved') resolved++;
    }
  }

  if (total === 0) {
    return { key: 'resilience', score: null, sampleSize: 0 };
  }

  const score = Math.round((resolved / total) * 100);
  return { key: 'resilience', score, band: bandFor(score), sampleSize: total };
}

/**
 * Autonomy = inverse of course-correction rate: 100 - (100 * sessionsWithCourseCorrection
 * / totalSessions). Fewer corrections needed -> higher autonomy. Zero sessions in scope
 * -> null.
 */
function computeAutonomy(facets: PersonalityFacetInput[]): PersonalityTrait {
  const total = facets.length;
  if (total === 0) {
    return { key: 'autonomy', score: null, sampleSize: 0 };
  }

  const withCorrection = facets.filter(f => f.hadCourseCorrection).length;
  const score = Math.round(100 - (100 * withCorrection) / total);
  return { key: 'autonomy', score, band: bandFor(score), sampleSize: total };
}

/**
 * Craft = mean confidence (normalized 0-100) across every effective pattern instance
 * in scope. Deliberately a flat mean over all pattern instances rather than a
 * per-session average — this is what "weighted by pattern count per session" means
 * operationally: a session contributing 5 high-confidence patterns pulls the score up
 * proportionally more than a session contributing 1, because it supplies 5 terms to
 * the sum instead of 1. Zero effective patterns -> null.
 */
function computeCraft(facets: PersonalityFacetInput[]): PersonalityTrait {
  let sum = 0;
  let count = 0;

  for (const facet of facets) {
    for (const ep of facet.effectivePatterns) {
      if (typeof ep.confidence !== 'number' || !Number.isFinite(ep.confidence)) continue;
      sum += normalizeConfidence(ep.confidence);
      count++;
    }
  }

  if (count === 0) {
    return { key: 'craft', score: null, sampleSize: 0 };
  }

  const score = Math.round(sum / count);
  return { key: 'craft', score, band: bandFor(score), sampleSize: count };
}

/**
 * Explorer<->Executor bipolar axis. See EXPLORER_CHARACTERS/EXECUTOR_CHARACTERS/
 * NEUTRAL_CHARACTERS above for the exact weighting formula:
 *   value = ((executorWeight - explorerWeight) / totalWeight) * 100
 * where totalWeight includes neutral characters in the denominator (sampleSize) but
 * not the numerator. This means:
 *   - 100% exploration/learning sessions -> -100
 *   - 100% feature_build/quick_task sessions -> +100
 *   - equal explorer/executor weight (regardless of neutral share) -> 0 (Balanced)
 *   - all-neutral session mix -> 0 (Balanced, by definition — no directional signal)
 */
function computeAxis(facets: PersonalityFacetInput[]): PersonalityBipolarAxis {
  let explorerWeight = 0;
  let executorWeight = 0;
  let neutralWeight = 0;

  for (const facet of facets) {
    const character = facet.sessionCharacter;
    if (!character) continue;
    if (EXPLORER_CHARACTERS.has(character)) explorerWeight++;
    else if (EXECUTOR_CHARACTERS.has(character)) executorWeight++;
    else if (NEUTRAL_CHARACTERS.has(character)) neutralWeight++;
  }

  const totalWeight = explorerWeight + executorWeight + neutralWeight;
  if (totalWeight === 0) {
    return { key: 'explorer_executor', value: null, sampleSize: 0 };
  }

  const value = Math.round(((executorWeight - explorerWeight) / totalWeight) * 100);
  return { key: 'explorer_executor', value, sampleSize: totalWeight };
}

/**
 * Pace = ratio of average iteration_count to average message_count in scope, normalized
 * to 0-100. Normalization choice (documented, not derived): iteration_count is a small
 * integer counting distinct correction/retry cycles within a session, while
 * message_count is typically one to two orders of magnitude larger — so the raw ratio
 * (iterations per message) is expected to land in [0, 1] for the overwhelming majority
 * of sessions. We use a fixed reference range of [0, 1] (min-max clamp, not
 * percentile-against-observed-data) rather than a dataset-relative percentile so a
 * single user's Pace score is stable and comparable across weeks/projects rather than
 * shifting whenever the underlying dataset changes shape.
 */
function computePace(facets: PersonalityFacetInput[]): PersonalityPace {
  const withMessages = facets.filter(f => f.messageCount > 0);
  if (withMessages.length === 0) {
    return { value: null, sampleSize: 0 };
  }

  const avgIterations = withMessages.reduce((s, f) => s + f.iterationCount, 0) / withMessages.length;
  const avgMessages = withMessages.reduce((s, f) => s + f.messageCount, 0) / withMessages.length;

  if (avgMessages === 0) {
    return { value: null, sampleSize: 0 };
  }

  const ratio = avgIterations / avgMessages;
  const clamped = Math.max(0, Math.min(1, ratio));
  const value = Math.round(clamped * 100);
  return { value, sampleSize: withMessages.length };
}

// === Cognitive functions (Jungian) + MBTI derivation ===
//
// Deliberate judgment call, same spirit as EXPLORER_CHARACTERS/EXECUTOR_CHARACTERS above:
// each of the 8 effective-pattern categories is mapped to the one Jungian cognitive
// function it most directly evidences. This is a design choice, not a derived fact —
// documented here so it can be revisited without archaeology:
//   structured-planning       -> Ni (Introverted Intuition — singular strategic foresight)
//   context-gathering         -> Ne (Extraverted Intuition — broad exploration of possibilities)
//   domain-expertise          -> Si (Introverted Sensing — internalized experience/precedent)
//   incremental-implementation -> Se (Extraverted Sensing — concrete present-moment action)
//   systematic-debugging      -> Ti (Introverted Thinking — internal logical root-cause analysis)
//   verification-workflow     -> Te (Extraverted Thinking — externally verifiable, goal-driven checking)
//   self-correction           -> Fi (Introverted Feeling — internally-driven correction against one's own standard)
//   effective-tooling         -> Fe (Extraverted Feeling — attunement to and effective use of the
//                                    external/collaborative environment)
export const EFFECTIVE_PATTERN_TO_FUNCTION: Record<string, CognitiveFunctionKey> = {
  'structured-planning': 'ni',
  'context-gathering': 'ne',
  'domain-expertise': 'si',
  'incremental-implementation': 'se',
  'systematic-debugging': 'ti',
  'verification-workflow': 'te',
  'self-correction': 'fi',
  'effective-tooling': 'fe',
};

/** Stable, fixed display/serialization order for the 8 cognitive functions. */
export const COGNITIVE_FUNCTION_ORDER: CognitiveFunctionKey[] = ['ni', 'ne', 'si', 'se', 'ti', 'te', 'fi', 'fe'];

/**
 * One score per Jungian cognitive function: RELATIVE FREQUENCY SHARE of effective-pattern
 * instances mapped to that function (via EFFECTIVE_PATTERN_TO_FUNCTION above) — NOT mean
 * confidence, despite that being the v1 (analysisVersion 2.0.0) formula.
 *
 * Why the change: effective-pattern confidence is written by the analysis prompts with a
 * hard floor of 70 ("Require a minimum confidence score of 70 for any decision or
 * learning. Drop insights below this threshold." — cli/src/analysis/prompts.ts) and
 * clusters in 70-95 in practice. Averaging confidence therefore made every function that
 * had any samples at all land at or above 65 (the "high" band threshold from bandFor)
 * almost by construction — it measured "how sure the LLM was when it flagged an
 * instance," not "how strongly this function shows up relative to the other 7." Jungian
 * functions (and MBTI more broadly) are an ipsative/competing construct by design —
 * strength in one function implies relatively less reliance on its opposite — so a score
 * that can't differentiate across the 8 functions can't produce a meaningful profile.
 *
 * Formula: share = count(function) / totalCount(all mapped instances in scope).
 * fairShare = 1 / 8 (the uniform baseline if all 8 functions were equally represented).
 * score = round(min(100, (share / fairShare) * 50)) — a function sitting exactly at its
 * fair share scores 50 (moderate); one at 2x fair share or more scores 100 (high,
 * capped); one entirely absent relative to the total scores toward 0. This directly
 * reflects "how often this function's behavior shows up relative to the others," which
 * is the actual claim a Jungian function score makes, and — unlike mean confidence —
 * guarantees differentiation across the 8 scores whenever pattern-category usage isn't
 * perfectly uniform (the overwhelmingly common case). Zero total instances -> every
 * function null (never a fabricated midpoint); zero instances for one function specifically
 * -> null score, sampleSize 0 for that function only (same "no signal" convention as every
 * other score in this file).
 */
function computeCognitiveFunctions(facets: PersonalityFacetInput[]): CognitiveFunctionScore[] {
  const counts = new Map<CognitiveFunctionKey, number>();
  let totalCount = 0;

  for (const facet of facets) {
    for (const ep of facet.effectivePatterns) {
      const fn = EFFECTIVE_PATTERN_TO_FUNCTION[ep.category];
      if (!fn) continue; // unmapped/unknown category — not one of the 8 known effective-pattern categories
      counts.set(fn, (counts.get(fn) ?? 0) + 1);
      totalCount++;
    }
  }

  if (totalCount === 0) {
    return COGNITIVE_FUNCTION_ORDER.map(key => ({ key, score: null, sampleSize: 0 }));
  }

  const fairShare = 1 / COGNITIVE_FUNCTION_ORDER.length;
  return COGNITIVE_FUNCTION_ORDER.map(key => {
    const count = counts.get(key) ?? 0;
    if (count === 0) {
      return { key, score: null, sampleSize: 0 };
    }
    const share = count / totalCount;
    const score = Math.round(Math.min(100, (share / fairShare) * 50));
    return { key, score, band: bandFor(score), sampleSize: count };
  });
}

// Standard 16-type Jungian function-stack table: [dominant, auxiliary, tertiary, inferior].
// Well-established public typology (Myers-Briggs / Jungian cognitive function stacking),
// hardcoded rather than derived — there is no formula that produces this table, it's a
// fixed lookup by convention.
const MBTI_FUNCTION_STACKS: Record<MBTIType, [CognitiveFunctionKey, CognitiveFunctionKey, CognitiveFunctionKey, CognitiveFunctionKey]> = {
  INTJ: ['ni', 'te', 'fi', 'se'],
  INTP: ['ti', 'ne', 'si', 'fe'],
  ENTJ: ['te', 'ni', 'se', 'fi'],
  ENTP: ['ne', 'ti', 'fe', 'si'],
  INFJ: ['ni', 'fe', 'ti', 'se'],
  INFP: ['fi', 'ne', 'si', 'te'],
  ENFJ: ['fe', 'ni', 'se', 'ti'],
  ENFP: ['ne', 'fi', 'te', 'si'],
  ISTJ: ['si', 'te', 'fi', 'ne'],
  ISFJ: ['si', 'fe', 'ti', 'ne'],
  ESTJ: ['te', 'si', 'ne', 'fi'],
  ESFJ: ['fe', 'si', 'ne', 'ti'],
  ISTP: ['ti', 'se', 'ni', 'fe'],
  ISFP: ['fi', 'se', 'ni', 'te'],
  ESTP: ['se', 'ti', 'fe', 'ni'],
  ESFP: ['se', 'fi', 'te', 'ni'],
};

/**
 * Confidence band for the MBTI derivation. Deliberately NOT the same `bandFor` as trait/
 * function scores — this represents how many of the 8 cognitive functions we actually
 * observed (breadth of the picture), not a score magnitude. Judgment call on thresholds:
 * observing at least 6/8 functions (75%) is "high" confidence in the derived type, 3-5/8
 * (37.5-62.5%) is "moderate", and below that (but still >=2, the minimum to derive a type
 * at all) is "low" — mirrors the same 65/35 split used by bandFor, just applied to
 * function-coverage-count/8*100 instead of a score value.
 */
function mbtiConfidenceFor(nonNullCount: number): 'low' | 'moderate' | 'high' {
  const coveragePct = (nonNullCount / COGNITIVE_FUNCTION_ORDER.length) * 100;
  return bandFor(coveragePct);
}

/**
 * Derive an MBTI type from the 8 cognitive function scores.
 *
 * 1. Dominant = highest-scoring non-null function. Requires >=2 non-null scores (need a
 *    dominant AND an auxiliary to disambiguate a type) — otherwise returns a null profile.
 * 2. Exactly 2 of the 16 types share any given dominant function (e.g. Ni is dominant for
 *    both INTJ and INFJ) — filter MBTI_FUNCTION_STACKS down to those 2 candidates.
 * 3. Pick whichever candidate's auxiliary (stack[1]) scored higher among our computed
 *    function scores. A null score is treated as -Infinity in this comparison — a
 *    function we have zero signal for cannot win the auxiliary tie-break.
 * 4. If genuinely tied (equal, non -Infinity, auxiliary scores — including the case where
 *    both are null), break the tie by picking the lexicographically first MBTI type name.
 *    This is an arbitrary but STABLE choice: given identical input, the result is always
 *    the same, which matters for a "personality type" users will see repeatedly — an
 *    unstable tie-break would make the type flicker between two candidates run to run for
 *    no real reason.
 */
export function deriveMbti(functions: CognitiveFunctionScore[]): MBTIProfile {
  const scoreByKey = new Map<CognitiveFunctionKey, number | null>(functions.map(f => [f.key, f.score]));
  const nonNull = functions.filter(f => f.score !== null);

  if (nonNull.length < 2) {
    return { type: null, functionStack: null, confidence: null };
  }

  // Dominant = highest score; ties broken by COGNITIVE_FUNCTION_ORDER (first in fixed order wins).
  let dominant: CognitiveFunctionKey = nonNull[0].key;
  let dominantScore = nonNull[0].score as number;
  for (const f of nonNull) {
    const s = f.score as number;
    if (s > dominantScore) {
      dominant = f.key;
      dominantScore = s;
    }
  }

  const candidates = (Object.keys(MBTI_FUNCTION_STACKS) as MBTIType[])
    .filter(type => MBTI_FUNCTION_STACKS[type][0] === dominant)
    .sort(); // lexicographic order — deterministic base for the tie-break below

  const auxScore = (type: MBTIType): number => {
    const aux = MBTI_FUNCTION_STACKS[type][1];
    const s = scoreByKey.get(aux);
    return typeof s === 'number' ? s : -Infinity;
  };

  let chosen = candidates[0];
  let chosenAuxScore = auxScore(chosen);
  for (const type of candidates.slice(1)) {
    const s = auxScore(type);
    if (s > chosenAuxScore) {
      chosen = type;
      chosenAuxScore = s;
    }
    // equal (including both -Infinity) -> keep `chosen`, which is already the
    // lexicographically first candidate since `candidates` is sorted above.
  }

  return {
    type: chosen,
    functionStack: [...MBTI_FUNCTION_STACKS[chosen]],
    confidence: mbtiConfidenceFor(nonNull.length),
  };
}

/**
 * Compute a full PersonalityProfile from facets + insights already scoped to a given
 * period/project. All aggregation (filtering by period/project) happens in the caller
 * (the server route, mirroring how reflect.ts scopes data via buildWhereClause before
 * calling getAggregatedData) — this function only scores whatever it's given.
 */
export function computePersonalityProfile(
  facets: PersonalityFacetInput[],
  insights: PersonalityInsightInput[],
  period: string,
  projectId: string,
): PersonalityProfile {
  const traits: PersonalityTrait[] = [
    computePrecision(insights),
    computeResilience(facets),
    computeAutonomy(facets),
    computeCraft(facets),
  ];

  const axis = computeAxis(facets);
  const pace = computePace(facets);
  const cognitiveFunctions = computeCognitiveFunctions(facets);
  const mbti = deriveMbti(cognitiveFunctions);

  return {
    profileVersion: 2,
    traits,
    axis,
    pace,
    cognitiveFunctions,
    cognitiveFunctionScoringMode: 'formula',
    mbti,
    computedAt: new Date().toISOString(),
    analysisVersion: PERSONALITY_ANALYSIS_VERSION,
    // One session_facets row per session in scope — sessionCount and facetCount are
    // the same quantity here (unlike reflect_snapshots.facet_count, which counts total
    // friction points, not sessions — deliberately not following that precedent since
    // it reads as a misnomer there; this field means "session_facets rows contributing").
    sessionCount: facets.length,
    facetCount: facets.length,
    period,
    projectId,
  };
}

export type { PersonalityTraitKey };
