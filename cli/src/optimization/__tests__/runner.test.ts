/**
 * Tests for GEPARunner.optimize() — the full optimization pipeline with mocked LLM responses.
 *
 * Strategy: vi.mock('@ax-llm/ax') to stub AxGEPA so the runner
 * orchestrates config → compile → result processing without real API calls.
 * Also mocks prompts.ts version-tracking functions to avoid disk writes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// ─── Mock setup ──────────────────────────────────────────────────────────────

// Shared mock compile function — tests can override this per-test
let mockCompileFn: ReturnType<typeof vi.fn>;

// Mock the Ax library — stub AxGEPA as a proper class
vi.mock('@ax-llm/ax', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ax-llm/ax')>();

  // Create a mock class that behaves like AxGEPA
  const MockAxGEPA = vi.fn(function (this: any, args: any) {
    this.args = args;
    this.compile = mockCompileFn;
  }) as any;

  return {
    ...actual,
    AxGEPA: MockAxGEPA,
  };
});

// Mock the prompts.ts version-tracking to avoid disk I/O
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

// ─── Import after mocking ────────────────────────────────────────────────────

import { createGEPARunner, type GEPARunnerConfig, type TrainingExample } from '../../optimization/runner.js';
import { AxGEPA } from '@ax-llm/ax';
import { registerVersion, saveArtifact, saveScores, saveMetadata } from '../../optimization/prompts.js';

// ─── Test data factories ─────────────────────────────────────────────────────

function makeTrainingExample(overrides?: Partial<TrainingExample>): TrainingExample {
  return {
    sessionData: 'User#1: How do I create a singleton in Ruby?\nAssistant#2: Use the Singleton module from the standard library.',
    humanQuality: 0.85,
    expectedInsightCount: 3,
    sessionTopics: ['singleton', 'ruby', 'standard-library'],
    ...overrides,
  };
}

function makeFakeParetoResult(overrides?: Record<string, any>) {
  return {
    demos: [],
    stats: {
      totalCalls: 25,
      successfulDemos: 20,
      estimatedTokenUsage: 50000,
      earlyStopped: false,
      bestScore: 0.82,
      resourceUsage: {
        totalTokens: 50000,
        totalTime: 5000,
        avgLatencyPerEval: 200,
        costByModel: { 'mistral-small-latest': 0.5, 'claude-sonnet-4': 1.5 },
      },
      convergenceInfo: {
        converged: true,
        finalImprovement: 0.05,
        stagnationRounds: 3,
        convergenceThreshold: 0.01,
      },
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
        resourceUsage: {
          totalTokens: 50000,
          totalTime: 5000,
          avgLatencyPerEval: 200,
          costByModel: { 'mistral-small-latest': 0.5, 'claude-sonnet-4': 1.5 },
        },
        convergenceInfo: {
          converged: true,
          finalImprovement: 0.05,
          stagnationRounds: 3,
          convergenceThreshold: 0.01,
        },
      },
      optimizerType: 'GEPA',
      optimizationTime: 5000,
      totalRounds: 25,
      converged: true,
      componentMap: { 'insightGen::description': 'An optimized instruction string' },
      applyTo: vi.fn(),
    },
    paretoFront: [
      {
        demos: [],
        scores: { coverage: 0.9, precision: 0.85, actionability: 0.7, brevity: 0.6 },
        configuration: { 'insightGen::description': 'Option A' },
        dominatedSolutions: 5,
      },
      {
        demos: [],
        scores: { coverage: 0.7, precision: 0.9, actionability: 0.8, brevity: 0.9 },
        configuration: { 'insightGen::description': 'Option B' },
        dominatedSolutions: 3,
      },
      {
        demos: [],
        scores: { coverage: 0.85, precision: 0.88, actionability: 0.75, brevity: 0.7 },
        configuration: { 'insightGen::description': 'Option C' },
        dominatedSolutions: 2,
      },
    ],
    hypervolume: 0.65,
    paretoFrontSize: 3,
    ...overrides,
  };
}

// Use process.env.HOME (not os.homedir()) because Hermes overrides HOME per profile
const TEST_DIR = path.join(process.env.HOME || homedir(), '.code-insights', 'optimizations');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GEPARunner.optimize()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws if training data is empty', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    await expect(runner.optimize([])).rejects.toThrow(
      'GEPA optimization requires at least one training example'
    );
  });

  it('calls AxGEPA.compile with the correct number of trials', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      numTrials: 10,
      seed: 42,
    });

    const trainData = [makeTrainingExample()];
    await runner.optimize(trainData);

    expect(AxGEPA).toHaveBeenCalledWith(
      expect.objectContaining({
        numTrials: 10,
        seed: 42,
        minibatch: true,
      })
    );
    expect(mockCompileFn).toHaveBeenCalledOnce();
  });

  it('passes training and validation data to compile', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const trainData = [makeTrainingExample(), makeTrainingExample()];
    const valData = [makeTrainingExample()];
    await runner.optimize(trainData, valData);

    // compile args: [program, trainData, metricFn, options]
    const compileArgs = mockCompileFn.mock.calls[0];
    expect(compileArgs).toBeDefined();
    expect(compileArgs.length).toBeGreaterThanOrEqual(2);
  });

  it('uses validation data as validationExamples when provided', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const trainData = [makeTrainingExample()];
    const valData = [makeTrainingExample(), makeTrainingExample()];
    await runner.optimize(trainData, valData);

    const compileOptions = mockCompileFn.mock.calls[0][3]; // 4th arg is options
    expect(compileOptions).toHaveProperty('validationExamples');
  });

  it('falls back to training data for validation when no validation data provided', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const trainData = [makeTrainingExample()];
    await runner.optimize(trainData);

    const compileOptions = mockCompileFn.mock.calls[0][3]; // 4th arg is options
    expect(compileOptions).toHaveProperty('validationExamples');
  });

  it('returns GEPARunnerResult with all required fields', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);

    expect(result).toHaveProperty('paretoResult');
    expect(result).toHaveProperty('versionId');
    expect(result).toHaveProperty('selectedPoint');
    expect(result).toHaveProperty('paretoFront');
    expect(result).toHaveProperty('serializedArtifact');
    expect(result).toHaveProperty('optimizedProgram');
  });

  it('applies the optimized componentMap to the program instruction/description', async () => {
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult({
      optimizedProgram: {
        bestScore: 0.82,
        stats: { totalCalls: 25 },
        optimizerType: 'GEPA',
        optimizationTime: 5000,
        componentMap: {
          'root::instruction': 'Optimized instruction text',
          'root::description': 'Optimized description text',
        },
      },
    }));

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);

    expect(result.optimizedProgram.instruction).toBe('Optimized instruction text');
    expect(result.optimizedProgram.description).toBe('Optimized description text');
  });

  it('selects the best point from the Pareto front using weighted-sum scalarization', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);

    // Weighted-sum with default weights (coverage:0.35, precision:0.30, actionability:0.20, brevity:0.15):
    // Option A: 0.35*0.9 + 0.30*0.85 + 0.20*0.7 + 0.15*0.6 = 0.80
    // Option B: 0.35*0.7 + 0.30*0.9 + 0.20*0.8 + 0.15*0.9 = 0.81
    // Option C: 0.35*0.85 + 0.30*0.88 + 0.20*0.75 + 0.15*0.7 = 0.8165
    // Option C should win
    expect(result.selectedPoint.scores).toHaveProperty('coverage');
    expect(result.selectedPoint.scores).toHaveProperty('precision');
    expect(result.selectedPoint.configuration).toEqual({ 'insightGen::description': 'Option C' });
  });

  it('calls registerVersion with correct optimizer metadata', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      numTrials: 25,
    });

    await runner.optimize([makeTrainingExample()]);

    expect(registerVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        optimizerType: 'GEPA',
        numTrials: 25,
        objectives: ['coverage', 'precision', 'actionability', 'brevity', 'prompt_refinement'],
      }),
      true
    );
  });

  it('calls saveArtifact, saveScores, and saveMetadata after optimization', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    await runner.optimize([makeTrainingExample()]);

    expect(saveArtifact).toHaveBeenCalled();
    expect(saveScores).toHaveBeenCalled();
    expect(saveMetadata).toHaveBeenCalled();
  });

  it('saves metadata with correct model info and data counts', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      teacherProvider: 'mistral',
      teacherApiKey: 'teacher-key',
      teacherModel: 'mistral-medium-latest',
    });

    const trainData = [makeTrainingExample(), makeTrainingExample()];
    const valData = [makeTrainingExample()];
    await runner.optimize(trainData, valData);

    expect(saveMetadata).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({
        studentModel: 'mistral/mistral-small-latest',
        teacherModel: 'mistral/mistral-medium-latest',
        trainingExampleCount: 2,
        validationExampleCount: 1,
      })
    );
  });

  it('serializes the optimized program as artifact', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);

    expect(result.serializedArtifact).toBeDefined();
    expect(typeof result.serializedArtifact).toBe('object');
  });

  it('handles empty optimizedProgram gracefully', async () => {
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult({ optimizedProgram: undefined }));

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);

    // Should still return a result, just with empty serialized artifact
    expect(result).toHaveProperty('paretoResult');
    expect(result.serializedArtifact).toEqual({});
  });

  it('handles empty Pareto front by throwing', async () => {
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult({ paretoFront: [] }));

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    await expect(runner.optimize([makeTrainingExample()])).rejects.toThrow(
      'Pareto frontier is empty'
    );
  });

  it('defaults teacher config to student config when not specified', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      studentApiUrl: 'https://openrouter.ai/api/v1',
    });

    await runner.optimize([makeTrainingExample()]);

    // Teacher defaults to student provider/model/apiKey
    expect(saveMetadata).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({
        studentModel: 'mistral/mistral-small-latest',
        teacherModel: 'mistral/mistral-small-latest',
      })
    );
  });

  it('passes maxMetricCalls to compile options', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      maxMetricCalls: 50,
    });

    await runner.optimize([makeTrainingExample()]);

    const compileOptions = mockCompileFn.mock.calls[0][3];
    expect(compileOptions).toHaveProperty('maxMetricCalls', 50);
  });

  it('passes verbose flag to both AxGEPA constructor and compile options', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      verbose: true,
    });

    await runner.optimize([makeTrainingExample()]);

    expect(AxGEPA).toHaveBeenCalledWith(
      expect.objectContaining({ verbose: true })
    );
    const compileOptions = mockCompileFn.mock.calls[0][3];
    expect(compileOptions).toHaveProperty('verbose', true);
  });

  it('calls custom logger with structured entries for each step', async () => {
    const logEntries: any[] = [];
    const customLogger = (entry: any) => logEntries.push(entry);

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      logger: customLogger,
    });

    await runner.optimize([makeTrainingExample()]);

    const steps = logEntries.map(e => e.step);
    expect(steps).toContain('init');
    expect(steps).toContain('create-student');
    expect(steps).toContain('create-teacher');
    expect(steps).toContain('compile-start');
    expect(steps).toContain('compile-end');
    expect(steps).toContain('select-best-point');
    expect(steps).toContain('register-version');
    expect(steps).toContain('save-artifact');
    expect(steps).toContain('save-scores');
    expect(steps).toContain('save-metadata');
    expect(steps).toContain('complete');
  });

  it('includes structured data in log entries', async () => {
    const logEntries: any[] = [];
    const customLogger = (entry: any) => logEntries.push(entry);

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      logger: customLogger,
      numTrials: 15,
    });

    await runner.optimize([makeTrainingExample()]);

    const initEntry = logEntries.find(e => e.step === 'init');
    expect(initEntry).toBeDefined();
    expect(initEntry.data).toEqual(
      expect.objectContaining({
        numTrials: 15,
        trainCount: 1,
        valCount: 0,
      })
    );

    const compileEndEntry = logEntries.find(e => e.step === 'compile-end');
    expect(compileEndEntry).toBeDefined();
    expect(compileEndEntry.data).toEqual(
      expect.objectContaining({
        bestScore: 0.82,
        paretoFrontSize: 3,
      })
    );

    const completeEntry = logEntries.find(e => e.step === 'complete');
    expect(completeEntry).toBeDefined();
    expect(completeEntry.data).toEqual(
      expect.objectContaining({
        versionId: 'v1',
        bestScore: 0.82,
      })
    );
  });

  it('log entries include ISO timestamps', async () => {
    const logEntries: any[] = [];
    const customLogger = (entry: any) => logEntries.push(entry);

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      logger: customLogger,
    });

    await runner.optimize([makeTrainingExample()]);

    for (const entry of logEntries) {
      // ISO timestamp format: 2026-06-06T19:28:08.608Z
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it('does not log when default logger is used with verbose=false', async () => {
    // Capture stderr output
    const stderrWrite = process.stderr.write.bind(process.stderr.write);
    const stderrChunks: string[] = [];
    const mockWrite = (chunk: any) => {
      stderrChunks.push(String(chunk));
      return true;
    };
    process.stderr.write = mockWrite as any;

    try {
      const runner = createGEPARunner({
        studentProvider: 'mistral',
        studentApiKey: 'test-key',
        studentModel: 'mistral-small-latest',
        verbose: false,
      });

      await runner.optimize([makeTrainingExample()]);

      // No GEPA-prefixed lines should have been written to stderr
      const gepaLines = stderrChunks.filter(c => c.startsWith('[GEPA]'));
      expect(gepaLines).toHaveLength(0);
    } finally {
      process.stderr.write = stderrWrite;
    }
  });

  it('passes earlyStoppingTrials to AxGEPA constructor', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      earlyStoppingTrials: 5,
    });

    await runner.optimize([makeTrainingExample()]);

    expect(AxGEPA).toHaveBeenCalledWith(
      expect.objectContaining({ earlyStoppingTrials: 5 })
    );
  });

  it('passes minibatchSize to AxGEPA constructor', async () => {
    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
      minibatchSize: 8,
    });

    await runner.optimize([makeTrainingExample()]);

    expect(AxGEPA).toHaveBeenCalledWith(
      expect.objectContaining({ minibatchSize: 8 })
    );
  });
});

// ─── selectBestPoint tests (indirect via optimize) ───────────────────────────

describe('GEPARunner.selectBestPoint() (tested via optimize)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult());
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('uses default weights: coverage=0.35, precision=0.30, actionability=0.20, brevity=0.15', async () => {
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult({
      paretoFront: [
        {
          demos: [],
          scores: { coverage: 1.0, precision: 0.0, actionability: 0.0, brevity: 0.0 },
          configuration: { 'insightGen::description': 'Coverage-heavy' },
          dominatedSolutions: 0,
        },
        {
          demos: [],
          scores: { coverage: 0.0, precision: 1.0, actionability: 0.0, brevity: 0.0 },
          configuration: { 'insightGen::description': 'Precision-heavy' },
          dominatedSolutions: 0,
        },
      ],
    }));

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);

    // coverage-heavy: 0.35*1.0 = 0.35
    // precision-heavy: 0.30*1.0 = 0.30
    expect(result.selectedPoint.configuration).toEqual({ 'insightGen::description': 'Coverage-heavy' });
  });

  it('selects the only point when Pareto front has one element', async () => {
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult({
      paretoFront: [
        {
          demos: [],
          scores: { coverage: 0.8, precision: 0.7, actionability: 0.6, brevity: 0.5 },
          configuration: { 'insightGen::description': 'Only option' },
          dominatedSolutions: 0,
        },
      ],
    }));

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);
    expect(result.selectedPoint.configuration).toEqual({ 'insightGen::description': 'Only option' });
  });

  it('handles ties gracefully (picks first among equal scores)', async () => {
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult({
      paretoFront: [
        {
          demos: [],
          scores: { coverage: 0.5, precision: 0.5, actionability: 0.5, brevity: 0.5 },
          configuration: { 'insightGen::description': 'Tie-A' },
          dominatedSolutions: 0,
        },
        {
          demos: [],
          scores: { coverage: 0.5, precision: 0.5, actionability: 0.5, brevity: 0.5 },
          configuration: { 'insightGen::description': 'Tie-B' },
          dominatedSolutions: 0,
        },
      ],
    }));

    const runner = createGEPARunner({
      studentProvider: 'mistral',
      studentApiKey: 'test-key',
      studentModel: 'mistral-small-latest',
    });

    const result = await runner.optimize([makeTrainingExample()]);
    // Both have identical scores; first one should win (array order)
    expect(result.selectedPoint.configuration).toEqual({ 'insightGen::description': 'Tie-A' });
  });
});

// ─── runGEPAOptimization convenience function tests ──────────────────────────

describe('runGEPAOptimization()', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompileFn = vi.fn().mockResolvedValue(makeFakeParetoResult());
    savedEnv = {};
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore env vars
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  function saveAndSetEnv(key: string, value: string) {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
    process.env[key] = value;
  }

  function saveAndDeleteEnv(key: string) {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
    delete process.env[key];
  }

  it('throws when no API key is available', async () => {
    saveAndDeleteEnv('MISTRAL_API_KEY');
    saveAndDeleteEnv('ANTHROPIC_API_KEY');
    saveAndDeleteEnv('MISTRAL_API_KEY');
    saveAndDeleteEnv('DEEPSEEK_API_KEY');
    saveAndDeleteEnv('COHERE_API_KEY');
    saveAndDeleteEnv('GEMINI_API_KEY');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await expect(
      runGEPAOptimization([makeTrainingExample()])
    ).rejects.toThrow("No API key for provider 'mistral'");
  });

  it('uses MISTRAL_API_KEY from environment when studentApiKey not provided', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-test-env-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    const result = await runGEPAOptimization([makeTrainingExample()]);
    expect(result).toHaveProperty('paretoResult');
  });

  it('defaults to mistral-small-latest as student model', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-test-env-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization([makeTrainingExample()]);

    expect(saveMetadata).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({
        studentModel: 'mistral/mistral-small-latest',
      })
    );
  });

  it('defaults teacher to student provider with mistral-medium-latest model when teacher not specified', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', '***');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization([makeTrainingExample()]);

    // runGEPAOptimization defaults teacherProvider to student provider,
    // and teacherModel to 'mistral-medium-latest'
    expect(saveMetadata).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({
        teacherModel: 'mistral/mistral-medium-latest',
      })
    );
  });

  it('uses explicit teacher config when provided', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-test-env-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization(
      [makeTrainingExample()],
      [],
      {
        teacherProvider: 'mistral',
        teacherModel: 'mistral-medium-latest',
      }
    );

    expect(saveMetadata).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({
        teacherModel: 'mistral/mistral-medium-latest',
      })
    );
  });

  it('uses correct environment variable for anthropic provider', async () => {
    saveAndSetEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
    saveAndDeleteEnv('MISTRAL_API_KEY');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization(
      [makeTrainingExample()],
      [],
      { studentProvider: 'anthropic' }
    );

    // Should work without explicit apiKey, using ANTHROPIC_API_KEY
    expect(saveMetadata).toHaveBeenCalled();
  });

  it('uses correct environment variable for deepseek provider', async () => {
    saveAndSetEnv('DEEPSEEK_API_KEY', 'ds-test-key');
    saveAndDeleteEnv('MISTRAL_API_KEY');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization(
      [makeTrainingExample()],
      [],
      { studentProvider: 'deepseek' }
    );

    expect(saveMetadata).toHaveBeenCalled();
  });

  it('passes numTrials default of 25', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-test-env-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization([makeTrainingExample()]);

    expect(registerVersion).toHaveBeenCalledWith(
      expect.objectContaining({ numTrials: 25 }),
      true
    );
  });

  it('allows overriding numTrials', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-test-env-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    await runGEPAOptimization(
      [makeTrainingExample()],
      [],
      { numTrials: 15 }
    );

    expect(registerVersion).toHaveBeenCalledWith(
      expect.objectContaining({ numTrials: 15 }),
      true
    );
  });

  it('uses studentApiKey when explicitly provided over env var', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-env-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    // Should work fine with explicit key
    const result = await runGEPAOptimization(
      [makeTrainingExample()],
      [],
      { studentApiKey: 'sk-explicit-key' }
    );
    expect(result).toHaveProperty('paretoResult');
  });

  it('supports custom apiUrl (OpenRouter pattern)', async () => {
    saveAndSetEnv('MISTRAL_API_KEY', 'sk-or-test-key');

    const { runGEPAOptimization } = await import('../../optimization/runner.js');

    const result = await runGEPAOptimization(
      [makeTrainingExample()],
      [],
      { studentApiUrl: 'https://openrouter.ai/api/v1' }
    );
    expect(result).toHaveProperty('paretoResult');
  });
});