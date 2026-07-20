import Database from 'better-sqlite3';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

const { createApp } = await import('../index.js');

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

function initTestDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

function insertSession(
  db: Database.Database,
  opts: { id: string; startedAt: string; homeId?: string }
): void {
  db.prepare(`
    INSERT INTO projects (id, name, path, last_activity)
    VALUES (?, 'test', '/test', datetime('now'))
    ON CONFLICT (id) DO NOTHING
  `).run('p-' + opts.id);
  db.prepare(`
    INSERT INTO sessions (id, project_id, project_name, project_path, started_at, ended_at, home_id)
    VALUES (?, ?, 'test', '/test', ?, ?, ?)
  `).run(opts.id, 'p-' + opts.id, opts.startedAt, opts.startedAt, opts.homeId ?? 'default');
}

// ──────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────

describe('Analytics routes', () => {
  beforeEach(() => {
    testDb = initTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('GET /api/analytics/dashboard', () => {
    it('returns stats shape with default range', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/dashboard');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.range).toBe('7d');
      expect(body.stats).toBeDefined();
      expect(body.stats.session_count).toBe(0);
    });

    it('accepts valid range parameter', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/dashboard?range=30d');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.range).toBe('30d');
    });

    it('returns 400 for invalid range', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/dashboard?range=invalid');
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid range');
    });
  });

  describe('GET /api/analytics/daily', () => {
    it('returns 400 for invalid range', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/daily?range=invalid');
      expect(res.status).toBe(400);
    });

    it('groups sessions by date with no row cap, so old data survives under range=all', async () => {
      // Regression test: the dashboard activity chart used to be built
      // client-side from a LIMIT-500 session fetch, silently dropping
      // anything older than the 500th most recent session even when the
      // user selected "all". This endpoint aggregates in SQL with no LIMIT.
      insertSession(testDb, { id: 's-april', startedAt: '2026-04-15T10:00:00.000Z' });
      // A batch of much more recent sessions — in the old client-side
      // implementation, enough of these would have pushed s-april out of
      // the fetched window.
      for (let i = 0; i < 10; i++) {
        insertSession(testDb, { id: `s-recent-${i}`, startedAt: '2026-07-19T10:00:00.000Z' });
      }

      const app = createApp();
      const res = await app.request('/api/analytics/daily?range=all');
      expect(res.status).toBe(200);
      const body = await res.json();
      const april = body.daily.find((d: { date: string }) => d.date === '2026-04-15');
      expect(april).toBeDefined();
      expect(april.session_count).toBe(1);
    });

    it('excludes old data outside a bounded range', async () => {
      insertSession(testDb, { id: 's-old', startedAt: '2026-01-01T10:00:00.000Z' });
      insertSession(testDb, { id: 's-new', startedAt: new Date().toISOString() });

      const app = createApp();
      const res = await app.request('/api/analytics/daily?range=7d');
      expect(res.status).toBe(200);
      const body = await res.json();
      const old = body.daily.find((d: { date: string }) => d.date === '2026-01-01');
      expect(old).toBeUndefined();
    });

    it('filters by homeId', async () => {
      insertSession(testDb, { id: 's-home-a', startedAt: '2026-07-19T10:00:00.000Z', homeId: 'home-a' });
      insertSession(testDb, { id: 's-home-b', startedAt: '2026-07-19T10:00:00.000Z', homeId: 'home-b' });

      const app = createApp();
      const res = await app.request('/api/analytics/daily?range=all&homeId=home-a');
      expect(res.status).toBe(200);
      const body = await res.json();
      const day = body.daily.find((d: { date: string }) => d.date === '2026-07-19');
      expect(day.session_count).toBe(1);
    });
  });

  describe('GET /api/analytics/usage', () => {
    it('returns null stats when no usage data exists', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/usage');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats).toBeNull();
    });

    it('returns usage stats when data exists', async () => {
      testDb.prepare(`
        INSERT INTO usage_stats (
          id, total_input_tokens, total_output_tokens,
          estimated_cost_usd, sessions_with_usage
        ) VALUES (1, 10000, 20000, 1.50, 5)
      `).run();

      const app = createApp();
      const res = await app.request('/api/analytics/usage');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats).not.toBeNull();
      expect(body.stats.total_input_tokens).toBe(10000);
      expect(body.stats.total_output_tokens).toBe(20000);
      expect(body.stats.estimated_cost_usd).toBe(1.5);
    });
  });
});
