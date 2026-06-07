/**
 * optimize command — GEPA prompt optimization for insight generation.
 *
 * Subcommands:
 *   code-insights optimize run              Run GEPA optimization
 *   code-insights optimize status           Show current optimization state
 *   code-insights optimize apply <id>       Apply an optimized prompt
 *   code-insights optimize compare          A/B compare two prompt versions
 *   code-insights optimize list             List all optimization versions
 *   code-insights optimize delete <id>      Delete an optimization version
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
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
  loadManifest,
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
  const spinner = opts.quiet ? null : ora();

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
  if (spinner) spinner.start('Loading training data from sessions...');
  log(chalk.white('  Loading training data from sessions...'));

  let trainingData: TrainingExample[];
  try {
    trainingData = loadTrainingData(parseInt(opts.days, 10), parseInt(opts.minMessages, 10));
  } catch (err) {
    if (spinner) spinner.fail('Failed to load training data');
    console.error(chalk.red(`\n  Error loading training data: ${err instanceof Error ? err.message : String(err)}`));
    console.error(chalk.dim('  Run `code-insights sync` first to import sessions.'));
    console.error('');
    process.exit(1);
  }

  if (trainingData.length === 0) {
    if (spinner) spinner.fail('No training data available');
    console.error(chalk.red('\n  Error: No sessions found for training.'));
    console.error(chalk.dim('  Run `code-insights sync` first to import sessions.'));
    console.error('');
    process.exit(1);
  }

  if (spinner) spinner.succeed(`Loaded ${trainingData.length} training examples`);
  log(chalk.green(`  Loaded ${trainingData.length} training examples`));

  // 3. Split into train/validation (80/20)
  const splitIdx = Math.floor(trainingData.length * 0.8);
  const trainSet = trainingData.slice(0, splitIdx);
  const valSet = trainingData.slice(splitIdx);

  log(chalk.dim(`  Train: ${trainSet.length}, Validation: ${valSet.length}`));

  // 4. Run GEPA optimization with progress spinner
  log(chalk.white('\n  Running GEPA optimization...'));
  log(chalk.dim(`  Student: ${opts.provider}/${opts.studentModel}`));
  log(chalk.dim(`  Teacher: ${opts.provider}/${opts.teacherModel}`));
  log(chalk.dim(`  Trials: ${opts.trials}, Seed: ${opts.seed}`));
  log('');

  if (spinner) {
    spinner.start('Initializing GEPA optimizer...');
    spinner.text = `Optimizing prompts (${opts.trials} trials)...`;
  }

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

    if (spinner) spinner.succeed('Optimization complete!');

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
    if (spinner) spinner.fail('Optimization failed');

    // Typed error display
    const message = err instanceof Error ? err.message : String(err);
    const kind = err instanceof Error && 'kind' in err
      ? (err as Error & { kind: string }).kind
      : 'unknown';

    const hintMap: Record<string, string> = {
      'rate-limit': 'Wait a moment and try again, or use --max-calls to reduce API usage.',
      'timeout': 'Try with fewer --trials or a lower --max-calls limit.',
      'auth': 'Check that your API key is valid and has sufficient permissions.',
      'network': 'Check your internet connection and try again.',
      'validation': 'Check your input data and options.',
      'compile': 'The optimizer encountered an internal error. Try with different options.',
    };

    console.error(chalk.red(`\n  Optimization failed (${kind}): ${message}`));
    const hint = hintMap[kind];
    if (hint) {
      console.error(chalk.dim(`  Hint: ${hint}`));
    }
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

  const spinner = ora(`Activating version ${versionId}...`).start();

  try {
    const success = activateVersion(versionId);

    if (success) {
      spinner.succeed(`Activated version ${versionId}`);
      console.log(chalk.dim('  This prompt will be used for future insight generation.\n'));
    } else {
      spinner.fail(`Version ${versionId} not found`);
      console.error(chalk.dim('  Run `code-insights optimize list` to see available versions.\n'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail('Failed to activate version');
    console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
    console.error('');
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

  // Look up full manifest entries for metadata display
  const manifest = loadManifest();
  const manifestA = manifest.versions.find(v => v.id === idA);
  const manifestB = manifest.versions.find(v => v.id === idB);

  console.log(chalk.white(`  Comparing ${chalk.bold(idA)} vs ${chalk.bold(idB)}\n`));

  // Metadata comparison
  console.log(chalk.white('  Metadata:'));
  console.log(chalk.dim(`    ${'Property'.padEnd(20)} ${idA.padEnd(15)} ${idB}`));
  console.log(chalk.dim(`    ${'─'.repeat(60)}`));
  console.log(chalk.dim(`    ${'Created'.padEnd(20)} ${(manifestA?.createdAt.slice(0, 19) ?? 'N/A').padEnd(15)} ${manifestB?.createdAt.slice(0, 19) ?? 'N/A'}`));
  console.log(chalk.dim(`    ${'Best Score'.padEnd(20)} ${(manifestA?.bestScore.toFixed(3) ?? 'N/A').padEnd(15)} ${manifestB?.bestScore.toFixed(3) ?? 'N/A'}`));
  console.log(chalk.dim(`    ${'Converged'.padEnd(20)} ${(manifestA?.converged ? 'yes' : 'no').padEnd(15)} ${manifestB?.converged ? 'yes' : 'no'}`));
  console.log(chalk.dim(`    ${'Pareto Size'.padEnd(20)} ${(String(manifestA?.paretoFrontSize) ?? 'N/A').padEnd(15)} ${manifestB?.paretoFrontSize ?? 'N/A'}`));

  // Scores comparison
  const scoresA = comparison.versionA.scores;
  const scoresB = comparison.versionB.scores;
  if (scoresA && scoresB) {
    console.log(chalk.white('\n  Scores:'));
    console.log(chalk.dim(`    ${'Objective'.padEnd(15)} ${idA.padEnd(12)} ${idB.padEnd(12)} Diff`));
    console.log(chalk.dim(`    ${'─'.repeat(55)}`));

    const allKeys = new Set([
      ...Object.keys(scoresA),
      ...Object.keys(scoresB),
    ]);

    for (const key of allKeys) {
      const scoreA = scoresA[key] ?? 0;
      const scoreB = scoresB[key] ?? 0;
      const diff = scoreB - scoreA;
      const diffStr = diff > 0 ? chalk.green(`+${diff.toFixed(3)}`) : diff < 0 ? chalk.red(diff.toFixed(3)) : chalk.dim('0.000');

      console.log(chalk.dim(`    ${key.padEnd(15)} ${scoreA.toFixed(3).padEnd(12)} ${scoreB.toFixed(3).padEnd(12)} ${diffStr}`));
    }

    // Overall scores from comparison
    console.log(chalk.dim(`    ${'─'.repeat(55)}`));
    console.log(chalk.dim(`    ${'Overall'.padEnd(15)} ${comparison.overallA.toFixed(3).padEnd(12)} ${comparison.overallB.toFixed(3).padEnd(12)}`));
    const winnerStr = comparison.winner === 'tie' ? 'Tie' : comparison.winner === idA ? idA : idB;
    console.log(chalk.white(`\n  Winner: ${chalk.bold(winnerStr)}`));
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

  const spinner = ora(`Deleting version ${versionId}...`).start();

  try {
    const success = deleteVersion(versionId);

    if (success) {
      spinner.succeed(`Deleted version ${versionId}`);
      console.log('');
    } else {
      spinner.fail(`Version ${versionId} not found`);
      console.error(chalk.dim('  Run `code-insights optimize list` to see available versions.\n'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail('Failed to delete version');
    console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
    console.error('');
    process.exit(1);
  }
}

// ── Topic extraction ─────────────────────────────────────────────────────────

/**
 * Extract key technical topics from transcript text.
 * Uses simple heuristics: capitalized multi-word phrases, file paths, tool names,
 * error patterns, and quoted strings. Deduplicates and returns at least `minTopics`.
 *
 * @param transcript  The session transcript text.
 * @param projectName The project name (always included as a topic).
 * @param summary     Optional session summary (included if non-empty).
 * @param minTopics   Minimum number of topics to return (default 5).
 */
