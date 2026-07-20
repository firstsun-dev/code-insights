import { z } from '@hono/zod-openapi';

/**
 * LLM provider identifiers (see cli/src/types.ts LLMProvider). Mirrors the
 * VALID_PROVIDERS list in routes/config.ts.
 */
export const LLMProviderSchema = z
  .enum(['openai', 'anthropic', 'gemini', 'ollama', 'openrouter', 'mistral', 'llamacpp', 'openai-compatible'])
  .openapi('LLMProvider');

export const ApiKeySourceSchema = z.enum(['env', 'stored', 'none']).openapi('ApiKeySource');

export const LLMConfigResponseSchema = z
  .object({
    dashboardPort: z.number(),
    provider: LLMProviderSchema.optional(),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    apiKeySource: ApiKeySourceSchema,
    baseUrl: z.string().optional(),
  })
  .openapi('LLMConfigResponse');

export const LLMConfigUpdateBodySchema = z.object({
  dashboardPort: z.number().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

export const LLMTestBodySchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

export const LLMTestResponseSchema = z
  .object({
    success: z.boolean(),
    error: z.string().optional(),
  })
  .openapi('LLMTestResponse');

export const OllamaModelSchema = z
  .object({
    name: z.string(),
    size: z.number(),
    modifiedAt: z.string(),
  })
  .openapi('OllamaModel');

export const OllamaModelsResponseSchema = z
  .object({
    models: z.array(OllamaModelSchema),
  })
  .openapi('OllamaModelsResponse');

export const OllamaModelsQuerySchema = z.object({
  baseUrl: z.string().optional().openapi({ param: { name: 'baseUrl', in: 'query' } }),
});

export const DiscoveredModelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .openapi('DiscoveredModel');

export const DiscoverModelsResponseSchema = z
  .object({
    models: z.array(DiscoveredModelSchema),
  })
  .openapi('DiscoverModelsResponse');
