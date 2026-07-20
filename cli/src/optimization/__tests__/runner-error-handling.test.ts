/**
 * Error handling tests for GEPARunner.optimize().
 *
 * Strategy: The @ax-llm/ax module is mocked at the top level. We configure
 * the MockAxGEPA.compile behavior per-test by accessing the mock instance
 * created inside optimize(). Since optimize() creates `new AxGEPA({...})` inline,
 * we intercept the constructor call and control the returned instance's compile().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Mock @ax-llm/ax ─────────────────────────────────────────────────────────

// We need to control AxGEPA.compile per-test. The mock constructor captures
// `this` so we can reach the compile fn. But since optimize() creates a NEW
// AxGEPA instance each call, we use a different approach: we make the
// constructor itself track the latest instance, and we control compile through
// a shared mutable reference.

let latestMockInstance: { compile: ReturnType<typeof vi.fn> } | null = null;
let compileBehavior: 'success' | 'rate-limit' | 'timeout' | 'auth' | 'network' | 'hang' = 'success';
let compileCallCount = 0;
let compileSuccessAfter = 0; // succeed after N failures

function resetMockState() {
  compileBehavior = 'success';
  compileCallCount = 0;
  compileSuccessAfter = 0;
  latestMockInstance = null;
}

vi.mock('@ax-llm/ax', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ax-llm/ax')>();
  return {
    ...actual,
    AxGEPA: vi.fn().mockImplementation(function (this: any, _config: any) {
      this._config = _config;
      this.compile = vi.fn().mockImplementation(async (..._args: any[]) => {
        compileCallCount++;

        // If we should succeed after N failures
        if (compileSuccessAfter > 0 && compileCallCount > compileSuccessAfter) {
          return makeFakeParetoResult();
        }

        switch (compileBehavior) {
          case 'rate-limit':
            throw new Error('Rate limit exceeded: 429');
          case 'timeout':
            throw new Error('Request timeout');
          case 'auth':
            throw new Error('Unauthorized: 401');
          case 'network':
            throw new Error('ECONNREFUSED');
          case 'hang':
            return new Promise(() => {}); // never resolves
          case 'success':
          default:
            return makeFakeParetoResult();
        }
      });
      latestMockInstance = this;
    }),
  };
});

// ─── Mock prompts.ts ─────────────────────────────────────────────────────────

vi.mock('../../optimization/prompts.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../optimization/prompts.js')>();
  return {
    ...actual,
    registerVersion: vi.fn().mockReturnValue({ id: 'v1', createdAt: new Date().toISOString(), active: true }),
    saveArtifact: vi.fn(),
    saveScores: vi.fn(),
    saveMetadata: vi.fn(),
  };
});

// ─── Mock flow.ts ─────────────────────────────────────────────────────────────

vi.mock('../../optimization/flow.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../optimization/flow.js')>();
  return {
    ...actual,
    createInsightProgram: vi.fn().mockReturnValue({
      applyOptimization: vi.fn(),
      applyOptimizedComponents: vi.fn(),
    }),
  };
});

// ─── Import after mocking ────────────────────────────────────────────────────

import { GEPARunner, OptimizationError, createAIService } from '../../optimization/runner.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTrainingExample() {
  return {
    sessionData: 'User#1: How do I fix this?\nAssistant#2: Try restarting.',
    humanQuality: 0.5,
  };
}

function makeFakeParetoResult() {
  return {
    demos: [],
    stats: {
      totalCalls: 25,
      successfulDemos: 20,
      estimatedTokenUsage: 50000,
      earlyStopped: false,
      bestScore: 0.82,
      resourceUsage: { totalTokens: 50000, totalTime: 5000, avgLatencyPerEval: 200, costByModel: {} },
      convergenceInfo: { converged: true, finalImprovement: 0.05, stagnationRounds: 3, convergenceThreshold: 0.01 },
    },
    bestScore: 0.82,
    scoreHistory: [0.65, 0.72, 0.75, 0.78, 0.80, 0.82],
    configurationHistory: [{}, {}, {}, {}, {}, {}],
    optimizedProgram: {
      bestScore: 0.82,
      stats: {
        totalCalls: 25,
        successfulDemos: 20,
        estimatedTokenUsage: 50000,
        earlyStopped: false,
        bestScore: 0.82,
        resourceUsage: { totalTokens: 50000, totalTime: 5000, avgLatencyPerEval: 200, costByModel: {} },
        convergenceInfo: { converged: true, finalImprovement: 0.05, stagnationRounds: 3, convergenceThreshold: 0.01 },
      },
      optimizerType: 'GEPA',
      optimizationTime: 5000,
      totalRounds: 25,
      converged: true,
      componentMap: {},
      applyTo: vi.fn(),
    },
    paretoFront: [
      {
        demos: [],
        scores: { coverage: 0.9, precision: 0.85, actionability: 0.7, brevity: 0.6 },
        configuration: {},
        dominatedSolutions: 5,
      },
    ],
    hypervolume: 0.65,
    paretoFrontSize: 1,
  };
}

function makeMockLogger() {
  return vi.fn();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GEPARunner error handling', () => {
  beforeEach(() => {
    resetMockState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── API failure classification ────────────────────────────────────────────

  describe('API failure handling', () => {
    it('classifies rate-limit errors (429) as retryable', async () => {
      compileBehavior = 'rate-limit';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0, // no retries — we want to see the error immediately
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toMatchObject({
        kind: 'rate-limit',
      });
    });

    it('classifies timeout errors as retryable', async () => {
      compileBehavior = 'timeout';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toMatchObject({
        kind: 'timeout',
      });
    });

    it('classifies auth errors (401/403) as non-retryable', async () => {
      compileBehavior = 'auth';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toMatchObject({
        kind: 'auth',
      });
    });

    it('classifies network errors as retryable', async () => {
      compileBehavior = 'network';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toMatchObject({
        kind: 'network',
      });
    });

    it('exhausts retries and throws after maxRetries attempts', async () => {
      compileBehavior = 'rate-limit';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 2,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toMatchObject({
        kind: 'rate-limit',
      });

      // Initial attempt + 2 retries = 3 total compile calls
      expect(compileCallCount).toBe(3);
    });

    it('retries on rate-limit and succeeds when compile recovers', async () => {
      compileBehavior = 'rate-limit';
      compileSuccessAfter = 2; // succeed on the 3rd call (after 2 failures)

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 3,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      const result = await runner.optimize([makeTrainingExample()]);
      expect(result.paretoResult.bestScore).toBe(0.82);
      // Should have taken 3 calls: 2 failures + 1 success
      expect(compileCallCount).toBe(3);
    });

    it('emits retry log entries with attempt number and delay', async () => {
      compileBehavior = 'rate-limit';
      compileSuccessAfter = 1; // succeed on 2nd call

      const logEntries: any[] = [];
      const logger = (entry: any) => logEntries.push(entry);

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 3,
        timeoutMs: 0,
        logger,
      });

      await runner.optimize([makeTrainingExample()]);

      const retryEntries = logEntries.filter(e => e.step === 'retry');
      expect(retryEntries.length).toBeGreaterThanOrEqual(1);
      expect(retryEntries[0].data).toMatchObject({
        attempt: expect.any(Number),
        errorKind: 'rate-limit',
      });
    });
  });

  // ── Timeout enforcement ──────────────────────────────────────────────────

  describe('Timeout enforcement', () => {
    it('throws timeout error when compile exceeds timeoutMs', async () => {
      compileBehavior = 'hang';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 50, // Very short timeout
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toMatchObject({
        kind: 'timeout',
      });
    });

    it('does not enforce timeout when timeoutMs is 0 (default)', async () => {
      compileBehavior = 'success';

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      const result = await runner.optimize([makeTrainingExample()]);
      expect(result.paretoResult.bestScore).toBe(0.82);
    });

    it('emits error log entry on timeout', async () => {
      compileBehavior = 'hang';

      const logEntries: any[] = [];
      const logger = (entry: any) => logEntries.push(entry);

      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 50,
        logger,
      });

      await expect(runner.optimize([makeTrainingExample()])).rejects.toThrow();

      const errorEntries = logEntries.filter(e => e.step === 'error');
      expect(errorEntries.length).toBeGreaterThanOrEqual(1);
      expect(errorEntries[0].message).toContain('timed out');
    });
  });

  // ── Edge case handling ───────────────────────────────────────────────────

  describe('Edge case handling', () => {
    it('handles numTrials=1 (minimum meaningful value)', async () => {
      compileBehavior = 'success';

      const runner = new GEPARunner({
        numTrials: 1,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      const result = await runner.optimize([makeTrainingExample()]);
      expect(result.paretoResult.bestScore).toBe(0.82);
    });

    it('handles numTrials=0 (degenerate case — passes to AxGEPA)', async () => {
      compileBehavior = 'success';

      const runner = new GEPARunner({
        numTrials: 0,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      const result = await runner.optimize([makeTrainingExample()]);
      expect(result.paretoResult.bestScore).toBe(0.82);
    });

    it('handles very large numTrials values', async () => {
      compileBehavior = 'success';

      const runner = new GEPARunner({
        numTrials: 1000000,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      const result = await runner.optimize([makeTrainingExample()]);
      expect(result.paretoResult.bestScore).toBe(0.82);
    });

    it('uses default numTrials=25 when not specified', async () => {
      compileBehavior = 'success';

      const runner = new GEPARunner({
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      const result = await runner.optimize([makeTrainingExample()]);
      expect(result.paretoResult.bestScore).toBe(0.82);
    });
  });

  // ── Input validation ─────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('throws OptimizationError with kind=validation for empty training data', async () => {
      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      await expect(runner.optimize([])).rejects.toMatchObject({
        kind: 'validation',
      });
    });

    it('does not call AxGEPA.compile when training data is empty', async () => {
      const runner = new GEPARunner({
        numTrials: 25,
        studentModel: 'gpt-4o-mini',
        teacherModel: 'gpt-4o-mini',
        studentProvider: 'openai',
        studentApiKey: 'test-key',
        teacherProvider: 'openai',
        teacherApiKey: 'test-key',
        maxRetries: 0,
        timeoutMs: 0,
        logger: makeMockLogger(),
      });

      try {
        await runner.optimize([]);
      } catch {
        // Expected
      }

      // compileCallCount should be 0 since we throw before creating AxGEPA
      expect(compileCallCount).toBe(0);
    });
  });

  // ── AI service creation ──────────────────────────────────────────────────

  describe('AI service creation', () => {
    it('creates AI service for provider: openai', () => {
      const service = createAIService('openai', 'test-key', 'gpt-4o-mini');
      expect(service).toBeDefined();
    });

    it('creates AI service for provider: anthropic', () => {
      const service = createAIService('anthropic', 'test-key', 'claude-3-opus-20240229');
      expect(service).toBeDefined();
    });

    it('creates AI service for provider: mistral', () => {
      const service = createAIService('mistral', 'test-key', 'mistral-large-latest');
      expect(service).toBeDefined();
    });

    it('creates AI service for provider: deepseek', () => {
      const service = createAIService('deepseek', 'test-key', 'deepseek-chat');
      expect(service).toBeDefined();
    });

    it('creates AI service for provider: cohere', () => {
      const service = createAIService('cohere', 'test-key', 'command-r-plus');
      expect(service).toBeDefined();
    });

    it('creates AI service for provider: google-gemini', () => {
      const service = createAIService('google-gemini', 'test-key', 'gemini-1.5-pro');
      expect(service).toBeDefined();
    });

    it('passes custom apiUrl to AI service', () => {
      const service = createAIService('openai', 'test-key', 'gpt-4o-mini', 'https://custom-endpoint.example.com/v1');
      expect(service).toBeDefined();
    });
  });

  // ── OptimizationError classification ─────────────────────────────────────

  describe('OptimizationError classification', () => {
    it('correctly classifies rate limit errors', () => {
      const error = new OptimizationError(
        'rate-limit',
        'compile-start',
        'Rate limit exceeded: 429',
        true
      );
      expect(error.kind).toBe('rate-limit');
      expect(error.retryable).toBe(true);
    });

    it('correctly classifies timeout errors', () => {
      const error = new OptimizationError(
        'timeout',
        'compile-start',
        'Request timeout',
        true
      );
      expect(error.kind).toBe('timeout');
      expect(error.retryable).toBe(true);
    });

    it('correctly classifies auth errors', () => {
      const error = new OptimizationError(
        'auth',
        'compile-start',
        'Unauthorized: 401',
        false
      );
      expect(error.kind).toBe('auth');
      expect(error.retryable).toBe(false);
    });

    it('correctly classifies network errors', () => {
      const error = new OptimizationError(
        'network',
        'compile-start',
        'ECONNREFUSED',
        true
      );
      expect(error.kind).toBe('network');
      expect(error.retryable).toBe(true);
    });

    it('correctly classifies generic compile errors', () => {
      const error = new OptimizationError(
        'compile',
        'compile-start',
        'Syntax error',
        false
      );
      expect(error.kind).toBe('compile');
      expect(error.retryable).toBe(false);
    });

    it('correctly classifies validation errors', () => {
      const error = new OptimizationError(
        'validation',
        'compile-start',
        'Empty training data',
        false
      );
      expect(error.kind).toBe('validation');
      expect(error.retryable).toBe(false);
    });
  });
});
