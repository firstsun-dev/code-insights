/**
 * GEPA optimization orchestration for insight generation prompts.
 *
 * Orchestrates the full optimization lifecycle:
 * 1. Prepare training/validation data from session transcripts
 * 2. Create student (fast/cheap) and teacher (strong) AI services
 * 3. Run GEPA optimization with multi-objective metric
 * 4. Save optimized prompt artifacts with version tracking
 * 5. Return AxParetoResult for downstream consumption
 */

import { ai, AxGEPA, axSerializeOptimizedProgram } from '@ax-llm/ax';
import type { AxParetoResult } from '@ax-llm/ax';
import { createInsightProgram, INSIGHT_INSTRUCTION, INSIGHT_OUTPUT_FORMAT } from './flow.js';
import { multiObjectiveMetric, scalarizeScores, type MetricInput } from './metric.js';
import {
  registerVersion,
  saveArtifact,
  saveScores,
  saveMetadata,
  type OptimizationScores,
  type OptimizationMetadata,
  type ParetoPoint,
} from './prompts.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GEPARunnerConfig {
  /** Student AI provider (valid Ax provider name). */
  studentProvider: 'openai' | 'anthropic' | 'mistral' | 'deepseek' | 'cohere' | 'google-gemini';
  studentApiKey: string;
  studentModel: string;
  /** Custom API URL (e.g., OpenRouter endpoint: https://openrouter.ai/api/v1). */
  studentApiUrl?: string;

  /** Teacher AI provider (valid Ax provider name). */
  teacherProvider?: 'openai' | 'anthropic' | 'mistral' | 'deepseek' | 'cohere' | 'google-gemini';
  teacherApiKey?: string;
  teacherModel?: string;
  /** Custom API URL for the teacher provider. */
  teacherApiUrl?: string;

  /** Number of optimization trials (default: 25). */
  numTrials?: number;

  /** Random seed for reproducibility. */
  seed?: number;

  /** Enable verbose logging. */
  verbose?: boolean;

  /** Max metric calls to bound evaluation cost. */
  maxMetricCalls?: number;

  /** Early stopping: stop after N trials without improvement. */
  earlyStoppingTrials?: number;

  /** Minibatch size for evaluation. */
  minibatchSize?: number;
}

export interface TrainingExample {
  sessionData: string;
  humanQuality?: number;
  expectedInsightCount?: number;
  sessionTopics?: string[];
}

export interface GEPARunnerResult {
  paretoResult: AxParetoResult;
  versionId: string;
  optimizedProgram: ReturnType<typeof createInsightProgram>;
  serializedArtifact: Record<string, unknown>;
  selectedPoint: ParetoPoint;
  paretoFront: ParetoPoint[];
}

// ── Helper to create AI service ───────────────────────────────────────────────

