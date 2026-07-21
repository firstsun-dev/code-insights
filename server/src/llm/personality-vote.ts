// LLM-vote alternative to the deterministic relative-frequency formula in
// cli/src/analysis/personality.ts computeCognitiveFunctions. Opt-in via
// dashboard.analysis.personality.cognitiveFunctionScoring === 'llm-vote' in config.json —
// see server/src/routes/personality.ts POST /generate for how the mode is selected.
import { jsonrepair } from 'jsonrepair';
import type { CognitiveFunctionKey, CognitiveFunctionScore } from '@code-insights/cli/types';
import type { LLMClient } from './types.js';
import { extractJsonPayload } from './response-parsers.js';
import { COGNITIVE_FUNCTION_VOTE_SYSTEM_PROMPT, generateCognitiveFunctionVotePrompt } from './reflect-prompts.js';
import { EFFECTIVE_PATTERN_TO_FUNCTION, COGNITIVE_FUNCTION_ORDER, bandFor, type PersonalityFacetInput } from './personality.js';

const MAX_EXAMPLES_PER_FUNCTION = 3;
const EXAMPLE_MAX_CHARS = 100;

export const LLM_VOTE_ROUNDS_MIN = 1;
export const LLM_VOTE_ROUNDS_MAX = 7;
export const LLM_VOTE_ROUNDS_DEFAULT = 3;

/** Clamp a user-configured round count (dashboard.analysis.personality.llmVoteRounds)
 * into a sane range — an unbounded value would mean an unbounded number of LLM calls
 * per POST /generate. Falls back to the default for anything non-numeric. */
export function clampVoteRounds(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return LLM_VOTE_ROUNDS_DEFAULT;
  return Math.min(LLM_VOTE_ROUNDS_MAX, Math.max(LLM_VOTE_ROUNDS_MIN, Math.round(raw)));
}

interface FunctionEvidence {
  key: CognitiveFunctionKey;
  count: number;
  examples: string[];
}

/** Same counting pass as computeCognitiveFunctions, but keeps a few example descriptions
 * per function too, since the LLM (unlike the formula) can use qualitative evidence, not
 * just counts. */
function buildEvidence(facets: PersonalityFacetInput[]): { evidence: FunctionEvidence[]; totalCount: number } {
  const byFunction = new Map<CognitiveFunctionKey, { count: number; examples: string[] }>();
  for (const key of COGNITIVE_FUNCTION_ORDER) byFunction.set(key, { count: 0, examples: [] });

  let totalCount = 0;
  for (const facet of facets) {
    for (const ep of facet.effectivePatterns) {
      const fn = EFFECTIVE_PATTERN_TO_FUNCTION[ep.category];
      if (!fn) continue;
      const entry = byFunction.get(fn)!;
      entry.count++;
      totalCount++;
      if (entry.examples.length < MAX_EXAMPLES_PER_FUNCTION && ep.description) {
        entry.examples.push(ep.description.slice(0, EXAMPLE_MAX_CHARS));
      }
    }
  }

  const evidence = COGNITIVE_FUNCTION_ORDER.map(key => ({ key, ...byFunction.get(key)! }));
  return { evidence, totalCount };
}

function parseVoteRound(content: string): Partial<Record<CognitiveFunctionKey, number>> | null {
  const payload = extractJsonPayload(content);
  if (!payload) return null;

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    try {
      parsed = JSON.parse(jsonrepair(payload)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (!parsed) return null;

  const result: Partial<Record<CognitiveFunctionKey, number>> = {};
  for (const key of COGNITIVE_FUNCTION_ORDER) {
    const raw = parsed[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[key] = Math.round(Math.max(0, Math.min(100, raw)));
    }
  }
  return result;
}

/**
 * Score all 8 cognitive functions by calling the LLM `rounds` independent times with the
 * same evidence summary (pattern counts + example descriptions per function) and averaging
 * each function's score across the rounds that returned a valid number for it. Returns the
 * same CognitiveFunctionScore[] shape the deterministic formula produces, so deriveMbti()
 * and every downstream consumer (radar chart, MbtiCard, narrative prompt) work unmodified
 * regardless of which mode ran.
 *
 * Rounds run in parallel (Promise.allSettled) — a failed call or unparseable response is
 * dropped, not retried. A function with zero observed pattern instances is forced to null
 * regardless of what any round said for it — "no signal" must stay null (same convention
 * the deterministic formula uses), not become an LLM-fabricated guess. If every round fails
 * outright, every function falls back to null too, rather than throwing — callers should
 * treat that as "vote scoring unavailable this time" and keep the formula-computed profile.
 */
export async function scoreCognitiveFunctionsByLlmVote(
  facets: PersonalityFacetInput[],
  client: LLMClient,
  rounds: number,
  signal?: AbortSignal,
): Promise<CognitiveFunctionScore[]> {
  const { evidence, totalCount } = buildEvidence(facets);

  if (totalCount === 0) {
    return COGNITIVE_FUNCTION_ORDER.map(key => ({ key, score: null, sampleSize: 0 }));
  }

  const prompt = generateCognitiveFunctionVotePrompt(
    evidence.map(e => ({ key: e.key, count: e.count, totalCount, examples: e.examples })),
  );

  const attempts = await Promise.allSettled(
    Array.from({ length: rounds }, () =>
      client.chat(
        [
          { role: 'system', content: COGNITIVE_FUNCTION_VOTE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { signal, temperature: 0.7 },
      ),
    ),
  );

  const sums = new Map<CognitiveFunctionKey, number>();
  const votes = new Map<CognitiveFunctionKey, number>();

  for (const attempt of attempts) {
    if (attempt.status !== 'fulfilled') continue;
    const parsed = parseVoteRound(attempt.value.content);
    if (!parsed) continue;
    for (const key of COGNITIVE_FUNCTION_ORDER) {
      const value = parsed[key];
      if (typeof value !== 'number') continue;
      sums.set(key, (sums.get(key) ?? 0) + value);
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }
  }

  const evidenceCountByKey = new Map(evidence.map(e => [e.key, e.count]));

  return COGNITIVE_FUNCTION_ORDER.map(key => {
    const sampleSize = evidenceCountByKey.get(key) ?? 0;
    const voteCount = votes.get(key) ?? 0;
    if (sampleSize === 0 || voteCount === 0) {
      return { key, score: null, sampleSize };
    }
    const score = Math.round((sums.get(key) ?? 0) / voteCount);
    return { key, score, band: bandFor(score), sampleSize };
  });
}
