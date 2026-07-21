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

  describe('GET /api/analytics/cache-by-source', () => {
    function insertSessionWithCache(
      db: Database.Database,
      opts: {
        id: string;
        startedAt: string;
        homeId?: string;
        sourceTool: string;
        cacheCreationTokens?: number;
        cacheReadTokens?: number;
        totalInputTokens?: number;
      }
    ): void {
      db.prepare(`
        INSERT INTO projects (id, name, path, last_activity)
        VALUES (?, 'test', '/test', datetime('now'))
        ON CONFLICT (id) DO NOTHING
      `).run('p-' + opts.id);
      db.prepare(`
        INSERT INTO sessions (
          id, project_id, project_name, project_path, started_at, ended_at,
          home_id, source_tool, cache_creation_tokens, cache_read_tokens, total_input_tokens
        ) VALUES (?, ?, 'test', '/test', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        opts.id,
        'p-' + opts.id,
        opts.startedAt,
        opts.startedAt,
        opts.homeId ?? 'default',
        opts.sourceTool,
        opts.cacheCreationTokens ?? 0,
        opts.cacheReadTokens ?? 0,
        opts.totalInputTokens ?? 0
      );
    }

    it('returns empty rows when no sessions exist', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rows).toEqual([]);
    });

    it('groups cache tokens by source_tool', async () => {
      insertSessionWithCache(testDb, {
        id: 's1',
        startedAt: '2026-07-19T10:00:00.000Z',
        sourceTool: 'kilo',
        cacheCreationTokens: 1000,
        cacheReadTokens: 5000,
        totalInputTokens: 10000,
      });
      insertSessionWithCache(testDb, {
        id: 's2',
        startedAt: '2026-07-19T11:00:00.000Z',
        sourceTool: 'kilo',
        cacheCreationTokens: 500,
        cacheReadTokens: 2000,
        totalInputTokens: 5000,
      });
      insertSessionWithCache(testDb, {
        id: 's3',
        startedAt: '2026-07-19T12:00:00.000Z',
        sourceTool: 'cursor',
        cacheCreationTokens: 2000,
        cacheReadTokens: 8000,
        totalInputTokens: 15000,
      });

      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=all');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.rows.length).toBe(2);
      const kilo = body.rows.find((r: any) => r.sourceTool === 'kilo');
      const cursor = body.rows.find((r: any) => r.sourceTool === 'cursor');

      expect(kilo).toBeDefined();
      expect(kilo.sessionCount).toBe(2);
      expect(kilo.cacheCreationTokens).toBe(1500);
      expect(kilo.cacheReadTokens).toBe(7000);
      expect(kilo.totalInputTokens).toBe(15000);

      expect(cursor).toBeDefined();
      expect(cursor.sessionCount).toBe(1);
      expect(cursor.cacheCreationTokens).toBe(2000);
      expect(cursor.cacheReadTokens).toBe(8000);
    });

    it('filters by a comma-separated source list (multi-select)', async () => {
      insertSessionWithCache(testDb, {
        id: 's1',
        startedAt: '2026-07-19T10:00:00.000Z',
        sourceTool: 'kilo',
        cacheReadTokens: 1000,
      });
      insertSessionWithCache(testDb, {
        id: 's2',
        startedAt: '2026-07-19T11:00:00.000Z',
        sourceTool: 'cursor',
        cacheReadTokens: 2000,
      });
      insertSessionWithCache(testDb, {
        id: 's3',
        startedAt: '2026-07-19T12:00:00.000Z',
        sourceTool: 'claude-code',
        cacheReadTokens: 3000,
      });

      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=all&source=kilo,cursor');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.rows.length).toBe(2);
      expect(body.rows.map((r: any) => r.sourceTool).sort()).toEqual(['cursor', 'kilo']);
    });

    it('orders by cache_read_tokens DESC', async () => {
      insertSessionWithCache(testDb, {
        id: 's1',
        startedAt: '2026-07-19T10:00:00.000Z',
        sourceTool: 'kilo',
        cacheReadTokens: 1000,
      });
      insertSessionWithCache(testDb, {
        id: 's2',
        startedAt: '2026-07-19T11:00:00.000Z',
        sourceTool: 'cursor',
        cacheReadTokens: 5000,
      });

      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=all');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.rows[0].sourceTool).toBe('cursor');
      expect(body.rows[1].sourceTool).toBe('kilo');
    });

    it('filters by range', async () => {
      insertSessionWithCache(testDb, {
        id: 's-old',
        startedAt: '2026-01-01T10:00:00.000Z',
        sourceTool: 'kilo',
        cacheReadTokens: 10000,
      });
      insertSessionWithCache(testDb, {
        id: 's-new',
        startedAt: new Date().toISOString(),
        sourceTool: 'kilo',
        cacheReadTokens: 500,
      });

      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=7d');
      expect(res.status).toBe(200);
      const body = await res.json();

      const kilo = body.rows.find((r: any) => r.sourceTool === 'kilo');
      expect(kilo.cacheReadTokens).toBe(500);
    });

    it('filters by homeId', async () => {
      insertSessionWithCache(testDb, {
        id: 's-home-a',
        startedAt: '2026-07-19T10:00:00.000Z',
        homeId: 'home-a',
        sourceTool: 'kilo',
        cacheReadTokens: 1000,
      });
      insertSessionWithCache(testDb, {
        id: 's-home-b',
        startedAt: '2026-07-19T10:00:00.000Z',
        homeId: 'home-b',
        sourceTool: 'kilo',
        cacheReadTokens: 5000,
      });

      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=all&homeId=home-a');
      expect(res.status).toBe(200);
      const body = await res.json();

      const kilo = body.rows.find((r: any) => r.sourceTool === 'kilo');
      expect(kilo.cacheReadTokens).toBe(1000);
    });

    it('filters by source', async () => {
      insertSessionWithCache(testDb, {
        id: 's-kilo',
        startedAt: '2026-07-19T10:00:00.000Z',
        sourceTool: 'kilo',
        cacheReadTokens: 1000,
      });
      insertSessionWithCache(testDb, {
        id: 's-cursor',
        startedAt: '2026-07-19T10:00:00.000Z',
        sourceTool: 'cursor',
        cacheReadTokens: 5000,
      });

      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=all&source=kilo');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.rows.length).toBe(1);
      expect(body.rows[0].sourceTool).toBe('kilo');
    });

    it('returns 400 for invalid range', async () => {
      const app = createApp();
      const res = await app.request('/api/analytics/cache-by-source?range=invalid');
      expect(res.status).toBe(400);
    });
  });
});
