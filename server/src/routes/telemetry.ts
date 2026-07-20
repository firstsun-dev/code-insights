import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { isTelemetryEnabled, getStableMachineId } from '@code-insights/cli/utils/telemetry';
import { TelemetryIdentitySchema } from '../schemas/telemetry.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// GET /api/telemetry/identity
// Returns the stable distinct_id and whether telemetry is enabled.
// Used by the dashboard SPA to initialize posthog-js with the same identity
// as the CLI, so events from both sources are linked to the same person.
//
// Security note: this returns a deterministic hash (not PII) and is localhost-only.
const identityRoute = createRoute({
  method: 'get',
  path: '/identity',
  responses: {
    200: {
      content: {
        'application/json': { schema: TelemetryIdentitySchema },
      },
      description: 'Telemetry identity for the dashboard to initialize posthog-js',
    },
  },
});

app.openapi(identityRoute, (c) => {
  const enabled = isTelemetryEnabled();
  if (!enabled) {
    return c.json({ enabled: false });
  }
  return c.json({
    enabled: true,
    distinct_id: getStableMachineId(),
  });
});

export default app;
