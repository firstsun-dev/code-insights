/**
 * optimize command — GEPA prompt optimization for insight generation.
 *
 * Subcommands:
 *   code-insights optimize run              Run GEPA optimization
 *   code-insights optimize status           Show current optimization state
 *   code-insights optimize apply <id>       Apply an optimized prompt
 *   code-insights optimize compare          A/B compare two prompt versions
 *   code-insights optimize list             List all optimization versions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getDb } from '../db/client.js';
import { loadConfig } from '../utils/config.js';
import { runGEPAOptimization, createGEPARunner } from '../optimization/runner.js';
import {
  listVersions,
  getActiveVersion,
  activateVersion,
  deleteVersion,
  compareVersions,
  loadScores,
  loadMetadata,
  hasOptimizedPrompt,
} from '../optimization/prompts.js';
import type { TrainingExample } from '../optimization/runner.js';

// ── Main optimize command ────────────────────────────────────────────────────

export function buildOptimizeCommand(): Command {
  const cmd = new Command('optimize')
    .description('GEPA prompt optimization for insight generation');

  cmd
    .command('run')
    .description('Run GEPA optimization on insight generation prompts')
    .option('-p, --provider <name>', 'LLM provider (openai, anthropic, mistral, deepseek, cohere, google-gemini)', 'openai')
    .option('--student-model <model>', 'Student model (fast/cheap)', 'gpt-4o-mini')
    .option('--teacher-model <model>', 'Teacher model (strong)', 'claude-sonnet-4-20250514')
    .option('-n, --trials <n>', 'Number of optimization trials', '25')
    .option('--seed <n>', 'Random seed for reproducibility', '42')
    .option('--max-calls <n>', 'Max metric calls (cost bound)', '200')
    .option('--minibatch <n>', 'Minibatch size', '6')
    .option('--days <n>', 'Use sessions from last N days for training', '30')
    .option('--min-messages <n>', 'Minimum messages per session', '10')
    .option('-q, --quiet', 'Suppress progress output')
    .action(async (opts) => {
      await runOptimize(opts);
    });

  cmd
    .command('status')
    .description('Show current optimization state')
    .action(async () => {
      await showStatus();
    });

  cmd
    .command('apply <version-id>')
    .description('Apply an optimized prompt version')
    .action(async (versionId: string) => {
      await applyVersion(versionId);
    });

  cmd
    .command('compare [version-a] [version-b]')
    .description('A/B compare two prompt versions (default: active vs latest)')
    .action(async (versionA: string | undefined, versionB: string | undefined) => {
      await compareVersionsCmd(versionA, versionB);
    });

  cmd
    .command('list')
    .description('List all optimization versions')
    .action(async () => {
      await listVersionsCmd();
    });

  cmd
    .command('delete <version-id>')
    .description('Delete an optimization version')
    .action(async (versionId: string) => {
      await deleteVersionCmd(versionId);
    });

  return cmd;
}

// ── Subcommand implementations ───────────────────────────────────────────────

async function runOptimize(opts: {
  provider: string;
  studentModel: string;
  teacherModel: string;
  trials: string;
  seed: string;
  maxCalls: string;
  minibatch: string;
  days: string;
  minMessages: string;
  quiet: boolean;
}): Promise<void> {
  const log = opts.quiet ? () => {} : console.log;

  log(chalk.cyan('\n  Code Insights — GEPA Prompt Optimization\n'));

  // 1. Resolve API key
  const apiKeyEnvMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    cohere: 'COHERE_API_KEY',
    'google-gemini': 'GEMINI_API_KEY',
  };

  const apiKeyEnv = apiKeyEnvMap[opts.provider];
  const apiKey = process.env[apiKeyEnv ?? ''];

  if (!apiKey) {
    console.error(chalk.red(`\n  Error: No API key for provider '${opts.provider}'.`));
    if (apiKeyEnv) {
      console.error(chalk.dim(`  Set ${apiKeyEnv} environment variable.`));
    }
    console.error('');
    process.exit(1);
  }

  // 2. Load training data from sessions
  log(chalk.white('  Loading training data from sessions...'));
  const trainingData = loadTrainingData(parseInt(opts.days, 10), parseInt(opts.minMessages, 10));

  if (trainingData.length === 0) {
    console.error(chalk.red('\n  Error: No sessions found for training.'));
    console.error(chalk.dim('  Run `code-insights sync` first to import sessions.'));
    console.error('');
    process.exit(1);
  }

  log(chalk.green(`  Loaded ${trainingData.length} training examples`));

  // 3. Split into train/validation (80/20)
  const splitIdx = Math.floor(trainingData.length * 0.8);
  const trainSet = trainingData.slice(0, splitIdx);
  const valSet = trainingData.slice(splitIdx);

  log(chalk.dim(`  Train: ${trainSet.length}, Validation: ${valSet.length}`));

  // 4. Run GEPA optimization
  log(chalk.white('\n  Running GEPA optimization...'));
  log(chalk.dim(`  Student: ${opts.provider}/${opts.studentModel}`));
  log(chalk.dim(`  Teacher: ${opts.provider}/${opts.teacherModel}`));
  log(chalk.dim(`  Trials: ${opts.trials}, Seed: ${opts.seed}`));
  log('');

  try {
    const result = await runGEPAOptimization(trainSet, valSet, {
      studentProvider: opts.provider as 'openai' | 'anthropic' | 'mistral' | 'deepseek' | 'cohere' | 'google-gemini',
      studentApiKey: apiKey,
      studentModel: opts.studentModel,
      teacherModel: opts.teacherModel,
      numTrials: parseInt(opts.trials, 10),
      seed: parseInt(opts.seed, 10),
      maxMetricCalls: parseInt(opts.maxCalls, 10),
      minibatchSize: parseInt(opts.minibatch, 10),
      verbose: !opts.quiet,
    });

    // 5. Display results
    log(chalk.green('\n  Optimization complete!\n'));
    log(chalk.white(`  Version: ${chalk.bold(result.versionId)}`));
    log(chalk.white(`  Pareto frontier: ${result.paretoFront.length} solutions`));
    log(chalk.white(`  Best score: ${result.paretoResult.bestScore.toFixed(3)}`));
    log(chalk.white(`  Converged: ${result.paretoResult.optimizedProgram?.converged ? chalk.green('yes') : chalk.yellow('no')}`));

    if (result.selectedPoint) {
      log(chalk.white('\n  Selected trade-off (weighted-sum):'));
      for (const [obj, score] of Object.entries(result.selectedPoint.scores)) {
        const bar = '█'.repeat(Math.round(score * 20));
        const padded = bar.padEnd(20, '░');
        log(chalk.dim(`    ${obj.padEnd(15)} ${padded} ${score.toFixed(3)}`));
      }
    }

    log(chalk.dim(`\n  Artifact saved to ~/.code-insights/optimizations/${result.versionId}/`));
    log('');
  } catch (err) {
    console.error(chalk.red(`\n  Optimization failed: ${err instanceof Error ? err.message : String(err)}`));
    console.error('');
    process.exit(1);
  }
}

async function showStatus(): Promise<void> {
  console.log(chalk.cyan('\n  Code Insights — Optimization Status\n'));

  if (!hasOptimizedPrompt()) {
    console.log(chalk.yellow('  No optimized prompts available.'));
    console.log(chalk.dim('  Run `code-insights optimize run` to start optimization.\n'));
    return;
  }

  const active = getActiveVersion();
  if (active) {
    console.log(chalk.white(`  Active version: ${chalk.bold(active.id)}`));
    console.log(chalk.dim(`  Created: ${active.createdAt}`));
    console.log(chalk.dim(`  Optimizer: ${active.optimizerType}`));
    console.log(chalk.dim(`  Best score: ${active.bestScore.toFixed(3)}`));
    console.log(chalk.dim(`  Converged: ${active.converged ? 'yes' : 'no'}`));
    console.log(chalk.dim(`  Pareto front: ${active.paretoFrontSize} solutions`));
    console.log(chalk.dim(`  Hypervolume: ${active.hypervolume?.toFixed(4) ?? 'N/A'}`));
  }

  const allVersions = listVersions();
  console.log(chalk.white(`\n  Total versions: ${allVersions.length}`));

  const scores = active ? loadScores(active.id) : null;
  if (scores?.selectedPoint) {
    console.log(chalk.white('\n  Active prompt scores:'));
    for (const [obj, score] of Object.entries(scores.selectedPoint.scores)) {
      const bar = '█'.repeat(Math.round(score * 20));
      const padded = bar.padEnd(20, '░');
      console.log(chalk.dim(`    ${obj.padEnd(15)} ${padded} ${score.toFixed(3)}`));
    }
  }

  console.log('');
}

async function applyVersion(versionId: string): Promise<void> {
  console.log(chalk.cyan('\n  Code Insights — Apply Optimized Prompt\n'));

  const success = activateVersion(versionId);

  if (success) {
    console.log(chalk.green(`  Activated version ${versionId}`));
    console.log(chalk.dim('  This prompt will be used for future insight generation.\n'));
  } else {
    console.error(chalk.red(`  Version ${versionId} not found.`));
    console.error(chalk.dim('  Run `code-insights optimize list` to see available versions.\n'));
    process.exit(1);
  }
}

async function compareVersionsCmd(
  versionA: string | undefined,
  versionB: string | undefined
): Promise<void> {
  console.log(chalk.cyan('\n  Code Insights — Compare Prompt Versions\n'));

  const versions = listVersions();

  if (versions.length < 2) {
    console.log(chalk.yellow('  Need at least 2 versions to compare.'));
    console.log(chalk.dim(`  Currently have ${versions.length} version(s).\n`));
    return;
  }

  // Default: active vs latest
  const active = getActiveVersion();
  const latest = versions[versions.length - 1];

  const idA = versionA ?? active?.id ?? versions[0].id;
  const idB = versionB ?? latest.id;

  const comparison = compareVersions(idA, idB);

  if (!comparison.versionA || !comparison.versionB) {
    console.error(chalk.red('  One or both versions not found.\n'));
    process.exit(1);
  }

  console.log(chalk.white(`  Comparing ${chalk.bold(idA)} vs ${chalk.bold(idB)}\n`));

  // Metadata comparison
  console.log(chalk.white('  Metadata:'));
  console.log(chalk.dim(`    ${'Property'.padEnd(20)} ${idA.padEnd(15)} ${idB}`));
  console.log(chalk.dim(`    ${'─'.repeat(60)}`));
  console.log(chalk.dim(`    ${'Created'.padEnd(20)} ${comparison.versionA.createdAt.slice(0, 19).padEnd(15)} ${comparison.versionB.createdAt.slice(0, 19)}`));
  console.log(chalk.dim(`    ${'Best Score'.padEnd(20)} ${comparison.versionA.bestScore.toFixed(3).padEnd(15)} ${comparison.versionB.bestScore.toFixed(3)}`));
  console.log(chalk.dim(`    ${'Converged'.padEnd(20)} ${(comparison.versionA.converged ? 'yes' : 'no').padEnd(15)} ${comparison.versionB.converged ? 'yes' : 'no'}`));
  console.log(chalk.dim(`    ${'Pareto Size'.padEnd(20)} ${String(comparison.versionA.paretoFrontSize).padEnd(15)} ${comparison.versionB.paretoFrontSize}`));

  // Scores comparison
  if (comparison.scoresA?.selectedPoint && comparison.scoresB?.selectedPoint) {
    console.log(chalk.white('\n  Scores:'));
    console.log(chalk.dim(`    ${'Objective'.padEnd(15)} ${idA.padEnd(12)} ${idB.padEnd(12)} Diff`));
    console.log(chalk.dim(`    ${'─'.repeat(55)}`));

    const allKeys = new Set([
      ...Object.keys(comparison.scoresA.selectedPoint.scores),
      ...Object.keys(comparison.scoresB.selectedPoint.scores),
    ]);

    for (const key of allKeys) {
      const scoreA = comparison.scoresA.selectedPoint.scores[key] ?? 0;
      const scoreB = comparison.scoresB.selectedPoint.scores[key] ?? 0;
      const diff = scoreB - scoreA;
      const diffStr = diff > 0 ? chalk.green(`+${diff.toFixed(3)}`) : diff < 0 ? chalk.red(diff.toFixed(3)) : chalk.dim('0.000');

      console.log(chalk.dim(`    ${key.padEnd(15)} ${scoreA.toFixed(3).padEnd(12)} ${scoreB.toFixed(3).padEnd(12)} ${diffStr}`));
    }
  }

  console.log('');
}

async function listVersionsCmd(): Promise<void> {
  console.log(chalk.cyan('\n  Code Insights — Optimization Versions\n'));

  const versions = listVersions();

  if (versions.length === 0) {
    console.log(chalk.dim('  No optimization versions found.'));
    console.log(chalk.dim('  Run `code-insights optimize run` to create one.\n'));
    return;
  }

  for (const v of versions) {
    const activeMarker = v.active ? chalk.green(' ●') : '  ';
    console.log(`${activeMarker} ${chalk.white.bold(v.id)} ${chalk.dim(v.createdAt.slice(0, 19))}`);
    console.log(chalk.dim(`    Score: ${v.bestScore.toFixed(3)} | Pareto: ${v.paretoFrontSize} | Converged: ${v.converged ? 'yes' : 'no'}`));
  }

  console.log('');
}

async function deleteVersionCmd(versionId: string): Promise<void> {
  console.log(chalk.cyan('\n  Code Insights — Delete Version\n'));

  const success = deleteVersion(versionId);

  if (success) {
    console.log(chalk.green(`  Deleted version ${versionId}\n`));
  } else {
    console.error(chalk.red(`  Version ${versionId} not found.\n`));
    process.exit(1);
  }
}

// ── Training data loading ────────────────────────────────────────────────────

/**
 * Load training examples from the sessions database.
 * Extracts session transcripts and metadata for GEPA optimization.
 */
