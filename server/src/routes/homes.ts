import { Hono } from 'hono';
import { listHomes, getHome, addHome, removeHome, setHomeEnabled } from '@code-insights/cli/db/homes';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ homes: listHomes() });
});

app.get('/:id', (c) => {
  const home = getHome(c.req.param('id'));
  if (!home) return c.json({ error: 'Not found' }, 404);
  return c.json({ home });
});

app.post('/', async (c) => {
  const body = await c.req.json<{ path?: string; label?: string }>();
  const { path, label } = body;

  if (!path || !path.trim()) {
    return c.json({ error: 'path is required' }, 400);
  }

  try {
    const home = addHome(path, label);
    return c.json({ home }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add home';
    return c.json({ error: message }, 400);
  }
});

app.delete('/:id', (c) => {
  try {
    removeHome(c.req.param('id'));
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove home';
    return c.json({ error: message }, 400);
  }
});

app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ enabled?: boolean }>();

  if (typeof body.enabled !== 'boolean') {
    return c.json({ error: 'enabled must be a boolean' }, 400);
  }

  try {
    setHomeEnabled(id, body.enabled);
    return c.json({ home: getHome(id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update home';
    return c.json({ error: message }, 400);
  }
});

export default app;
