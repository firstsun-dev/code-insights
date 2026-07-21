import { describe, it, expect, vi } from 'vitest';
import type { LLMClient, LLMMessage, ChatOptions, LLMResponse } from './types.js';
import type { PersonalityFacetInput } from './personality.js';
import { scoreCognitiveFunctionsByLlmVote, clampVoteRounds } from './personality-vote.js';

function ep(category: string, description = 'observed pattern') {
  return { category, description, confidence: 90 };
}

function facet(effectivePatterns: ReturnType<typeof ep>[]): PersonalityFacetInput {
  return {
    sessionId: 'sess-1',
    hadCourseCorrection: false,
    iterationCount: 1,
    frictionPoints: [],
    effectivePatterns,
    sessionCharacter: 'feature_build',
    messageCount: 20,
  };
}

function jsonResponse(scores: Record<string, number>): LLMResponse {
  return { content: `<json>${JSON.stringify(scores)}</json>` };
}

function fakeClient(chatImpl: (messages: LLMMessage[], options?: ChatOptions) => Promise<LLMResponse>): LLMClient {
  return {
    provider: 'test',
    model: 'test-model',
    chat: vi.fn(chatImpl),
    estimateTokens: (text: string) => Math.ceil(text.length / 4),
  };
}

describe('clampVoteRounds', () => {
  it('defaults to 3 for undefined/non-finite input', () => {
    expect(clampVoteRounds(undefined)).toBe(3);
    expect(clampVoteRounds(NaN)).toBe(3);
  });

  it('clamps to [1, 7]', () => {
    expect(clampVoteRounds(0)).toBe(1);
    expect(clampVoteRounds(-5)).toBe(1);
    expect(clampVoteRounds(20)).toBe(7);
    expect(clampVoteRounds(5)).toBe(5);
  });
});

describe('scoreCognitiveFunctionsByLlmVote', () => {
  it('returns all-null functions with zero sampleSize when there are no effective patterns', async () => {
    const client = fakeClient(async () => jsonResponse({}));
    const result = await scoreCognitiveFunctionsByLlmVote([facet([])], client, 3);

    expect(client.chat).not.toHaveBeenCalled();
    for (const f of result) {
      expect(f.score).toBeNull();
      expect(f.sampleSize).toBe(0);
    }
  });

  it('averages scores across rounds for functions with observed evidence', async () => {
    let call = 0;
    const roundScores = [
      { ni: 80, ne: 20, si: 20, se: 20, ti: 20, te: 20, fi: 20, fe: 20 },
      { ni: 90, ne: 10, si: 10, se: 10, ti: 10, te: 10, fi: 10, fe: 10 },
      { ni: 70, ne: 30, si: 30, se: 30, ti: 30, te: 30, fi: 30, fe: 30 },
    ];
    const client = fakeClient(async () => jsonResponse(roundScores[call++]));

    const facets = [facet([ep('structured-planning'), ep('context-gathering')])];
    const result = await scoreCognitiveFunctionsByLlmVote(facets, client, 3);

    expect(client.chat).toHaveBeenCalledTimes(3);
    const ni = result.find(f => f.key === 'ni')!;
    // (80+90+70)/3 = 80
    expect(ni.score).toBe(80);
    expect(ni.sampleSize).toBe(1); // 1 structured-planning instance in evidence
  });

  it('forces null for a function with zero observed evidence, even if the LLM scored it', async () => {
    // The LLM is instructed not to do this, but the aggregator must not trust it blindly —
    // "no evidence" must stay null, matching the deterministic formula's convention.
    const client = fakeClient(async () => jsonResponse({ ni: 80, fe: 55 }));
    const facets = [facet([ep('structured-planning')])]; // only ni has evidence
    const result = await scoreCognitiveFunctionsByLlmVote(facets, client, 1);

    const fe = result.find(f => f.key === 'fe')!;
    expect(fe.score).toBeNull();
    expect(fe.sampleSize).toBe(0);

    const ni = result.find(f => f.key === 'ni')!;
    expect(ni.score).toBe(80);
  });

  it('drops unparseable rounds and still averages the ones that succeeded', async () => {
    let call = 0;
    const responses: LLMResponse[] = [
      { content: 'not json at all' },
      jsonResponse({ ni: 60 }),
      jsonResponse({ ni: 100 }),
    ];
    const client = fakeClient(async () => responses[call++]);
    const facets = [facet([ep('structured-planning')])];
    const result = await scoreCognitiveFunctionsByLlmVote(facets, client, 3);

    const ni = result.find(f => f.key === 'ni')!;
    expect(ni.score).toBe(80); // (60+100)/2, the malformed round is dropped
  });

  it('falls back to all-null when every round fails or is unparseable', async () => {
    const client = fakeClient(async () => {
      throw new Error('LLM unavailable');
    });
    const facets = [facet([ep('structured-planning')])];
    const result = await scoreCognitiveFunctionsByLlmVote(facets, client, 2);

    for (const f of result) {
      expect(f.score).toBeNull();
    }
    const ni = result.find(f => f.key === 'ni')!;
    expect(ni.sampleSize).toBe(1); // evidence count is still reported even with no votes
  });

  it('clamps out-of-range scores from the LLM to [0, 100]', async () => {
    const client = fakeClient(async () => jsonResponse({ ni: 150, ne: -20 }));
    const facets = [facet([ep('structured-planning'), ep('context-gathering')])];
    const result = await scoreCognitiveFunctionsByLlmVote(facets, client, 1);

    expect(result.find(f => f.key === 'ni')!.score).toBe(100);
    expect(result.find(f => f.key === 'ne')!.score).toBe(0);
  });
});
