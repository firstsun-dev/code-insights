import { z } from '@hono/zod-openapi';

/** Mirrors dashboard/src/lib/types.ts DispatchResponse. */
export const DispatchResponseSchema = z
  .object({
    markdown: z.string(),
    body: z.string(),
    format: z.enum(['blog', 'linkedin']),
    frontmatter: z.object({
      title: z.string(),
      tags: z.array(z.string()),
      tldr: z.string(),
    }),
    wordCount: z.number(),
    characterCount: z.number(),
    degraded: z.boolean(),
    model: z.string(),
    tokensUsed: z.object({
      input: z.number(),
      output: z.number(),
    }),
  })
  .openapi('DispatchResponse');

/** Mirrors dashboard/src/lib/types.ts DispatchImagePromptResponse. */
export const DispatchImagePromptResponseSchema = z
  .object({
    prompt: z.string(),
    model: z.string(),
    tokensUsed: z.object({
      input: z.number(),
      output: z.number(),
    }),
  })
  .openapi('DispatchImagePromptResponse');

export const DispatchImagePromptErrorSchema = z
  .object({
    error: z.string(),
    detail: z.string().optional(),
  })
  .openapi('DispatchImagePromptError');
