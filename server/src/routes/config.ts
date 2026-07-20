import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { loadConfig, saveConfig } from '@code-insights/cli/utils/config';
import type { ClaudeInsightConfig, LLMProviderConfig } from '@code-insights/cli/types';
import { loadLLMConfig, testLLMConfig } from '../llm/client.js';
import { discoverOllamaModels } from '../llm/providers/ollama.js';
import { discoverModels } from '../llm/discover.js';
import { ErrorSchema, OkSchema } from '../schemas/common.js';
import {
  LLMConfigResponseSchema,
  LLMTestResponseSchema,
  OllamaModelsResponseSchema,
  OllamaModelsQuerySchema,
  DiscoverModelsResponseSchema,
} from '../schemas/config.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// Body schemas are intentionally NOT wired into createRoute()'s `request.body`
// in this pass — every handler below performs its own field presence/shape
// validation with custom error messages (e.g. "provider must be one of: ...",
// "model is required when setting LLM config"), which a zod body schema +
// defaultHook would collapse into a single generic "Invalid request" message
// that the existing tests assert against more specific substrings.

const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini', 'ollama', 'openrouter', 'mistral', 'openai-compatible'] as const;

const PROVIDER_API_KEY_ENV: Record<string, string> = {
  openai:     'OPENAI_API_KEY',
  anthropic:  'ANTHROPIC_API_KEY',
  gemini:     'GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  mistral:    'MISTRAL_API_KEY',
  'openai-compatible': 'OPENAI_COMPATIBLE_API_KEY',
};

function maskApiKey(key: string | undefined): string | undefined {
  if (!key || key.length < 8) return key ? '***' : undefined;
  return key.slice(0, 4) + '...' + key.slice(-4);
}

/**
 * Describe the API key source for a provider.
 */
function describeApiKeySource(provider: string, storedKey?: string): 'env' | 'stored' | 'none' {
  const envVar = PROVIDER_API_KEY_ENV[provider];
  if (envVar && process.env[envVar]) return 'env';
  if (storedKey) return 'stored';
  return 'none';
}

const getLlmConfigRoute = createRoute({
  method: 'get',
  path: '/llm',
  responses: {
    200: {
      content: { 'application/json': { schema: LLMConfigResponseSchema } },
      description: 'Current LLM config (API key masked)',
    },
  },
});

app.openapi(getLlmConfigRoute, (c) => {
  const config = loadConfig();
  const llm = config?.dashboard?.llm;

  return c.json({
    dashboardPort: config?.dashboard?.port ?? 7890,
    provider: llm?.provider,
    model: llm?.model,
    apiKey: llm?.apiKey ? '***' : undefined, // Always mask when present
    apiKeySource: llm ? describeApiKeySource(llm.provider, llm.apiKey) : 'none',
    baseUrl: llm?.baseUrl,
  }, 200);
});

const putLlmConfigRoute = createRoute({
  method: 'put',
  path: '/llm',
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'LLM config updated (or no-op if no fields provided)',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid dashboardPort, provider, or missing model',
    },
  },
});

app.openapi(putLlmConfigRoute, async (c) => {
  const body = await c.req.json<{
    dashboardPort?: number;
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  }>();

  const config: ClaudeInsightConfig = loadConfig() ?? {
    sync: { claudeDir: '', excludeProjects: [] },
  };

  let changed = false;

  // Update dashboard port if provided
  if (body.dashboardPort !== undefined) {
    const port = body.dashboardPort;
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      return c.json({ error: 'dashboardPort must be an integer between 1 and 65535' }, 400);
    }
    config.dashboard = { ...config.dashboard, port };
    changed = true;
  }

  // Update LLM config if any LLM field is provided
  const hasLLMField = body.provider !== undefined || body.model !== undefined ||
    body.apiKey !== undefined || body.baseUrl !== undefined;

  if (hasLLMField) {
    if (body.provider !== undefined && !VALID_PROVIDERS.includes(body.provider as typeof VALID_PROVIDERS[number])) {
      return c.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, 400);
    }

    const existingLlm = config.dashboard?.llm ?? {} as Partial<LLMProviderConfig>;

    const updatedLlm: LLMProviderConfig = {
      provider: (body.provider as LLMProviderConfig['provider']) ?? existingLlm.provider ?? 'ollama',
      model: body.model ?? existingLlm.model ?? '',
      // Preserve existing API key if not provided in update
      ...(body.apiKey !== undefined
        ? { apiKey: body.apiKey || undefined }
        : existingLlm.apiKey !== undefined ? { apiKey: existingLlm.apiKey } : {}),
      ...(body.baseUrl !== undefined
        ? { baseUrl: body.baseUrl || undefined }
        : existingLlm.baseUrl !== undefined ? { baseUrl: existingLlm.baseUrl } : {}),
    };

    if (!updatedLlm.model) {
      return c.json({ error: 'model is required when setting LLM config' }, 400);
    }

    config.dashboard = { ...config.dashboard, llm: updatedLlm };
    changed = true;
  }

  if (!changed) {
    return c.json({ ok: true as const }, 200);
  }

  saveConfig(config);
  return c.json({ ok: true as const }, 200);
});