function extractTopicsFromTranscript(
  transcript: string,
  projectName: string,
  summary: string | null,
  minTopics: number = 5,
): string[] {
  const topics = new Set<string>();

  // Always include project name (trimmed, skip if too generic)
  const trimmedProject = projectName.trim();
  if (trimmedProject && trimmedProject.length > 1 && !/^\d+$/.test(trimmedProject)) {
    topics.add(trimmedProject);
  }

  // Include summary if it's substantive (more than just a few words of metadata)
  if (summary && summary.trim().length > 3) {
    // Extract the first meaningful clause (up to 8 words)
    const summaryWords = summary.trim().split(/\s+/).slice(0, 8).join(' ');
    topics.add(summaryWords);
  }

  // Extract file names (e.g. src/foo/bar.ts, package.json, *.py)
  const filePattern = /\b[\w./-]+\.(ts|js|py|rb|go|json|yaml|yml|toml|md|sh|bash|txt|csv|sql|html|css|rs|java|c|cpp|h|hpp)\b/g;
  for (const match of transcript.matchAll(filePattern)) {
    topics.add(match[0]);
    if (topics.size >= minTopics + 3) break;
  }

  // Extract tool/command names (words after "tool_", "run_", or CLI-like names)
  const toolPattern = /\b(tool_\w+|create_\w+|execute_\w+|read_file|write_file|search_files|terminal|browser_\w+|web_search|web_extract|image_gen\w*)\b/g;
  for (const match of transcript.matchAll(toolPattern)) {
    topics.add(match[0]);
    if (topics.size >= minTopics + 6) break;
  }

  // Extract error/message patterns (e.g. "Error:", "ENOENT", "TypeError")
  const errorPattern = /\b([A-Z][a-z]+Error|ENOENT|ENOTEMPTY|EACCES|EPIPE|TypeError|ReferenceError|SyntaxError|AssertionError|RangeError)\b/g;
  for (const match of transcript.matchAll(errorPattern)) {
    topics.add(match[0]);
    if (topics.size >= minTopics + 9) break;
  }

  // Extract capitalized multi-word technical terms (e.g. "GitHub Actions", "Type System")
  const capTermPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  for (const match of transcript.matchAll(capTermPattern)) {
    // Skip common sentence starters
    if (!/^(I |We |The |This |That |It |You |He |She |They |My |Your |Our |Their )/.test(match[1])) {
      topics.add(match[1]);
      if (topics.size >= minTopics + 12) break;
    }
  }

  // Extract quoted strings that look like identifiers or paths
  const quotedPattern = /["']([a-zA-Z_][\w./-]+)["']/g;
  for (const match of transcript.matchAll(quotedPattern)) {
    if (match[1].includes('.') || match[1].includes('/') || match[1].length > 3) {
      topics.add(match[1]);
      if (topics.size >= minTopics + 15) break;
    }
  }

  // If we still don't have enough topics, fall back to top-frequency meaningful words
  if (topics.size < minTopics) {
    const words = transcript.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'user', 'assistant']);
    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      const clean = word.replace(/[^a-z0-9_-]/g, '');
      if (clean.length >= 4 && !stopWords.has(clean)) {
        wordFreq[clean] = (wordFreq[clean] || 0) + 1;
      }
    }
    const sorted = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w);
    for (const word of sorted) {
      if (topics.size >= minTopics) break;
      topics.add(word);
    }
  }

  return Array.from(topics).slice(0, Math.max(minTopics, topics.size));
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

      // Extract topics from transcript content: file names, tool names, error messages, technical terms
      const sessionTopics = extractTopicsFromTranscript(sessionData, session.project_name, session.summary);

      examples.push({
        sessionData,
        expectedInsightCount: Math.max(2, Math.floor(session.message_count / 20)),
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
