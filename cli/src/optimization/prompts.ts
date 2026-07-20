/**
 * Save/load/version tracking for GEPA-optimized prompts.
 *
 * Optimized prompts are stored at:
 *   ~/.code-insights/optimizations/
 *     ├── manifest.json              (registry of all versions)
 *     ├── v1/
 *     │   ├── artifact.json          (serialized AxOptimizedProgram)
 *     │   ├── scores.json            (Pareto frontier scores)
 *     │   └── metadata.json          (optimizer config, timestamp, etc.)
 *     └── v2/
 *         └── ...
 *
 * The manifest tracks which version is currently active and provides
 * A/B comparison data between versions.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  rmSync,
  renameSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OptimizationVersion {
  id: string;                    // e.g., "v1", "v2"
  createdAt: string;             // ISO timestamp
  optimizerType: string;         // "GEPA"
  numTrials: number;
  objectives: string[];          // ["coverage", "precision", "actionability", "brevity"]
  bestScore: number;
  converged: boolean;
  totalRounds: number;
  optimizationTimeMs: number;
  paretoFrontSize: number;
  hypervolume?: number;
  active: boolean;               // whether this version is currently applied
}

export interface OptimizationManifest {
  versions: OptimizationVersion[];
  currentVersion: string | null;
  updatedAt: string;
}

export interface ParetoPoint {
  scores: Record<string, number>;
  configuration: Record<string, unknown>;
  dominatedSolutions: number;
}

export interface OptimizationScores {
  paretoFront: ParetoPoint[];
  selectedPoint?: ParetoPoint;   // the point chosen for this version
  selectionMethod: string;       // "weighted-sum", "human-choice", "best-coverage", etc.
}

export interface OptimizationMetadata {
  versionId: string;
  createdAt: string;
  studentModel: string;
  teacherModel?: string;
  trainingExampleCount: number;
  validationExampleCount: number;
  notes?: string;
}

/**
 * Result of an A/B comparison between two prompt versions.
 */
export interface ABComparisonResult {
  versionA: {
    id: string;
    scores: Record<string, number> | null;
    metadata: OptimizationMetadata | null;
  } | null;
  versionB: {
    id: string;
    scores: Record<string, number> | null;
    metadata: OptimizationMetadata | null;
  } | null;
  /** Per-objective delta (B - A). Positive means B is better. */
  deltas: Record<string, number>;
  /** Weighted overall score for each version (using default weights). */
  overallA: number;
  overallB: number;
  /** ID of the winning version, "tie" if equal, or "none" if both missing. */
  winner: string;
}

// ── Paths ─────────────────────────────────────────────────────────────────────

let OPTIMIZATION_DIR = join(homedir(), '.code-insights', 'optimizations');
let MANIFEST_PATH = join(OPTIMIZATION_DIR, 'manifest.json');

/**
 * Override the optimization directory (for testing only).
 * Updates both OPTIMIZATION_DIR and MANIFEST_PATH so all operations
 * use the new base.
 */
export function _setOptimizationDir(dir: string): void {
  OPTIMIZATION_DIR = dir;
  MANIFEST_PATH = join(dir, 'manifest.json');
}

// ── Manifest operations ──────────────────────────────────────────────────────

/**
 * Ensure the optimization directory exists.
 */
export function ensureOptimizationDir(): void {
  mkdirSync(OPTIMIZATION_DIR, { recursive: true });
}

/**
 * Load the optimization manifest.
 * Returns a default empty manifest if none exists or is corrupt.
 */
export function loadManifest(): OptimizationManifest {
  ensureOptimizationDir();

  if (!existsSync(MANIFEST_PATH)) {
    return emptyManifest();
  }

  try {
    const content = readFileSync(MANIFEST_PATH, 'utf-8');
    const parsed = JSON.parse(content) as OptimizationManifest;
    // Validate shape: must have versions array
    if (!Array.isArray(parsed.versions)) {
      return emptyManifest();
    }
    return parsed;
  } catch {
    // File is corrupt or unreadable — return empty so caller can proceed.
    return emptyManifest();
  }
}

