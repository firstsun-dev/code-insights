/**
 * GEPA prompt optimization module.
 *
 * Exports the full optimization pipeline:
 * - flow.ts:     AxFlow definition for insight generation
 * - metric.ts:   Multi-objective metric (coverage, precision, actionability, brevity)
 * - runner.ts:   GEPA optimization orchestration
 * - prompts.ts:  Save/load/version tracking for optimized prompts
 */

export {
  createInsightProgram,
  INSIGHT_INSTRUCTION,
  INSIGHT_OUTPUT_FORMAT,
  type InsightOutput,
} from './flow.js';

export {
  multiObjectiveMetric,
  scalarizeScores,
  type MetricInput,
} from './metric.js';

export {
  createGEPARunner,
  runGEPAOptimization,
  type GEPARunnerConfig,
  type TrainingExample,
  type GEPARunnerResult,
} from './runner.js';

export {
  ensureOptimizationDir,
  loadManifest,
  saveManifest,
  registerVersion,
  activateVersion,
  getActiveVersion,
  deleteVersion,
  getVersionDir,
  saveArtifact,
  loadArtifact,
  saveScores,
  loadScores,
  saveMetadata,
  loadMetadata,
  compareVersions,
  listVersions,
  hasOptimizedPrompt,
  type OptimizationVersion,
  type OptimizationManifest,
  type ParetoPoint,
  type OptimizationScores,
  type OptimizationMetadata,
} from './prompts.js';
