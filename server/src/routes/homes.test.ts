import Database from 'better-sqlite3';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runMigrations } from '@code-insights/cli/db/schema';

// ──────────────────────────────────────────────────────
// Module-scoped mutable DB reference for mocking.
// ──────────────────────────────────────────────────────

let testDb: Database.Database;

vi.mock('@code-insights/cli/db/client', () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

vi.mock('@code-insights/cli/utils/telemetry', () => ({
  trackEvent: vi.fn(),
}));

// Import createApp AFTER mocks are declared
const { createApp } = await import('../index.js');

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

function initTestDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

let tmpDirA: string;
let tmpDirB: string;

describe('Homes routes', () => {
  beforeEach(() => {
    testDb = initTestDb();
    tmpDirA = mkdtempSync(join(tmpdir(), 'ci-home-a-'));
    tmpDirB = mkdtempSync(join(tmpdir(), 'ci-home-b-'));
  });

  afterEach(() => {
    testDb.close();
    rmSync(tmpDirA, { recursive: true, force: true });
    rmSync(tmpDirB, { recursive: true, force: true });
  });

  describe('GET /api/homes', () => {
    it('returns the seeded default home', async () => {
      const app = createApp();
      const res = await app.request('/api/homes');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.homes).toHaveLength(1);
      expect(body.homes[0].id).toBe('default');
    });
  });

  describe('GET /api/homes/:id', () => {
    it('returns a home by id', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/default');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.home.id).toBe('default');
    });

    it('returns 404 for unknown id', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/nonexistent');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Not found');
    });
  });

  describe('POST /api/homes', () => {
    it('adds a new home', async () => {
      const app = createApp();
      const res = await app.request('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tmpDirA, label: 'Work Laptop' }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.home.label).toBe('Work Laptop');
      expect(body.home.enabled).toBe(true);
    });

    it('returns 400 when path is missing', async () => {
      const app = createApp();
      const res = await app.request('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'No Path' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('path is required');
    });

    it('returns 400 when path does not exist', async () => {
      const app = createApp();
      const res = await app.request('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/definitely/not/a/real/path/xyz' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/does not exist/);
    });

    it('returns 400 for a duplicate path', async () => {
      const app = createApp();
      await app.request('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tmpDirA }),
      });
      const res = await app.request('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tmpDirA }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/already exists/);
    });
  });

  describe('DELETE /api/homes/:id', () => {
    it('removes a non-default home', async () => {
      const app = createApp();
      const addRes = await app.request('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tmpDirB }),
      });
      const { home } = await addRes.json();

      const res = await app.request(`/api/homes/${home.id}`, { method: 'DELETE' });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it('returns 400 when removing the default home', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/default', { method: 'DELETE' });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/default home cannot be removed/);
    });

    it('returns 400 for an unknown id', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/nonexistent', { method: 'DELETE' });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/No home found/);
    });
  });

  describe('PATCH /api/homes/:id', () => {
    it('updates enabled state', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/default', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.home.enabled).toBe(false);
    });

    it('returns 400 when enabled is not a boolean', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/default', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: 'yes' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('enabled must be a boolean');
    });

    it('returns 400 for an unknown id', async () => {
      const app = createApp();
      const res = await app.request('/api/homes/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/No home found/);
    });
  });
});
