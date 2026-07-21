import Database from 'better-sqlite3';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMigrations } from '@code-insights/cli/db/schema';
import { PERSONALITY_ANALYSIS_VERSION } from '@code-insights/cli/analysis/personality';

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

function seedProject(id: string, name: string) {
  testDb.prepare(`
    INSERT INTO projects (id, name, path, last_activity, session_count)
    VALUES (?, ?, ?, datetime('now'), 1)
  `).run(id, name, `/projects/${name}`);
}

function seedSession(
  id: string,
  projectId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    project_name: 'test-project',
    project_path: '/test',
    started_at: '2025-06-15T10:00:00Z',
    ended_at: '2025-06-15T11:00:00Z',
    message_count: 5,
    source_tool: 'claude-code',
  };
  const row = { ...defaults, ...overrides };
  testDb.prepare(`
    INSERT INTO sessions (id, project_id, project_name, project_path,
      started_at, ended_at, message_count, source_tool)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, projectId, row.project_name, row.project_path,
    row.started_at, row.ended_at, row.message_count, row.source_tool,
  );
}

function seedFacets(sessionId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    outcome_satisfaction: 'high',
    had_course_correction: 0,
    iteration_count: 1,
    friction_points: '[]',
    effective_patterns: '[]',
  };
  const row = { ...defaults, ...overrides };
  testDb.prepare(`
    INSERT INTO session_facets (session_id, outcome_satisfaction, had_course_correction,
      iteration_count, friction_points, effective_patterns)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, row.outcome_satisfaction, row.had_course_correction, row.iteration_count, row.friction_points, row.effective_patterns);
}

