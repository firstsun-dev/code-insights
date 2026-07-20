import { z } from '@hono/zod-openapi';

/**
 * No matching interface exists in dashboard/src/lib/types.ts for this
 * endpoint's response — the dashboard consumes it ad hoc to seed posthog-js.
 * Schema modeled directly off the two shapes returned by telemetry.ts.
 */
export const TelemetryIdentitySchema = z
  .union([
    z.object({
      enabled: z.literal(true),
      distinct_id: z.string(),
    }),
    z.object({
      enabled: z.literal(false),
    }),
  ])
  .openapi('TelemetryIdentity');
