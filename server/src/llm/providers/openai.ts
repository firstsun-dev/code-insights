// OpenAI provider implementation (server-side, no browser dependencies)

import type { LLMClient, LLMMessage, LLMResponse, ChatOptions } from '../types.js';
import { flattenContent } from '../types.js';

export function createOpenAIClient(apiKey: string, model: string, baseUrl?: string): LLMClient {
  const base = (baseUrl || 'https://api.openai.com').trim().replace(/\/$/, '');

  return {
    provider: 'openai',
    model,

    async chat(messages: LLMMessage[], options?: ChatOptions): Promise<LLMResponse> {
      const response = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: options?.signal,
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({ role: m.role, content: flattenContent(m.content) })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        const detail = error.error?.message;
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid API key. Check your OpenAI API key in \`code-insights config llm\`.${detail ? ` (${detail})` : ''}`);
        }
        if (response.status === 429) {
          throw new Error(`Rate limited or quota exceeded. Check your OpenAI account usage.${detail ? ` (${detail})` : ''}`);
        }
        if (response.status >= 500) {
          throw new Error(`OpenAI service error (HTTP ${response.status}). Try again later.${detail ? ` (${detail})` : ''}`);
        }
        throw new Error(detail || `OpenAI API error (HTTP ${response.status})`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };

      return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        } : undefined,
      };
    },

    estimateTokens(text: string): number {
      // Rough estimate: ~4 characters per token for English
      return Math.ceil(text.length / 4);
    },
  };
}
