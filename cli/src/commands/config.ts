import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig, isConfigured } from '../utils/config.js';
import { trackEvent } from '../utils/telemetry.js';
import { PROVIDERS, getDefaultModel } from '../constants/llm-providers.js';
import type { ClaudeInsightConfig, LLMProviderConfig, LLMProvider } from '../types.js';

// Map provider -> env var name for display
const PROVIDER_API_KEY_ENV: Record<string, string> = {
  openai:     'OPENAI_API_KEY',
  anthropic:  'ANTHROPIC_API_KEY',
  gemini:     'GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  mistral:    'MISTRAL_API_KEY',
};

/**
 * Describe how the API key is being sourced for display purposes.
 */
function describeApiKeySource(provider: LLMProvider, hasStoredKey: boolean): string {
  const envVar = PROVIDER_API_KEY_ENV[provider];
  if (envVar && process.env[envVar]) {
    return '(from env var ' + envVar + ')';
  }
  if (hasStoredKey) {
    return '(session only — not persisted to disk)';
  }
  return '(not set — set ' + (envVar ?? 'the API key') + ' env var)';
}

/**
 * Show current configuration summary.
 */
function showConfigAction(): void {
  if (!isConfigured()) {
    console.log(chalk.yellow('\nNot configured. Run `code-insights init` to set up.\n'));
    return;
  }

  const config = loadConfig();
  if (!config) {
    console.log(chalk.red('\nFailed to load config.\n'));
    return;
  }

  console.log(chalk.cyan('\n  Code Insights Configuration\n'));

  // Sync
  console.log(chalk.white('  Sync:'));
  console.log(chalk.gray(`    Claude dir: ${config.sync.claudeDir}`));
  if (config.sync.excludeProjects.length > 0) {
    console.log(chalk.gray(`    Excluded:   ${config.sync.excludeProjects.join(', ')}`));
  }

  // Dashboard (Phase 3)
  if (config.dashboard?.port) {
    console.log(chalk.white('\n  Dashboard:'));
    console.log(chalk.gray(`    Port: ${config.dashboard.port}`));
  }

  // LLM config
  if (config.dashboard?.llm) {
    const llm = config.dashboard.llm;

    console.log(chalk.white('\n  LLM:'));
    console.log(chalk.gray(`    Provider: ${llm.provider}`));
    console.log(chalk.gray(`    Model:    ${llm.model}`));
    if (llm.provider !== 'ollama') {
      console.log(chalk.gray(`    API Key:  ${describeApiKeySource(llm.provider, !!llm.apiKey)}`));
    }
    if (llm.baseUrl) {
      console.log(chalk.gray(`    Base URL: ${llm.baseUrl}`));
    }
  }

  // Retrieval config (RAG for insight generation)
  if (config.dashboard?.analysis?.retrieval) {
    const r = config.dashboard.analysis.retrieval;
    console.log(chalk.white('\n  Retrieval (insight RAG):'));
    console.log(chalk.gray(`    Enabled:    ${r.enabled !== false ? 'yes' : 'no'}`));
    console.log(chalk.gray(`    Top-K:      ${r.topK ?? 5}`));
    console.log(chalk.gray(`    Threshold:  ${r.similarityThreshold ?? 0.75}`));
    console.log(chalk.gray(`    Same-proj:  ${r.sameProjectOnly !== false ? 'yes' : 'no'}`));
  }

  // Personality — cognitive function scoring mode
  {
    const p = config.dashboard?.analysis?.personality;
    const mode = p?.cognitiveFunctionScoring ?? 'formula';
    console.log(chalk.white('\n  Personality (cognitive functions):'));
    console.log(chalk.gray(`    Scoring:    ${mode}${mode === 'formula' ? ' (deterministic, default)' : ''}`));
    if (mode === 'llm-vote') {
      console.log(chalk.gray(`    Vote rounds: ${p?.llmVoteRounds ?? 3}`));
    }
  }

  // Telemetry — default is enabled; env vars can override at runtime
  console.log(chalk.white('\n  Telemetry:'));
  const telemetryEnabled = config.telemetry !== false;
  if (process.env.CODE_INSIGHTS_TELEMETRY_DISABLED === '1' || process.env.DO_NOT_TRACK === '1') {
    console.log(chalk.yellow('    Status:  disabled (via env var)'));
  } else {
    console.log(chalk.gray(`    Status:  ${telemetryEnabled ? 'enabled' : 'disabled'}`));
  }

  console.log('');
  trackEvent('cli_config', { subcommand: 'view', success: true });
}

export const configCommand = new Command('config')
  .description('Show Code Insights configuration')
  .action(() => {
    showConfigAction();
  });

