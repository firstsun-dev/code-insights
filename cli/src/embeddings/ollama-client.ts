// Ollama embedding client — HTTP wrapper around /api/embed.
// Handles batching, retry with exponential backoff, and rate limiting.

import type { EmbeddingConfig, EmbeddingResult } from './types.js';

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000;

/** Thrown when Ollama returns a non-200 or the response is malformed. */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/** Sleep for ms. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Track simple token-bucket rate limiter state. */
function createRateLimiter(rpm: number): { wait: () => Promise<void> } {
  if (rpm <= 0) return { wait: () => Promise.resolve() };

  const intervalMs = 60_000 / rpm;
  let lastRequest = 0;

  return {
    wait: async () => {
      const now = Date.now();
      const elapsed = now - lastRequest;
      if (elapsed < intervalMs) {
        await sleep(intervalMs - elapsed);
      }
      lastRequest = Date.now();
    },
  };
}

/**
 * Embed a single batch of texts via Ollama /api/embed.
 * Returns Float32Array[] aligned 1:1 with inputs.
 */
async function embedBatch(
  config: EmbeddingConfig,
  texts: string[],
  rateLimiter: { wait: () => Promise<void> },
): Promise<Float32Array[]> {
  await rateLimiter.wait();

  const url = `${config.baseUrl.replace(/\/+$/, '')}/api/embed`;
  const body = JSON.stringify({ model: config.model, input: texts });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new EmbeddingError(
          `Ollama /api/embed returned ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const json = (await res.json()) as { embeddings?: number[][] };

      if (!json.embeddings || !Array.isArray(json.embeddings)) {
        throw new EmbeddingError('Ollama response missing embeddings array');
      }

      if (json.embeddings.length !== texts.length) {
        throw new EmbeddingError(
          `Expected ${texts.length} embeddings, got ${json.embeddings.length}`,
        );
      }

      return json.embeddings.map(e => new Float32Array(e));
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_RETRY_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw new EmbeddingError(
    `Embedding failed after ${MAX_RETRIES} attempts`,
    lastError,
  );
}

/**
 * Embed multiple texts in batches of config.batchSize.
 * Returns EmbeddingResult[] with vectors aligned to inputs.
 */
export async function embedTexts(
  config: EmbeddingConfig,
  items: Array<{ id: string; text: string }>,
): Promise<EmbeddingResult[]> {
  const rateLimiter = createRateLimiter(config.rateLimitPerMinute);
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    const texts = batch.map(b => b.text);
    const vectors = await embedBatch(config, texts, rateLimiter);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        id: batch[j].id,
        vector: vectors[j],
        sourceText: batch[j].text,
        model: config.model,
        dim: vectors[j].length,
      });
    }
  }

  return results;
}

/**
 * Embed a single text (convenience wrapper).
 */
export async function embedOne(
  config: EmbeddingConfig,
  id: string,
  text: string,
): Promise<EmbeddingResult> {
  const results = await embedTexts(config, [{ id, text }]);
  return results[0];
}
