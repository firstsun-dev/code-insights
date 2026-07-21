// Personality Analysis — deterministic rule-scoring module.
//
// Single source of truth for computing a PersonalityProfile from session facets +
// insights. Both the CLI (future `code-insights personality` command, if added) and
// the server route (server/src/routes/personality.ts) import this module — no
// reimplementation of scoring logic in either caller.
//
// The LLM is used ONLY for the optional `archetype` prose (see server/src/llm/
// reflect-prompts.ts generatePersonalityPrompt). Every numeric field on
// PersonalityProfile produced here is deterministic and reproducible from the same
// inputs — the LLM never contributes a number to this profile.

import type {
  FrictionPoint,
  EffectivePattern,
  PersonalityProfile,
  PersonalityTrait,
  PersonalityTraitKey,
  PersonalityBipolarAxis,
  PersonalityPace,
} from '../types.js';

/** Formula version for the deterministic scoring below. Bump when any formula changes
 * so cached personality_snapshots rows can be identified as stale by consumers that care. */
export const PERSONALITY_ANALYSIS_VERSION = '1.0.0';

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

function bandFor(score: number): 'low' | 'moderate' | 'high' {
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

  return {
    profileVersion: 1,
    traits,
    axis,
    pace,
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