configCommand
  .command('set <key> <value>')
  .description('Set a configuration value (telemetry, personality-scoring, personality-vote-rounds)')
  .action((key: string, value: string) => {
    if (key === 'telemetry') {
      if (value !== 'true' && value !== 'false') {
        console.error(chalk.red(`\nInvalid value "${value}". Must be "true" or "false".\n`));
        process.exit(1);
      }
      const existing = loadConfig();
      if (!existing) {
        saveConfig({
          sync: { claudeDir: '~/.claude/projects', excludeProjects: [] },
          telemetry: value === 'true',
        });
      } else {
        existing.telemetry = value === 'true';
        saveConfig(existing);
      }
      console.log(chalk.green(`\nTelemetry ${value === 'true' ? 'enabled' : 'disabled'}.\n`));
      trackEvent('cli_config', { subcommand: 'set', success: true });
    } else if (key === 'personality-scoring') {
      if (value !== 'formula' && value !== 'llm-vote') {
        console.error(chalk.red(`\nInvalid value "${value}". Must be "formula" or "llm-vote".\n`));
        process.exit(1);
      }
      const existing = loadConfig() ?? { sync: { claudeDir: '~/.claude/projects', excludeProjects: [] } };
      existing.dashboard = {
        ...existing.dashboard,
        analysis: {
          ...existing.dashboard?.analysis,
          personality: {
            ...existing.dashboard?.analysis?.personality,
            cognitiveFunctionScoring: value,
          },
        },
      };
      saveConfig(existing);
      console.log(chalk.green(`\nCognitive function scoring set to "${value}".`));
      if (value === 'llm-vote') {
        console.log(chalk.gray('  Only applies when generating a new snapshot (Generate button / POST /generate) — requires an LLM configured via `code-insights config llm`.\n'));
      } else {
        console.log('');
      }
      trackEvent('cli_config', { subcommand: 'set', success: true });
    } else if (key === 'personality-vote-rounds') {
      const rounds = parseInt(value, 10);
      if (!Number.isFinite(rounds) || rounds < 1 || rounds > 7) {
        console.error(chalk.red(`\nInvalid value "${value}". Must be an integer between 1 and 7.\n`));
        process.exit(1);
      }
      const existing = loadConfig() ?? { sync: { claudeDir: '~/.claude/projects', excludeProjects: [] } };
      existing.dashboard = {
        ...existing.dashboard,
        analysis: {
          ...existing.dashboard?.analysis,
          personality: {
            ...existing.dashboard?.analysis?.personality,
            llmVoteRounds: rounds,
          },
        },
      };
      saveConfig(existing);
      console.log(chalk.green(`\nLLM vote rounds set to ${rounds}.\n`));
      trackEvent('cli_config', { subcommand: 'set', success: true });
    } else {
      console.error(chalk.red(`\nUnknown config key "${key}". Available: telemetry, personality-scoring, personality-vote-rounds.\n`));
      process.exit(1);
    }
  });

// ── config llm ────────────────────────────────────────────────────────────────

const llmCommand = configCommand
  .command('llm')
  .description('Configure LLM provider for AI-powered session analysis')
  .option('--provider <provider>', 'LLM provider (openai, anthropic, gemini, ollama)')
  .option('--model <model>', 'Model ID (e.g., gpt-4o, claude-sonnet-4-20250514)')
  .option('--api-key <key>', 'API key for the selected provider')
  .option('--base-url <url>', 'Custom base URL (for Ollama or local endpoints)')
  .option('--show', 'Show current LLM configuration')
  .action(async (options: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    show?: boolean;
  }) => {
    // --show: display current LLM config and exit
    if (options.show) {
      const config = loadConfig();
      const llm = config?.dashboard?.llm;

      if (!llm) {
        console.log(chalk.yellow('\nLLM not configured. Run `code-insights config llm` to set up.\n'));
        return;
      }

      console.log(chalk.cyan('\n  LLM Configuration\n'));
      console.log(chalk.gray(`    Provider: ${llm.provider}`));
      console.log(chalk.gray(`    Model:    ${llm.model}`));
      if (llm.provider !== 'ollama') {
        console.log(chalk.gray(`    API Key:  ${describeApiKeySource(llm.provider, !!llm.apiKey)}`));
      }
      if (llm.baseUrl) {
        console.log(chalk.gray(`    Base URL: ${llm.baseUrl}`));
      }
      console.log('');
      return;
    }

    // Non-interactive: all required fields provided via flags
    if (options.provider && options.model) {
      const validProviders = PROVIDERS.map(p => p.id);
      if (!validProviders.includes(options.provider as LLMProviderConfig['provider'])) {
        console.error(chalk.red(`\nInvalid provider "${options.provider}". Must be one of: ${validProviders.join(', ')}\n`));
        process.exit(1);
      }

      const providerInfo = PROVIDERS.find(p => p.id === options.provider);
      if (providerInfo?.requiresApiKey && !options.apiKey) {
        console.error(chalk.red(`\nProvider "${options.provider}" requires an API key. Use --api-key <key>\n`));
        process.exit(1);
      }

      const llmConfig: LLMProviderConfig = {
        provider: options.provider as LLMProviderConfig['provider'],
        model: options.model,
        ...(options.apiKey ? { apiKey: options.apiKey } : {}),
        ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
      };

      saveLLMConfig(llmConfig);
      console.log(chalk.green(`\nLLM configured: ${options.provider} / ${options.model}\n`));
      return;
    }

    // Interactive flow
    await runInteractiveLLMConfig();
  });

