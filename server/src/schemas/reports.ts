import { z } from '@hono/zod-openapi';

export const ReportSourceSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  projectName: z.string(),
  startedAt: z.string(),
}).openapi('ReportSource');

export const ReportResponseSchema = z.object({
  markdown: z.string(),
  reportType: z.enum(['daily', 'weekly', 'project']),
  model: z.string(),
  sourceCount: z.number(),
  sources: z.array(ReportSourceSchema),
  tokensUsed: z.object({ input: z.number(), output: z.number() }),
}).openapi('ReportResponse');