const testLlmConfigRoute = createRoute({
  method: 'post',
  path: '/llm/test',
  responses: {
    200: {
      content: { 'application/json': { schema: LLMTestResponseSchema } },
      description: 'Credentials validated successfully',
    },
    400: {
      content: { 'application/json': { schema: LLMTestResponseSchema } },
      description: 'No LLM config found in body or saved config',
    },
    422: {
      content: { 'application/json': { schema: LLMTestResponseSchema } },
      description: 'Credentials failed validation',
    },
  },
});

app.openapi(testLlmConfigRoute, async (c) => {
  // Allow testing with body config or existing saved config
  let testConfig: LLMProviderConfig | null = null;

  try {
    const body = await c.req.json<Partial<LLMProviderConfig>>();
    if (body.provider && body.model) {
      testConfig = {
        provider: body.provider,
        model: body.model,
        ...(body.apiKey ? { apiKey: body.apiKey } : {}),
        ...(body.baseUrl ? { baseUrl: body.baseUrl } : {}),
      };
    }
  } catch {
    // No body or invalid JSON — use existing config
  }

  if (!testConfig) {
    testConfig = loadLLMConfig();
  }

  if (!testConfig) {
    return c.json({
      success: false,
      error: 'No LLM config found. Run `code-insights config llm` or provide config in request body.',
    }, 400);
  }

  const result = await testLLMConfig(testConfig);
  return c.json(result, result.success ? 200 : 422);
});

const ollamaModelsRoute = createRoute({
  method: 'get',
  path: '/llm/ollama-models',
  request: { query: OllamaModelsQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: OllamaModelsResponseSchema } },
      description: 'Locally available Ollama models',
    },
  },
});

app.openapi(ollamaModelsRoute, async (c) => {
  const baseUrl = c.req.query('baseUrl');
  const models = await discoverOllamaModels(baseUrl);
  return c.json({ models }, 200);
});

const discoverModelsRoute = createRoute({
  method: 'post',
  path: '/llm/models',
  responses: {
    200: {
      content: { 'application/json': { schema: DiscoverModelsResponseSchema } },
      description: 'Models discovered for the given provider',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'provider is required',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Failed to fetch models from the provider',
    },
  },
});

app.openapi(discoverModelsRoute, async (c) => {
  const body = await c.req.json<{ provider: string, apiKey?: string, baseUrl?: string }>();

  if (!body.provider) {
    return c.json({ error: 'provider is required' }, 400);
  }

  // Resolve API key: body.apiKey > env var > saved config (for this provider only)
  let apiKey: string | undefined;
  if (body.apiKey) {
    apiKey = body.apiKey;
  } else {
    const envVar = PROVIDER_API_KEY_ENV[body.provider];
    if (envVar && process.env[envVar]) {
      apiKey = process.env[envVar];
    } else {
      const savedConfig = loadLLMConfig();
      if (savedConfig?.provider === body.provider) {
        apiKey = savedConfig?.apiKey;
      }
    }
  }

  try {
    const models = await discoverModels(body.provider as any, apiKey, body.baseUrl);
    return c.json({ models }, 200);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch models' }, 500);
  }
});

export default app;
