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

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'fs';
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

// ── Paths ─────────────────────────────────────────────────────────────────────

const OPTIMIZATION_DIR = join(homedir(), '.code-insights', 'optimizations');
const MANIFEST_PATH = join(OPTIMIZATION_DIR, 'manifest.json');

// ── Manifest operations ──────────────────────────────────────────────────────

/**
 * Ensure the optimization directory exists.
 */
export function ensureOptimizationDir(): void {
  mkdirSync(OPTIMIZATION_DIR, { recursive: true });
}

/**
 * Load the optimization manifest.
 * Returns a default empty manifest if none exists.
 */
export function loadManifest(): OptimizationManifest {
  ensureOptimizationDir();

  if (!existsSync(MANIFEST_PATH)) {
    return { versions: [], currentVersion: null, updatedAt: new Date().toISOString() };
  }

  try {
    const content = readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(content) as OptimizationManifest;
  } catch {
    return { versions: [], currentVersion: null, updatedAt: new Date().toISOString() };
  }
}

/**
 * Save the optimization manifest.
 */
export function saveManifest(manifest: OptimizationManifest): void {
  ensureOptimizationDir();
  manifest.updatedAt = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/**
 * Register a new optimization version in the manifest.
 * If `activate` is true, marks this version as active and deactivates others.
 */
export function registerVersion(
  version: Omit<OptimizationVersion, 'id' | 'createdAt' | 'active'>,
  activate = false
): OptimizationVersion {
  const manifest = loadManifest();

  // Generate next version ID
  const existingIds = manifest.versions.map(v => v.id);
  let nextId = 'v1';
  let counter = 1;
  while (existingIds.includes(nextId)) {
    counter++;
    nextId = `v${counter}`;
  }

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
 * Compare two optimization versions.
 * Returns a diff of their scores and metadata.
 */
export function compareVersions(
  versionIdA: string,
  versionIdB: string
): {
  versionA: OptimizationVersion | null;
  versionB: OptimizationVersion | null;
  scoresA: OptimizationScores | null;
  scoresB: OptimizationScores | null;
  metadataA: OptimizationMetadata | null;
  metadataB: OptimizationMetadata | null;
} {
  const manifest = loadManifest();

  return {
    versionA: manifest.versions.find(v => v.id === versionIdA) ?? null,
    versionB: manifest.versions.find(v => v.id === versionIdB) ?? null,
    scoresA: loadScores(versionIdA),
    scoresB: loadScores(versionIdB),
    metadataA: loadMetadata(versionIdA),
    metadataB: loadMetadata(versionIdB),
  };
}

/**
 * List all optimization versions.
 */
export function listVersions(): OptimizationVersion[] {
  return loadManifest().versions;
}

/**
 * Check if any optimized prompt is available.
 */
export function hasOptimizedPrompt(): boolean {
  const manifest = loadManifest();
  return manifest.versions.length > 0 && manifest.currentVersion !== null;
}
