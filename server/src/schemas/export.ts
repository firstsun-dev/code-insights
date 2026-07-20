import { z } from '@hono/zod-openapi';

/** Mirrors dashboard/src/lib/types.ts ExportTemplate. */
export const ExportTemplateSchema = z.enum(['knowledge-base', 'agent-rules']).openapi('ExportTemplate');

/** Mirrors server/src/llm/export-prompts.ts ExportFormat/ExportScope/ExportDepth. */
export const ExportScopeSchema = z.enum(['project', 'all']).openapi('ExportScope');
export const ExportFormatSchema = z
  .enum(['agent-rules', 'knowledge-brief', 'obsidian', 'notion'])
  .openapi('ExportFormat');
export const ExportDepthSchema = z.enum(['essential', 'standard', 'comprehensive']).openapi('ExportDepth');

export const ExportGenerateMetadataSchema = z
  .object({
    insightCount: z.number(),
    totalInsights: z.number(),
    sessionCount: z.number(),
    projectCount: z.number(),
    scope: ExportScopeSchema,
    depth: ExportDepthSchema,
  })
  .openapi('ExportGenerateMetadata');

export const ExportGenerateResponseSchema = z
  .object({
    content: z.string(),
    metadata: ExportGenerateMetadataSchema,
  })
  .openapi('ExportGenerateResponse');