/**
 * Save the optimization manifest atomically.
 * Writes to a temp file first, then renames into place to avoid
 * partial writes on crash or concurrent access.
 */
export function saveManifest(manifest: OptimizationManifest): void {
  ensureOptimizationDir();
  manifest.updatedAt = new Date().toISOString();

  const data = JSON.stringify(manifest, null, 2);
  const tmpPath = `${MANIFEST_PATH}.tmp.${process.pid}`;

  writeFileSync(tmpPath, data);
  renameSync(tmpPath, MANIFEST_PATH);
}

/**
 * Register a new optimization version in the manifest.
 * If `activate` is true, marks this version as active and deactivates others.
 *
 * Version IDs are auto-incremented (v1, v2, v3, ...) based on the
 * highest existing numeric suffix, so deleted IDs are never reused.
 */
export function registerVersion(
  version: Omit<OptimizationVersion, 'id' | 'createdAt' | 'active'>,
  activate = false
): OptimizationVersion {
  const manifest = loadManifest();

  // Generate next version ID by finding the max numeric suffix
  let maxNum = 0;
  for (const v of manifest.versions) {
    const match = v.id.match(/^v(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const nextId = `v${maxNum + 1}`;

  const newVersion: OptimizationVersion = {
    ...version,
    id: nextId,
    createdAt: new Date().toISOString(),
    active: activate,
  };

  if (activate) {
    // Deactivate all other versions
    for (const v of manifest.versions) {
      v.active = false;
    }
    manifest.currentVersion = nextId;
  }

  manifest.versions.push(newVersion);
  saveManifest(manifest);

  return newVersion;
}

/**
 * Activate a specific version by ID.
 * Returns true if the version was found and activated, false otherwise.
 */
export function activateVersion(versionId: string): boolean {
  const manifest = loadManifest();
  const version = manifest.versions.find(v => v.id === versionId);

  if (!version) return false;

  for (const v of manifest.versions) {
    v.active = v.id === versionId;
  }
  manifest.currentVersion = versionId;
  saveManifest(manifest);

  return true;
}

/**
 * Get the currently active version, or null if none.
 */
export function getActiveVersion(): OptimizationVersion | null {
  const manifest = loadManifest();
  if (!manifest.currentVersion) return null;
  return manifest.versions.find(v => v.id === manifest.currentVersion) ?? null;
}

/**
 * Delete a version and its artifacts.
 * Returns true if the version was found and deleted, false otherwise.
 */
export function deleteVersion(versionId: string): boolean {
  const manifest = loadManifest();
  const idx = manifest.versions.findIndex(v => v.id === versionId);

  if (idx === -1) return false;

  // Remove version directory
  const versionDir = join(OPTIMIZATION_DIR, versionId);
  if (existsSync(versionDir)) {
    rmSync(versionDir, { recursive: true, force: true });
  }

  // Remove from manifest
  manifest.versions.splice(idx, 1);

  // If this was the active version, clear the current pointer
  if (manifest.currentVersion === versionId) {
    manifest.currentVersion = null;
  }

  saveManifest(manifest);
  return true;
}

// ── Artifact operations ──────────────────────────────────────────────────────

/**
 * Get the directory path for a specific version.
 */
export function getVersionDir(versionId: string): string {
  return join(OPTIMIZATION_DIR, versionId);
}

/**
 * Save the serialized optimized program artifact.
 */
export function saveArtifact(versionId: string, artifact: Record<string, unknown>): void {
  const dir = getVersionDir(versionId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'artifact.json'), JSON.stringify(artifact, null, 2));
}

/**
 * Load the serialized optimized program artifact.
 * Returns null if the artifact doesn't exist or is corrupt.
 */
export function loadArtifact(versionId: string): Record<string, unknown> | null {
  const path = join(getVersionDir(versionId), 'artifact.json');
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save Pareto frontier scores for a version.
 */
export function saveScores(versionId: string, scores: OptimizationScores): void {
  const dir = getVersionDir(versionId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'scores.json'), JSON.stringify(scores, null, 2));
}

/**
 * Load Pareto frontier scores for a version.
 * Returns null if scores don't exist or are corrupt.
 */
export function loadScores(versionId: string): OptimizationScores | null {
  const path = join(getVersionDir(versionId), 'scores.json');
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save optimization metadata for a version.
 */
export function saveMetadata(versionId: string, metadata: OptimizationMetadata): void {
  const dir = getVersionDir(versionId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
}

/**
 * Load optimization metadata for a version.
 * Returns null if metadata doesn't exist or is corrupt.
 */
export function loadMetadata(versionId: string): OptimizationMetadata | null {
  const path = join(getVersionDir(versionId), 'metadata.json');
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

// ── A/B comparison ───────────────────────────────────────────────────────────

/**
 * Default weights for scalarizing multi-objective scores.
 */
const DEFAULT_WEIGHTS: Record<string, number> = {
  coverage: 0.35,
  precision: 0.30,
  actionability: 0.20,
  brevity: 0.15,
};

/**
 * Scalarize multi-objective scores into a single weighted score.
 */
function scalarize(
  scores: Record<string, number>,
  weights: Record<string, number> = DEFAULT_WEIGHTS
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key] ?? 0;
    weightedSum += weight * score;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Compare two optimization versions by their saved scores and metadata.
 *
 * Returns a rich comparison including per-objective deltas, overall
 * weighted scores, and a winner declaration.
 *
 * This is a data-layer comparison — it reads scores that were saved
 * at optimization time. For live re-evaluation on a validation set,
 * use the runner's `optimize` method with each version's artifact.
 */
export function compareVersions(
  versionIdA: string,
  versionIdB: string
): ABComparisonResult {
  const manifest = loadManifest();

  const verA = manifest.versions.find(v => v.id === versionIdA) ?? null;
  const verB = manifest.versions.find(v => v.id === versionIdB) ?? null;

  const scoresA = loadScores(versionIdA);
  const scoresB = loadScores(versionIdB);

  const metadataA = loadMetadata(versionIdA);
  const metadataB = loadMetadata(versionIdB);

  // Extract the selected point scores (or null if unavailable)
  const pointA = scoresA?.selectedPoint?.scores ?? null;
  const pointB = scoresB?.selectedPoint?.scores ?? null;

  // Compute per-objective deltas (B - A)
  const deltas: Record<string, number> = {};
  const allKeys = new Set<string>();
  if (pointA) Object.keys(pointA).forEach(k => allKeys.add(k));
  if (pointB) Object.keys(pointB).forEach(k => allKeys.add(k));

  for (const key of allKeys) {
    const a = pointA?.[key] ?? 0;
    const b = pointB?.[key] ?? 0;
    deltas[key] = b - a;
  }

  const overallA = pointA ? scalarize(pointA) : 0;
  const overallB = pointB ? scalarize(pointB) : 0;

  const winner =
    !verA && !verB
      ? 'none'
      : overallA === overallB
        ? 'tie'
        : overallA > overallB
          ? versionIdA
          : versionIdB;

  return {
    versionA: verA
      ? {
          id: verA.id,
          scores: pointA,
          metadata: metadataA,
        }
      : null,
    versionB: verB
      ? {
          id: verB.id,
          scores: pointB,
          metadata: metadataB,
        }
      : null,
    deltas,
    overallA,
    overallB,
    winner,
  };
}

/**
 * List all optimization versions.
 */
export function listVersions(): OptimizationVersion[] {
  return loadManifest().versions;
}

/**
 * Check if any optimized prompt is available (has at least one active version).
 */
export function hasOptimizedPrompt(): boolean {
  const manifest = loadManifest();
  return manifest.versions.length > 0 && manifest.currentVersion !== null;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function emptyManifest(): OptimizationManifest {
  return {
    versions: [],
    currentVersion: null,
    updatedAt: new Date().toISOString(),
  };
}
