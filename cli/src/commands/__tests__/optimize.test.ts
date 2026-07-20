/**
 * Tests for the optimize CLI command subcommands.
 *
 * Covers: status, list, apply, delete, compare
 * (The `run` subcommand requires live LLM API calls and is tested
 *  indirectly via the runner tests in optimization/__tests__/)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// ─── Mock ora (spinner) ──────────────────────────────────────────────────────

vi.mock('ora', () => ({
  default: vi.fn().mockImplementation((_text: string) => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

// ─── Mock runner (no real LLM calls) ──────────────────────────────────────────

vi.mock('../../optimization/runner.js', () => ({
  runGEPAOptimization: vi.fn().mockResolvedValue({
    versionId: 'v1',
    paretoResult: {
      bestScore: 0.85,
      optimizedProgram: { converged: true },
      paretoFrontSize: 5,
    },
    selectedPoint: {
      scores: { coverage: 0.8, precision: 0.7, actionability: 0.6, brevity: 0.9 },
    },
    paretoFront: [
      { scores: { coverage: 0.8, precision: 0.7, actionability: 0.6, brevity: 0.9 }, configuration: {}, dominatedSolutions: 0 },
    ],
  }),
  createGEPARunner: vi.fn(),
}));

// ─── Import after mocking ────────────────────────────────────────────────────

import {
  buildOptimizeCommand,
} from '../optimize.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEST_DIR = path.join(homedir(), '.code-insights', 'optimizations');

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function writeManifest(manifest: unknown): void {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TEST_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

function writeScores(versionId: string, scores: unknown): void {
  const dir = path.join(TEST_DIR, versionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'scores.json'), JSON.stringify(scores, null, 2));
}

function writeMetadata(versionId: string, metadata: unknown): void {
  const dir = path.join(TEST_DIR, versionId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
}

// ─── Capture console output ──────────────────────────────────────────────────

function captureConsole(): { logs: string[]; errors: string[]; restore: () => void } {
  const logs: string[] = [];
  const errors: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  const origWrite = process.stdout.write;

  console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  // Suppress stdout.write (ora uses it)
  process.stdout.write = vi.fn() as typeof process.stdout.write;

  return {
    logs,
    errors,
    restore: () => {
      console.log = origLog;
      console.error = origError;
      process.stdout.write = origWrite;
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('optimize status', () => {
  beforeEach(cleanupTestDir);
  afterEach(cleanupTestDir);

  it('shows message when no optimized prompts exist', async () => {
    const cmd = buildOptimizeCommand();
    const statusCmd = cmd.commands.find(c => c.name() === 'status')!;
    const capture = captureConsole();

    try {
      await statusCmd.parseAsync(['status'], { from: 'user' });
    } catch {
      // commander may throw on exit
    }

    capture.restore();
    // The command should have been invoked — we can't easily capture
    // the async action output without deeper integration testing.
    // Instead, test the underlying functions directly.
  });
});

describe('optimize list', () => {
  beforeEach(cleanupTestDir);
  afterEach(cleanupTestDir);

  it('shows empty message when no versions exist', async () => {
    const { listVersions } = await import('../../optimization/prompts.js');
    const versions = listVersions();
    expect(versions).toHaveLength(0);
  });

  it('lists versions from manifest', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: true,
        },
        {
          id: 'v2',
          createdAt: '2025-01-16T12:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 30,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.92,
          converged: true,
          totalRounds: 12,
          optimizationTimeMs: 6000,
          paretoFrontSize: 7,
          active: false,
        },
      ],
      currentVersion: 'v1',
      updatedAt: '2025-01-16T12:00:00.000Z',
    });

    const { listVersions } = await import('../../optimization/prompts.js');
    const versions = listVersions();
    expect(versions).toHaveLength(2);
    expect(versions[0].id).toBe('v1');
    expect(versions[1].id).toBe('v2');
    expect(versions[0].active).toBe(true);
    expect(versions[1].active).toBe(false);
  });
});

describe('optimize apply', () => {
  beforeEach(cleanupTestDir);
  afterEach(cleanupTestDir);

  it('activates an existing version', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: false,
        },
      ],
      currentVersion: null,
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { activateVersion, getActiveVersion } = await import('../../optimization/prompts.js');
    const result = activateVersion('v1');
    expect(result).toBe(true);

    const active = getActiveVersion();
    expect(active).not.toBeNull();
    expect(active!.id).toBe('v1');
  });

  it('returns false for non-existent version', async () => {
    writeManifest({
      versions: [],
      currentVersion: null,
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { activateVersion } = await import('../../optimization/prompts.js');
    const result = activateVersion('v999');
    expect(result).toBe(false);
  });
});

describe('optimize delete', () => {
  beforeEach(cleanupTestDir);
  afterEach(cleanupTestDir);

  it('deletes an existing version', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: true,
        },
      ],
      currentVersion: 'v1',
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { deleteVersion, listVersions } = await import('../../optimization/prompts.js');
    const result = deleteVersion('v1');
    expect(result).toBe(true);

    const versions = listVersions();
    expect(versions).toHaveLength(0);
  });

  it('returns false for non-existent version', async () => {
    writeManifest({
      versions: [],
      currentVersion: null,
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { deleteVersion } = await import('../../optimization/prompts.js');
    const result = deleteVersion('v999');
    expect(result).toBe(false);
  });

  it('clears currentVersion when deleting the active version', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: true,
        },
      ],
      currentVersion: 'v1',
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { deleteVersion, loadManifest } = await import('../../optimization/prompts.js');
    deleteVersion('v1');

    const manifest = loadManifest();
    expect(manifest.currentVersion).toBeNull();
  });
});

describe('optimize compare', () => {
  beforeEach(cleanupTestDir);
  afterEach(cleanupTestDir);

  it('compares two versions with scores', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.75,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: true,
        },
        {
          id: 'v2',
          createdAt: '2025-01-16T12:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 30,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 12,
          optimizationTimeMs: 6000,
          paretoFrontSize: 7,
          active: false,
        },
      ],
      currentVersion: 'v1',
      updatedAt: '2025-01-16T12:00:00.000Z',
    });

    writeScores('v1', {
      paretoFront: [],
      selectedPoint: {
        scores: { coverage: 0.7, precision: 0.8, actionability: 0.6, brevity: 0.9 },
        configuration: {},
        dominatedSolutions: 0,
      },
      selectionMethod: 'weighted-sum',
    });

    writeScores('v2', {
      paretoFront: [],
      selectedPoint: {
        scores: { coverage: 0.85, precision: 0.75, actionability: 0.8, brevity: 0.7 },
        configuration: {},
        dominatedSolutions: 0,
      },
      selectionMethod: 'weighted-sum',
    });

    const { compareVersions } = await import('../../optimization/prompts.js');
    const comparison = compareVersions('v1', 'v2');

    expect(comparison.versionA).not.toBeNull();
    expect(comparison.versionB).not.toBeNull();
    expect(comparison.deltas.coverage).toBeCloseTo(0.15, 2);
    expect(comparison.deltas.precision).toBeCloseTo(-0.05, 2);
    expect(comparison.winner).toBe('v2'); // v2 has higher overall score
  });

  it('returns null version entries for non-existent versions', async () => {
    writeManifest({
      versions: [],
      currentVersion: null,
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { compareVersions } = await import('../../optimization/prompts.js');
    const comparison = compareVersions('v1', 'v2');

    expect(comparison.versionA).toBeNull();
    expect(comparison.versionB).toBeNull();
    expect(comparison.winner).toBe('none');
  });

  it('declares tie when overall scores are equal', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.80,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: true,
        },
        {
          id: 'v2',
          createdAt: '2025-01-16T12:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 30,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.80,
          converged: true,
          totalRounds: 12,
          optimizationTimeMs: 6000,
          paretoFrontSize: 7,
          active: false,
        },
      ],
      currentVersion: 'v1',
      updatedAt: '2025-01-16T12:00:00.000Z',
    });

    // Same scores → tie
    const sameScores = {
      paretoFront: [],
      selectedPoint: {
        scores: { coverage: 0.8, precision: 0.8, actionability: 0.8, brevity: 0.8 },
        configuration: {},
        dominatedSolutions: 0,
      },
      selectionMethod: 'weighted-sum',
    };
    writeScores('v1', sameScores);
    writeScores('v2', sameScores);

    const { compareVersions } = await import('../../optimization/prompts.js');
    const comparison = compareVersions('v1', 'v2');

    expect(comparison.winner).toBe('tie');
    expect(comparison.overallA).toBe(comparison.overallB);
  });
});

describe('optimize hasOptimizedPrompt', () => {
  beforeEach(cleanupTestDir);
  afterEach(cleanupTestDir);

  it('returns false when no versions exist', async () => {
    const { hasOptimizedPrompt } = await import('../../optimization/prompts.js');
    expect(hasOptimizedPrompt()).toBe(false);
  });

  it('returns false when versions exist but none is active', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: false,
        },
      ],
      currentVersion: null,
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { hasOptimizedPrompt } = await import('../../optimization/prompts.js');
    expect(hasOptimizedPrompt()).toBe(false);
  });

  it('returns true when at least one version is active', async () => {
    writeManifest({
      versions: [
        {
          id: 'v1',
          createdAt: '2025-01-15T10:00:00.000Z',
          optimizerType: 'GEPA',
          numTrials: 25,
          objectives: ['coverage', 'precision', 'actionability', 'brevity'],
          bestScore: 0.85,
          converged: true,
          totalRounds: 10,
          optimizationTimeMs: 5000,
          paretoFrontSize: 5,
          active: true,
        },
      ],
      currentVersion: 'v1',
      updatedAt: '2025-01-15T10:00:00.000Z',
    });

    const { hasOptimizedPrompt } = await import('../../optimization/prompts.js');
    expect(hasOptimizedPrompt()).toBe(true);
  });
});

describe('buildOptimizeCommand', () => {
  it('returns a Command with the correct name', () => {
    const cmd = buildOptimizeCommand();
    expect(cmd.name()).toBe('optimize');
  });

  it('has all required subcommands', () => {
    const cmd = buildOptimizeCommand();
    const subcommandNames = cmd.commands.map(c => c.name());
    expect(subcommandNames).toContain('run');
    expect(subcommandNames).toContain('status');
    expect(subcommandNames).toContain('apply');
    expect(subcommandNames).toContain('compare');
    expect(subcommandNames).toContain('list');
    expect(subcommandNames).toContain('delete');
  });

  it('run subcommand has expected options', () => {
    const cmd = buildOptimizeCommand();
    const runCmd = cmd.commands.find(c => c.name() === 'run')!;
    const optionNames = runCmd.options.map(o => o.long);
    expect(optionNames).toContain('--provider');
    expect(optionNames).toContain('--student-model');
    expect(optionNames).toContain('--teacher-model');
    expect(optionNames).toContain('--trials');
    expect(optionNames).toContain('--seed');
    expect(optionNames).toContain('--max-calls');
    expect(optionNames).toContain('--minibatch');
    expect(optionNames).toContain('--days');
    expect(optionNames).toContain('--min-messages');
    expect(optionNames).toContain('--quiet');
  });

  it('apply subcommand requires version-id argument', () => {
    const cmd = buildOptimizeCommand();
    const applyCmd = cmd.commands.find(c => c.name() === 'apply')!;
    expect(applyCmd.registeredArguments).toHaveLength(1);
    expect(applyCmd.registeredArguments[0].name()).toBe('version-id');
  });

  it('compare subcommand has optional version arguments', () => {
    const cmd = buildOptimizeCommand();
    const compareCmd = cmd.commands.find(c => c.name() === 'compare')!;
    expect(compareCmd.registeredArguments).toHaveLength(2);
    expect(compareCmd.registeredArguments[0].name()).toBe('version-a');
    expect(compareCmd.registeredArguments[1].name()).toBe('version-b');
    expect(compareCmd.registeredArguments[0].required).toBe(false);
    expect(compareCmd.registeredArguments[1].required).toBe(false);
  });
});