function loadTrainingData(days: number, minMessages: number): TrainingExample[] {
  try {
    const db = getDb();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    // Get sessions with enough messages
    const sessions = db.prepare(`
      SELECT s.id, s.project_name, s.message_count, s.summary
      FROM sessions s
      WHERE s.ended_at >= ?
        AND s.message_count >= ?
        AND s.deleted_at IS NULL
      ORDER BY s.message_count DESC
      LIMIT 50
    `).all(sinceIso, minMessages) as Array<{
      id: string;
      project_name: string;
      message_count: number;
      summary: string | null;
    }>;

    const examples: TrainingExample[] = [];

    for (const session of sessions) {
      // Get messages for this session
      const messages = db.prepare(`
        SELECT content, type
        FROM messages
        WHERE session_id = ?
        ORDER BY timestamp ASC
        LIMIT 200
      `).all(session.id) as Array<{ content: string; type: string }>;

      if (messages.length < minMessages) continue;

      // Build a condensed transcript (truncate for cost efficiency)
      const transcriptParts: string[] = [];
      let totalChars = 0;
      const maxChars = 8000; // Truncate long sessions

      for (const msg of messages) {
        const prefix = msg.type === 'user' ? 'User: ' : 'Assistant: ';
        const text = msg.content.slice(0, 500); // Truncate individual messages
        const line = prefix + text;

        if (totalChars + line.length > maxChars) break;
        transcriptParts.push(line);
        totalChars += line.length;
      }

      const sessionData = transcriptParts.join('\n\n');

      // Extract topics from project name and summary
      const sessionTopics = [
        session.project_name,
        ...(session.summary ? [session.summary] : []),
      ].filter(Boolean) as string[];

      examples.push({
        sessionData,
        expectedInsightCount: Math.max(3, Math.floor(session.message_count / 10)),
        sessionTopics,
      });
    }

    return examples;
  } catch (err) {
    // Database not available or schema mismatch
    console.error(chalk.dim(`  Training data load warning: ${err instanceof Error ? err.message : String(err)}`));
    return [];
  }
}