function createAIService(
  provider: string,
  apiKey: string,
  model: string,
  apiUrl?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const config = apiUrl ? { model, apiURL: apiUrl } : { model };

  // ai() uses a discriminated union: the config type depends on `name`.
  // TypeScript can't narrow this through a switch, so we use per-case `as any`.
  switch (provider) {
    case 'openai':
      return ai({ name: 'openai' as const, apiKey, config } as any);
    case 'anthropic':
      return ai({ name: 'anthropic' as const, apiKey, config } as any);
    case 'mistral':
      return ai({ name: 'mistral' as const, apiKey, config } as any);
    case 'deepseek':
      return ai({ name: 'deepseek' as const, apiKey, config } as any);
    case 'cohere':
      return ai({ name: 'cohere' as const, apiKey, config } as any);
    case 'google-gemini':
      return ai({ name: 'google-gemini' as const, apiKey, config } as any);
    default:
      return ai({ name: 'openai' as const, apiKey, config } as any);
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────

export function createGEPARunner(config: GEPARunnerConfig): GEPARunner {
  return new GEPARunner(config);
}

export class GEPARunner {
  private readonly studentProvider: GEPARunnerConfig['studentProvider'];
  private readonly studentApiKey: string;
  private readonly studentModel: string;
  private readonly studentApiUrl?: string;
  private readonly teacherProvider: GEPARunnerConfig['studentProvider'];
  private readonly teacherApiKey: string;
  private readonly teacherModel: string;
  private readonly teacherApiUrl?: string;
  private readonly numTrials: number;
  private readonly seed: number;
  private readonly verbose: boolean;
  private readonly maxMetricCalls: number;
  private readonly earlyStoppingTrials: number;
  private readonly minibatchSize: number;

  constructor(config: GEPARunnerConfig) {
    this.studentProvider = config.studentProvider;
    this.studentApiKey = config.studentApiKey;
    this.studentModel = config.studentModel;
    this.studentApiUrl = config.studentApiUrl;
    this.teacherProvider = config.teacherProvider ?? config.studentProvider;
    this.teacherApiKey = config.teacherApiKey ?? config.studentApiKey;
    this.teacherModel = config.teacherModel ?? config.studentModel;
    this.teacherApiUrl = config.teacherApiUrl ?? config.studentApiUrl;
    this.numTrials = config.numTrials ?? 25;
    this.seed = config.seed ?? 42;
    this.verbose = config.verbose ?? false;
    this.maxMetricCalls = config.maxMetricCalls ?? 200;
    this.earlyStoppingTrials = config.earlyStoppingTrials ?? 8;
    this.minibatchSize = config.minibatchSize ?? 6;
  }

  async optimize(
    trainData: TrainingExample[],
    validationData: TrainingExample[] = []
  ): Promise<GEPARunnerResult> {
    if (trainData.length === 0) {
      throw new Error('GEPA optimization requires at least one training example');
    }

    const studentAI = createAIService(
      this.studentProvider,
      this.studentApiKey,
      this.studentModel,
      this.studentApiUrl
    );

    const teacherAI = createAIService(
      this.teacherProvider,
      this.teacherApiKey,
      this.teacherModel,
      this.teacherApiUrl
    );

    const program = createInsightProgram();

    const metricFn = (input: { prediction: unknown; example: unknown }) =>
      multiObjectiveMetric(input as MetricInput);

    const optimizer = new AxGEPA({
      studentAI,
      teacherAI,
      numTrials: this.numTrials,
      minibatch: true,
      minibatchSize: this.minibatchSize,
      earlyStoppingTrials: this.earlyStoppingTrials,
      seed: this.seed,
      verbose: this.verbose,
    });

    const result = await optimizer.compile(
      program as unknown as Parameters<typeof optimizer.compile>[0],
      trainData as unknown as Parameters<typeof optimizer.compile>[1],
      metricFn as unknown as Parameters<typeof optimizer.compile>[2],
      {
        validationExamples: validationData.length > 0 ? validationData : trainData,
        maxMetricCalls: this.maxMetricCalls,
        verbose: this.verbose,
      } as unknown as Parameters<typeof optimizer.compile>[3]
    ) as unknown as AxParetoResult;

    const selectedPoint = this.selectBestPoint(result);

    if (result.optimizedProgram) {
      program.applyOptimization(result.optimizedProgram);
    }

    const serializedArtifact = result.optimizedProgram
      ? axSerializeOptimizedProgram(result.optimizedProgram)
      : {};

    const scores: OptimizationScores = {
      paretoFront: result.paretoFront.map(p => ({
        scores: p.scores,
        configuration: p.configuration,
        dominatedSolutions: p.dominatedSolutions,
      })),
      selectedPoint: {
        scores: selectedPoint.scores,
        configuration: selectedPoint.configuration,
        dominatedSolutions: selectedPoint.dominatedSolutions,
      },
      selectionMethod: 'weighted-sum',
    };

    const metadata: OptimizationMetadata = {
      versionId: '',
      createdAt: new Date().toISOString(),
      studentModel: `${this.studentProvider}/${this.studentModel}`,
      teacherModel: `${this.teacherProvider}/${this.teacherModel}`,
      trainingExampleCount: trainData.length,
      validationExampleCount: validationData.length,
    };

    const version = registerVersion(
      {
        optimizerType: 'GEPA',
        numTrials: this.numTrials,
        objectives: ['coverage', 'precision', 'actionability', 'brevity'],
        bestScore: result.bestScore,
        converged: result.optimizedProgram?.stats?.convergenceInfo?.converged ?? false,
        totalRounds: result.optimizedProgram?.stats?.totalCalls ?? 0,
        optimizationTimeMs: result.optimizedProgram?.stats?.resourceUsage?.totalTime ?? 0,
        paretoFrontSize: result.paretoFrontSize,
        hypervolume: result.hypervolume,
      },
      true
    );

    metadata.versionId = version.id;
    saveArtifact(version.id, serializedArtifact as Record<string, unknown>);
    saveScores(version.id, scores);
    saveMetadata(version.id, metadata);

    return {
      paretoResult: result,
      versionId: version.id,
      optimizedProgram: program,
      serializedArtifact: serializedArtifact as Record<string, unknown>,
      selectedPoint,
      paretoFront: result.paretoFront.map(p => ({
        scores: p.scores,
        configuration: p.configuration,
        dominatedSolutions: p.dominatedSolutions,
      })),
    };
  }

  private selectBestPoint(result: AxParetoResult): ParetoPoint {
    if (result.paretoFront.length === 0) {
      throw new Error('Pareto frontier is empty');
    }

    const weights = { coverage: 0.35, precision: 0.30, actionability: 0.20, brevity: 0.15 };

    let bestPoint = result.paretoFront[0];
    let bestScore = -1;

    for (const point of result.paretoFront) {
      const score = scalarizeScores(point.scores, weights);
      if (score > bestScore) {
        bestScore = score;
        bestPoint = point;
      }
    }

    return {
      scores: bestPoint.scores,
      configuration: bestPoint.configuration,
      dominatedSolutions: bestPoint.dominatedSolutions,
    };
  }
}

/**
 * Convenience function: run GEPA optimization with default config.
 */
export async function runGEPAOptimization(
  trainData: TrainingExample[],
  validationData: TrainingExample[] = [],
  config: Partial<GEPARunnerConfig> = {}
): Promise<GEPARunnerResult> {
  const provider = config.studentProvider ?? 'openai';
  const apiKeyEnvMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    cohere: 'COHERE_API_KEY',
    'google-gemini': 'GEMINI_API_KEY',
  };

  const apiKeyEnv = apiKeyEnvMap[provider];
  const apiKey = config.studentApiKey ?? (apiKeyEnv ? process.env[apiKeyEnv] : undefined);

  if (!apiKey) {
    throw new Error(
      `No API key for provider '${provider}'. ` +
      (apiKeyEnv ? `Set ${apiKeyEnv} environment variable.` : '')
    );
  }

  const runner = createGEPARunner({
    studentProvider: provider,
    studentApiKey: apiKey,
    studentModel: config.studentModel ?? 'gpt-4o-mini',
    studentApiUrl: config.studentApiUrl,
    teacherProvider: config.teacherProvider ?? provider,
    teacherApiKey: config.teacherApiKey ?? apiKey,
    teacherModel: config.teacherModel ?? 'claude-sonnet-4-20250514',
    teacherApiUrl: config.teacherApiUrl,
    numTrials: config.numTrials ?? 25,
    seed: config.seed ?? 42,
    verbose: config.verbose ?? false,
    maxMetricCalls: config.maxMetricCalls ?? 200,
    earlyStoppingTrials: config.earlyStoppingTrials ?? 8,
    minibatchSize: config.minibatchSize ?? 6,
  });

  return runner.optimize(trainData, validationData);
}
