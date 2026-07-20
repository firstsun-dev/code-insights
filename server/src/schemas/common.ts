import { z } from '@hono/zod-openapi';

// Always import z from '@hono/zod-openapi', never from raw 'zod' — the
// re-exported z carries .openapi() metadata support that raw zod's z lacks.

/**
 * Standard error envelope used across every route in this API
 * (see app.onError in src/index.ts and each router's defaultHook).
 */
export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Not found' }),
  })
  .openapi('Error');

/** Standard success envelope for mutation endpoints with no return payload. */
export const OkSchema = z
  .object({
    ok: z.literal(true),
  })
  .openapi('Ok');

/**
 * Session character classification (see cli/src/types.ts SessionCharacter,
 * mirrored in dashboard/src/lib/types.ts). 7 values.
 */
export const SessionCharacterSchema = z
  .enum([
    'deep_focus',
    'bug_hunt',
    'feature_build',
    'exploration',
    'refactor',
    'learning',
    'quick_task',
  ])
  .openapi('SessionCharacter');

/**
 * Title generation source (see cli/src/types.ts TitleSource, mirrored in
 * dashboard/src/lib/types.ts). 5 values.
 */
export const TitleSourceSchema = z
  .enum(['claude', 'user_message', 'insight', 'character', 'fallback'])
  .openapi('TitleSource');

/**
 * Insight type (see cli/src/types.ts InsightType, mirrored in
 * dashboard/src/lib/types.ts).
 */
export const InsightTypeSchema = z
  .enum(['summary', 'decision', 'learning', 'technique', 'prompt_quality'])
  .openapi('InsightType');

/**
 * Source tool identifiers for supported AI coding tools (see CLAUDE.md
 * "Supported Source Tools" table).
 */
export const SourceToolSchema = z
  .enum([
    'claude-code',
    'cursor',
    'codex-cli',
    'copilot-cli',
    'copilot',
    'crush',
    'opencode',
    'hermes-agent',
  ])
  .openapi('SourceTool');
