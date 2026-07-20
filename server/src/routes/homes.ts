import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { listHomes, getHome, addHome, removeHome, setHomeEnabled } from '@code-insights/cli/db/homes';
import { ErrorSchema, OkSchema } from '../schemas/common.js';
import { HomeSchema, HomesListResponseSchema, HomeResponseSchema, HomeIdParamSchema } from '../schemas/homes.js';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ error: 'Invalid request' }, 400);
  },
});

// Body schemas are intentionally NOT wired into createRoute()'s `request.body`
// in this pass — the handlers still call c.req.json() directly. Adding zod
// body validation would let the validator intercept malformed JSON before
// app.onError's SyntaxError handler sees it, changing the response shape.
// See PR description for the deliberate follow-up to tighten this.

const listRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: { 'application/json': { schema: HomesListResponseSchema } },
      description: 'All configured homes',
    },
  },
});

app.openapi(listRoute, (c) => {
  return c.json({ homes: listHomes() as z.infer<typeof HomeSchema>[] }, 200);
});

const getRoute = createRoute({
  method: 'get',
  path: '/{id}',
  request: { params: HomeIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: HomeResponseSchema } },
      description: 'A single home by id',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Home not found',
    },
  },
});

app.openapi(getRoute, (c) => {
  const home = getHome(c.req.param('id'));
  if (!home) return c.json({ error: 'Not found' }, 404);
  return c.json({ home: home as z.infer<typeof HomeSchema> }, 200);
});

const createRouteDef = createRoute({
  method: 'post',
  path: '/',
  responses: {
    201: {
      content: { 'application/json': { schema: HomeResponseSchema } },
      description: 'Home created',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid path or duplicate home',
    },
  },
});

app.openapi(createRouteDef, async (c) => {
  const body = await c.req.json<{ path?: string; label?: string }>();
  const { path, label } = body;

  if (!path || !path.trim()) {
    return c.json({ error: 'path is required' }, 400);
  }

  try {
    const home = addHome(path, label);
    return c.json({ home: home as z.infer<typeof HomeSchema> }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add home';
    return c.json({ error: message }, 400);
  }
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  request: { params: HomeIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Home removed',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Cannot remove default home, or unknown id',
    },
  },
});

app.openapi(deleteRoute, (c) => {
  try {
    removeHome(c.req.param('id'));
    return c.json({ ok: true as const }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove home';
    return c.json({ error: message }, 400);
  }
});

const patchRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  request: { params: HomeIdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: HomeResponseSchema } },
      description: 'Home updated',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid body or unknown id',
    },
  },
});

app.openapi(patchRoute, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ enabled?: boolean }>();

  if (typeof body.enabled !== 'boolean') {
    return c.json({ error: 'enabled must be a boolean' }, 400);
  }

  try {
    setHomeEnabled(id, body.enabled);
    return c.json({ home: getHome(id) as z.infer<typeof HomeSchema> }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update home';
    return c.json({ error: message }, 400);
  }
});

export default app;
