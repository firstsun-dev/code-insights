import { z } from '@hono/zod-openapi';
import { SessionCharacterSchema, TitleSourceSchema } from './common.js';

/** Mirrors dashboard/src/lib/types.ts Session's `facets` sub-object. */
export const SessionFacetsSchema = z
  .object({
    session_id: z.string(),
    outcome_satisfaction: z.string(),
    workflow_pattern: z.string().nullable(),
    had_course_correction: z.number(),
    course_correction_reason: z.string().nullable(),
    iteration_count: z.number(),
    friction_points: z.string(), // JSON string
    effective_patterns: z.string(), // JSON string
    extracted_at: z.string(),
    analysis_version: z.string(),
  })
  .openapi('SessionFacets');

/** Mirrors dashboard/src/lib/types.ts Session, field-for-field (excluding `facets`). */
export const SessionSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    project_name: z.string(),
    project_path: z.string(),
    git_remote_url: z.string().nullable(),
    summary: z.string().nullable(),
    custom_title: z.string().nullable(),
    generated_title: z.string().nullable(),
    title_source: TitleSourceSchema.nullable(),
    session_character: SessionCharacterSchema.nullable(),
    started_at: z.string(),
    ended_at: z.string(),
    message_count: z.number(),
    user_message_count: z.number(),
    assistant_message_count: z.number(),
    tool_call_count: z.number(),
    git_branch: z.string().nullable(),
    claude_version: z.string().nullable(),
    source_tool: z.string().nullable(),
    home_id: z.string().nullable(),
    device_id: z.string().nullable(),
    device_hostname: z.string().nullable(),
    device_platform: z.string().nullable(),
    synced_at: z.string(),
    total_input_tokens: z.number().nullable(),
    total_output_tokens: z.number().nullable(),
    cache_creation_tokens: z.number().nullable(),
    cache_read_tokens: z.number().nullable(),
    estimated_cost_usd: z.number().nullable(),
    models_used: z.string().nullable(),
    primary_model: z.string().nullable(),
    usage_source: z.string().nullable(),
    compact_count: z.number(),
    auto_compact_count: z.number(),
    slash_commands: z.string().nullable(),
  })
  .openapi('Session');

export const SessionWithFacetsSchema = SessionSchema.extend({
  facets: SessionFacetsSchema.nullable().optional(),
}).openapi('SessionWithFacets');

export const SessionsListResponseSchema = z
  .object({
    sessions: z.array(SessionSchema),
  })
  .openapi('SessionsListResponse');

export const SessionResponseSchema = z
  .object({
    session: SessionWithFacetsSchema,
  })
  .openapi('SessionResponse');

export const SessionIdParamSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
});

export const SessionsListQuerySchema = z.object({
  projectId: z.string().optional().openapi({ param: { name: 'projectId', in: 'query' } }),
  sourceTool: z.string().optional().openapi({ param: { name: 'sourceTool', in: 'query' } }),
  limit: z.string().optional().openapi({ param: { name: 'limit', in: 'query' } }),
  offset: z.string().optional().openapi({ param: { name: 'offset', in: 'query' } }),
  q: z.string().optional().openapi({ param: { name: 'q', in: 'query' } }),
  from: z.string().optional().openapi({ param: { name: 'from', in: 'query' } }),
  to: z.string().optional().openapi({ param: { name: 'to', in: 'query' } }),
  homeId: z.string().optional().openapi({ param: { name: 'homeId', in: 'query' } }),
});

export const DeletedCountQuerySchema = z.object({
  projectId: z.string().optional().openapi({ param: { name: 'projectId', in: 'query' } }),
});

export const DeletedCountResponseSchema = z
  .object({
    count: z.number(),
  })
  .openapi('DeletedCountResponse');
