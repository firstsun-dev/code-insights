/**
 * home command suite — manage multi-home-directory configuration.
 *
 * Subcommands:
 *   add <path>      Register a new home root directory
 *     --label <name>
 *   list            Show all configured homes
 *   remove <id>     Unregister a home (default cannot be removed)
 *   enable <id>     Include a home in default sync
 *   disable <id>    Exclude a home from default sync
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { addHome, listHomes, removeHome, setHomeEnabled } from '../db/homes.js';

// ── home add ──────────────────────────────────────────────────────────────────

export function homeAddCommand(rawPath: string, opts: { label?: string } = {}): void {
  try {
    const home = addHome(rawPath, opts.label);
    console.log(chalk.green(`[Code Insights] Added home '${home.label}' (id: ${home.id})`));
    console.log(chalk.dim(`  ${home.path}`));
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Failed to add home'));
    process.exitCode = 1;
  }
}

// ── home list ─────────────────────────────────────────────────────────────────

export function homeListCommand(): void {
  const homes = listHomes();

  if (homes.length === 0) {
    console.log(chalk.dim('[Code Insights] No homes configured'));
    return;
  }

  console.log(chalk.cyan('\n  Homes\n'));
  console.log(
    chalk.dim(
      `  ${'ID'.padEnd(18)} ${'LABEL'.padEnd(20)} ${'ENABLED'.padEnd(9)} ${'CREATED'.padEnd(21)} PATH`
    )
  );
  for (const home of homes) {
    const enabledMark = home.enabled ? chalk.green('✓'.padEnd(9)) : chalk.red('✗'.padEnd(9));
    console.log(
      `  ${home.id.padEnd(18)} ${home.label.padEnd(20)} ${enabledMark} ${home.createdAt.padEnd(21)} ${chalk.dim(home.path)}`
    );
  }
  console.log('');
}

// ── home remove ───────────────────────────────────────────────────────────────

export function homeRemoveCommand(id: string): void {
  try {
    removeHome(id);
    console.log(chalk.green(`[Code Insights] Removed home '${id}'`));
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Failed to remove home'));
    process.exitCode = 1;
  }
}

// ── home enable / disable ────────────────────────────────────────────────────

export function homeEnableCommand(id: string): void {
  try {
    setHomeEnabled(id, true);
    console.log(chalk.green(`[Code Insights] Enabled home '${id}'`));
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Failed to enable home'));
    process.exitCode = 1;
  }
}

export function homeDisableCommand(id: string): void {
  try {
    setHomeEnabled(id, false);
    console.log(chalk.green(`[Code Insights] Disabled home '${id}'`));
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Failed to disable home'));
    process.exitCode = 1;
  }
}

// ── Commander command tree ────────────────────────────────────────────────────

export function buildHomeCommand(): Command {
  const homeCmd = new Command('home')
    .description('Manage multi-home-directory configuration');

  homeCmd
    .command('add <path>')
    .description('Register a new home root directory')
    .option('--label <name>', 'Human-readable label for this home')
    .action((homePath: string, opts) => homeAddCommand(homePath, { label: opts.label }));

  homeCmd
    .command('list')
    .description('Show all configured homes')
    .action(() => homeListCommand());

  homeCmd
    .command('remove <id>')
    .description('Unregister a home (the default home cannot be removed)')
    .action((id: string) => homeRemoveCommand(id));

  homeCmd
    .command('enable <id>')
    .description('Include a home in default sync')
    .action((id: string) => homeEnableCommand(id));

  homeCmd
    .command('disable <id>')
    .description('Exclude a home from default sync')
    .action((id: string) => homeDisableCommand(id));

  return homeCmd;
}