function seedSnapshot(period: string, projectId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    results_json: '{}',
    generated_at: '2026-07-15T10:00:00Z',
    session_count: 1,
    facet_count: 1,
  };
  const row = { ...defaults, ...overrides };
  testDb.prepare(`
    INSERT INTO personality_snapshots (period, project_id, results_json, generated_at, session_count, facet_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(period, projectId, row.results_json, row.generated_at, row.session_count, row.facet_count);
}

// ──────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────

describe('Personality routes', () => {
  beforeEach(() => {
    testDb = initTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('GET /api/personality', () => {
    it('serves a cached snapshot as-is when its profileVersion and analysisVersion match the current version', async () => {
      seedSnapshot('2026-W30', '__all__', {
        results_json: JSON.stringify({
          profileVersion: 2,
          analysisVersion: PERSONALITY_ANALYSIS_VERSION,
          sessionCount: 3,
          marker: 'from-cache',
        }),
      });

      const app = createApp();
      const res = await app.request('/api/personality?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.marker).toBe('from-cache');
    });

    it('ignores a cached snapshot missing profileVersion (pre-MBTI schema) and recomputes fresh instead', async () => {
      // Simulates a snapshot persisted before the cognitiveFunctions + mbti addition —
      // no profileVersion field at all, so it JSON.parses fine but is missing fields the
      // frontend (MbtiCard, CognitiveFunctionRadarChart) unconditionally reads, which used
      // to crash the dashboard. readSnapshot must treat this as a cache miss.
      seedSnapshot('2026-W30', '__all__', {
        results_json: JSON.stringify({ sessionCount: 3, marker: 'stale-pre-v2-cache' }),
      });
      seedProject('proj-1', 'alpha');
      seedSession('sess-1', 'proj-1', { project_id: 'proj-1', started_at: '2026-07-20T10:00:00Z' });
      seedFacets('sess-1');

      const app = createApp();
      const res = await app.request('/api/personality?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.marker).toBeUndefined();
      expect(body.profileVersion).toBe(2);
      expect(body.mbti).toBeDefined();
      expect(body.cognitiveFunctions).toBeDefined();
    });

    it('ignores a cached snapshot with an old numeric profileVersion (1) and recomputes fresh instead', async () => {
      seedSnapshot('2026-W30', '__all__', {
        results_json: JSON.stringify({ profileVersion: 1, sessionCount: 3, marker: 'stale-v1-cache' }),
      });

      const app = createApp();
      const res = await app.request('/api/personality?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.marker).toBeUndefined();
      expect(body.profileVersion).toBe(2);
    });

    it('ignores a cached snapshot with a stale analysisVersion (old scoring formula) and recomputes fresh instead', async () => {
      // Simulates a row persisted by the old mean-confidence cognitiveFunctions formula
      // (analysisVersion 2.0.0) — profileVersion still matches (2), but the formula that
      // produced the numbers has since changed, so it must not be served as a cache hit.
      seedSnapshot('2026-W30', '__all__', {
        results_json: JSON.stringify({
          profileVersion: 2,
          analysisVersion: '2.0.0',
          sessionCount: 3,
          marker: 'stale-formula-cache',
        }),
      });

      const app = createApp();
      const res = await app.request('/api/personality?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.marker).toBeUndefined();
      expect(body.analysisVersion).toBe(PERSONALITY_ANALYSIS_VERSION);
    });
  });

  describe('GET /api/personality/projects', () => {
    it('returns empty array when no projects have facet-analyzed sessions', async () => {
      seedProject('proj-1', 'alpha');
      seedSession('sess-1', 'proj-1', { started_at: '2026-07-20T10:00:00Z' });
      // No facets seeded for sess-1

      const app = createApp();
      const res = await app.request('/api/personality/projects?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.projects).toEqual([]);
    });

    it('returns only projects with at least one facet-analyzed session in the period', async () => {
      seedProject('proj-1', 'alpha');
      seedProject('proj-2', 'beta');
      seedSession('sess-1', 'proj-1', { started_at: '2026-07-20T10:00:00Z' });
      seedFacets('sess-1');
      seedSession('sess-2', 'proj-2', { started_at: '2026-07-20T10:00:00Z' });
      // proj-2's session has no facets — should be excluded

      const app = createApp();
      const res = await app.request('/api/personality/projects?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]).toEqual({ id: 'proj-1', name: 'alpha' });
    });

    it('excludes projects whose facet-analyzed sessions fall outside the period', async () => {
      seedProject('proj-1', 'alpha');
      // Session + facets exist, but in a different ISO week than the one queried
      seedSession('sess-1', 'proj-1', { started_at: '2026-01-05T10:00:00Z' });
      seedFacets('sess-1');

      const app = createApp();
      const res = await app.request('/api/personality/projects?period=2026-W30');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.projects).toEqual([]);
    });

    it('defaults to the current week when period is omitted', async () => {
      seedProject('proj-1', 'alpha');
      const app = createApp();
      const res = await app.request('/api/personality/projects');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.projects).toEqual([]);
    });
  });

  describe('GET /api/personality/weeks', () => {
    it('returns empty array when no facet-analyzed sessions exist', async () => {
      seedProject('proj-1', 'alpha');
      seedSession('sess-1', 'proj-1', { started_at: '2026-07-20T10:00:00Z' });
      // No facets — earliest facet-analyzed session query should find nothing

      const app = createApp();
      const res = await app.request('/api/personality/weeks');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.weeks).toEqual([]);
    });

    it('reports sessionCount based on facet-analyzed sessions, not raw session count', async () => {
      seedProject('proj-1', 'alpha');
      seedSession('sess-1', 'proj-1', { started_at: '2026-07-20T10:00:00Z' });
      seedFacets('sess-1');
      seedSession('sess-2', 'proj-1', { started_at: '2026-07-21T10:00:00Z' });
      // sess-2 has no facets — should not count toward sessionCount

      const app = createApp();
      const res = await app.request('/api/personality/weeks');
      expect(res.status).toBe(200);
      const body = await res.json();
      const week = body.weeks.find((w: { week: string }) => w.week === '2026-W30');
      expect(week).toBeDefined();
      expect(week.sessionCount).toBe(1);
    });

    it('marks hasSnapshot true only when a personality_snapshots row exists for that week/project', async () => {
      seedProject('proj-1', 'alpha');
      seedSession('sess-1', 'proj-1', { started_at: '2026-07-20T10:00:00Z' });
      seedFacets('sess-1');
      seedSnapshot('2026-W30', '__all__');

      const app = createApp();
      const res = await app.request('/api/personality/weeks');
      expect(res.status).toBe(200);
      const body = await res.json();
      const week = body.weeks.find((w: { week: string }) => w.week === '2026-W30');
      expect(week.hasSnapshot).toBe(true);
      expect(week.generatedAt).toBe('2026-07-15T10:00:00Z');
    });

    it('scopes to a specific project when project query param is provided', async () => {
      seedProject('proj-1', 'alpha');
      seedProject('proj-2', 'beta');
      seedSession('sess-1', 'proj-1', { started_at: '2026-07-20T10:00:00Z' });
      seedFacets('sess-1');
      seedSession('sess-2', 'proj-2', { started_at: '2026-07-20T10:00:00Z' });
      seedFacets('sess-2');
      // Snapshot exists for proj-1 only
      seedSnapshot('2026-W30', 'proj-1');

      const app = createApp();
      const res = await app.request('/api/personality/weeks?project=proj-1');
      expect(res.status).toBe(200);
      const body = await res.json();
      const week = body.weeks.find((w: { week: string }) => w.week === '2026-W30');
      // Only proj-1's facet-analyzed session should count
      expect(week.sessionCount).toBe(1);
      expect(week.hasSnapshot).toBe(true);
    });
  });
});
