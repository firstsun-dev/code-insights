/**
 * Model pricing table and cost calculation utilities.
 * Prices are USD per 1M tokens, sourced from Anthropic's pricing page.
 * Last updated: 2026-02-18
 */

export interface ModelPricing {
  input: number;   // USD per 1M input tokens
  output: number;  // USD per 1M output tokens
}

export interface UsageEntry {
  model: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// Pricing per 1M tokens (USD)
// Cache read tokens are priced at 10% of input price (Anthropic standard)
// Cache creation tokens are priced at 25% more than input price
const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 4.x family
  'claude-opus-4-6':           { input: 5,   output: 25 },
  'claude-opus-4-5':           { input: 5,   output: 25 },
  'claude-opus-4-1':           { input: 15,  output: 75 },
  'claude-opus-4':             { input: 15,  output: 75 },
  'claude-sonnet-4-6':         { input: 3,   output: 15 },
  'claude-sonnet-4-5':         { input: 3,   output: 15 },
  'claude-sonnet-4':           { input: 3,   output: 15 },
  'claude-haiku-4-5':          { input: 1,   output: 5 },
  // Claude 3.5 family
  'claude-3-5-sonnet-20241022': { input: 3,   output: 15 },
  'claude-3-5-haiku-20241022':  { input: 0.8, output: 4 },
  'claude-haiku-3-5':           { input: 0.8, output: 4 },
  // Claude 3 family
  'claude-3-opus-20240229':    { input: 15,  output: 75 },
  'claude-3-sonnet-20240229':  { input: 3,   output: 15 },
  'claude-3-haiku-20240307':   { input: 0.25, output: 1.25 },

  // Gemini family
  'gemini-2.0-pro':            { input: 3.5,  output: 10.5 },
  'gemini-2.0-flash':          { input: 0.1,  output: 0.4 },
  'gemini-1.5-pro':            { input: 3.5,  output: 10.5 },
  'gemini-1.5-flash':          { input: 0.075, output: 0.3 },
  'gemini-3.1-pro':            { input: 3.5,  output: 10.5 },
  'gemini-3.1-flash':          { input: 0.1,  output: 0.4 },

  // OpenAI GPT-5.x family (incl. Codex CLI models) — longest/most-specific keys first
  'gpt-5.6-luna':              { input: 1,    output: 6 },
  'gpt-5.6-sol':               { input: 5,    output: 30 },
  'gpt-5.6-terra':             { input: 2.5,  output: 15 },
  'gpt-5.6':                   { input: 5,    output: 30 }, // alias for gpt-5.6-sol
  'gpt-5.5-pro':               { input: 30,   output: 180 },
  'gpt-5.5':                   { input: 5,    output: 30 },
  'gpt-5.4-mini':              { input: 0.75, output: 4.5 },
  'gpt-5.4-nano':              { input: 0.2,  output: 1.25 },
  'gpt-5.4-pro':               { input: 30,   output: 180 },
  'gpt-5.4':                   { input: 2.5,  output: 15 },
  'gpt-5.3-codex':             { input: 1.75, output: 14 },
  'gpt-5.2':                   { input: 1.75, output: 14 },
  'gpt-5.1':                   { input: 1.25, output: 10 },
  'gpt-5-codex':               { input: 1.25, output: 10 },
  'gpt-5-mini':                { input: 0.25, output: 2 },
  'gpt-5-nano':                { input: 0.05, output: 0.4 },
  'gpt-5-pro':                 { input: 15,   output: 120 },
  'gpt-5':                     { input: 1.25, output: 10 },

  // OpenAI GPT-4.x family
  'gpt-4.1-mini':              { input: 0.4,  output: 1.6 },
  'gpt-4.1-nano':              { input: 0.1,  output: 0.4 },
  'gpt-4.1':                   { input: 2,    output: 8 },
  'gpt-4o-mini':               { input: 0.15, output: 0.6 },
  'gpt-4o':                    { input: 2.5,  output: 10 },

  // OpenAI o-series (reasoning models)
  'o1-mini':                   { input: 1.1,  output: 4.4 },
  'o1-pro':                    { input: 150,  output: 600 },
  'o1':                        { input: 15,   output: 60 },
  'o3-deep-research':          { input: 10,   output: 40 },
  'o3-mini':                   { input: 1.1,  output: 4.4 },
  'o3-pro':                    { input: 20,   output: 80 },
  'o3':                        { input: 2,    output: 8 },
  'o4-mini-deep-research':     { input: 2,    output: 8 },
  'o4-mini':                   { input: 1.1,  output: 4.4 },
};

// Default fallback pricing (sonnet-level)
const DEFAULT_PRICING: ModelPricing = { input: 3, output: 15 };

/**
 * Get pricing for a model, falling back to default if unknown.
 * Tries exact match first, then prefix match (e.g., 'claude-sonnet-4-5-20250929' matches 'claude-sonnet-4-5').
 */
export function getModelPricing(model: string): ModelPricing {
  // Exact match
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Prefix match (model IDs often have date suffixes)
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key)) {
      return pricing;
    }
  }

  return DEFAULT_PRICING;
}

/**
 * Calculate total estimated cost from usage entries.
 * Returns cost in USD, rounded to 4 decimal places.
 */
export function calculateCost(entries: UsageEntry[]): number {
  let totalCost = 0;

  for (const { model, usage } of entries) {
    const pricing = getModelPricing(model);
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

    totalCost += (inputTokens / 1_000_000) * pricing.input;
    totalCost += (outputTokens / 1_000_000) * pricing.output;
    totalCost += (cacheCreationTokens / 1_000_000) * pricing.input * 1.25;
    totalCost += (cacheReadTokens / 1_000_000) * pricing.input * 0.1;
  }

  return Math.round(totalCost * 10000) / 10000;
}