/**
 * Interactive LLM configuration wizard.
 */
async function runInteractiveLLMConfig(): Promise<void> {
  const existing = loadConfig()?.dashboard?.llm;

  console.log(chalk.cyan('\n  LLM Configuration\n'));
  console.log(chalk.gray('  Configure the AI provider used for session analysis.\n'));

  // Step 1: Select provider
  const { provider } = await inquirer.prompt<{ provider: LLMProviderConfig['provider'] }>([
    {
      type: 'list',
      name: 'provider',
      message: 'Select LLM provider:',
      choices: PROVIDERS.map(p => ({
        name: `${p.name}${p.requiresApiKey ? '' : ' (no API key needed)'}`,
        value: p.id,
      })),
      default: existing?.provider ?? 'ollama',
    },
  ]);

  const providerInfo = PROVIDERS.find(p => p.id === provider);
  if (!providerInfo) {
    console.error(chalk.red('\nFailed to find provider info. Aborting.\n'));
    process.exit(1);
  }

  // Step 2: Select model
  const { model } = await inquirer.prompt<{ model: string }>([
    {
      type: 'list',
      name: 'model',
      message: 'Select model:',
      choices: providerInfo.models.map(m => ({
        name: `${m.name}${m.description ? ` — ${m.description}` : ''}`,
        value: m.id,
      })),
      default: existing?.model ?? getDefaultModel(provider),
    },
  ]);

  const llmConfig: LLMProviderConfig = { provider, model };

  // Step 3: API key (if required)
  if (providerInfo.requiresApiKey) {
    const envVar = PROVIDER_API_KEY_ENV[provider];
    const hasEnvKey = envVar ? !!process.env[envVar] : false;
    const hasStoredKey = !!existing?.apiKey;

    let message = `API key for ${providerInfo.name}`;
    if (hasEnvKey) {
      message += ` (${envVar} is set — will be used instead)`;
    } else if (hasStoredKey) {
      message += ' (stored session-only, press Enter to keep)';
    } else if (envVar) {
      message += ` (or set ${envVar} env var)`;
    }
    message += ':';

    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
      {
        type: 'password',
        name: 'apiKey',
        message,
        mask: '*',
        validate: (val: string) => {
          if (!val && !hasEnvKey && !hasStoredKey) {
            return `API key required for ${providerInfo.name} — set ${envVar ?? 'the API key'} env var to avoid prompts`;
          }
          return true;
        },
      },
    ]);

    // Only store in session (llmConfig.apiKey) — saveConfig strips it before writing to disk.
    // The stored key persists in memory for this session only.
    if (apiKey) {
      llmConfig.apiKey = apiKey;
    }
    // Note: we no longer auto-preserve existing?.apiKey since the session may have
    // started with a key from env var, and explicit blank means "don't use a stored key".
  }

  // Step 4: Base URL (Ollama or OpenAI-compatible)
  if (provider === 'ollama' || provider === 'openai-compatible') {
    const defaultBaseUrl = provider === 'ollama' ? 'http://localhost:11434' : '';
    const { baseUrl } = await inquirer.prompt<{ baseUrl: string }>([
      {
        type: 'input',
        name: 'baseUrl',
        message: provider === 'ollama'
          ? 'Ollama URL (leave blank for default http://localhost:11434):'
          : 'Base URL (e.g. https://api.together.ai):',
        default: existing?.baseUrl ?? defaultBaseUrl,
      },
    ]);

    if (baseUrl && baseUrl !== defaultBaseUrl) {
      llmConfig.baseUrl = baseUrl;
    }
  }

  saveLLMConfig(llmConfig);

  console.log(chalk.green(`\nLLM configured: ${providerInfo.name} / ${model}\n`));
  if (providerInfo.requiresApiKey) {
    const envVar = PROVIDER_API_KEY_ENV[provider];
    if (envVar && process.env[envVar]) {
      console.log(chalk.dim(`  Using API key from ${envVar}\n`));
    } else if (llmConfig.apiKey) {
      console.log(chalk.dim('  API key stored for this session only — not written to disk.\n'));
      console.log(chalk.dim(`  For persistent use, set the ${envVar} environment variable.\n`));
    } else {
      console.log(chalk.dim(`  Get an API key: ${providerInfo.apiKeyLink}\n`));
    }
  }
}

/**
 * Save LLM config into the dashboard.llm field of the CLI config file.
 */
function saveLLMConfig(llmConfig: LLMProviderConfig): void {
  const existing: ClaudeInsightConfig = loadConfig() ?? {
    sync: { claudeDir: '~/.claude/projects', excludeProjects: [] },
  };
  existing.dashboard = { ...existing.dashboard, llm: llmConfig };
  saveConfig(existing);
}

// Suppress unused variable warning — llmCommand is registered via .command() side-effect
void llmCommand;
