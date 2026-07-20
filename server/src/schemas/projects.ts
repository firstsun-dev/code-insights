import { z } from '@hono/zod-openapi';

/** Mirrors dashboard/src/lib/types.ts Project, field-for-field. */
export const ProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    git_remote_url: z.string().nullable(),
    session_count: z.number(),
    last_activity: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    total_input_tokens: z.number().optional(),
    total_output_tokens: z.number().optional(),
    cache_creation_tokens: z.number().optional(),
    cache_read_tokens: z.number().optional(),
    estimated_cost_usd: z.number().optional(),
  })
  .openapi('Project');

export const ProjectsListResponseSchema = z
  .object({
    projects: z.array(ProjectSchema),
  })
  .openapi('ProjectsListResponse');

export const ProjectResponseSchema = z
  .object({
    project: ProjectSchema,
  })
  .openapi('ProjectResponse');

export const ProjectIdParamSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
});

export const ProjectsListQuerySchema = z.object({
  limit: z.string().optional().openapi({ param: { name: 'limit', in: 'query' } }),
  offset: z.string().optional().openapi({ param: { name: 'offset', in: 'query' } }),
});
