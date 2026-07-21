import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runMigrations } from '../../../cli/src/db/migrate.js';

let testDb: Database.Database;
const mockChat = vi.fn();
const mockConfigured = vi.fn(() => true);

vi.mock('@code-insights/cli/db/client', () => ({ getDb: () => testDb, closeDb: () => {} }));
vi.mock('../llm/client.js', () => ({
  isLLMConfigured: () => mockConfigured(),
  createLLMClient: () => ({ chat: mockChat, model: 'test-model' }),
}));

const { createApp } = await import('../index.js');

function seed() {
  testDb.prepare("INSERT INTO projects (id, name, path, last_activity) VALUES ('p1', 'App', '/app', '2026-07-21T00:00:00.000Z')").run();
  testDb.prepare("INSERT INTO projects (id, name, path, last_activity) VALUES ('p2', 'Site', '/site', '2026-07-21T00:00:00.000Z')").run();
  testDb.prepare("INSERT INTO sessions (id, project_id, project_name, project_path, generated_title, summary, started_at, ended_at, source_tool, home_id) VALUES ('s1', 'p1', 'App', '/app', 'Build report', 'Implemented report generation', '2026-07-21T09:00:00.000Z', '2026-07-21T10:00:00.000Z', 'codex', 'home-a')").run();
  testDb.prepare("INSERT INTO sessions (id, project_id, project_name, project_path, generated_title, summary, started_at, ended_at, source_tool, home_id) VALUES ('s2', 'p2', 'Site', '/site', 'Build site', 'Implemented site report', '2026-07-21T09:00:00.000Z', '2026-07-21T10:00:00.000Z', 'codex', 'home-a')").run();
  testDb.prepare("INSERT INTO insights (id, session_id, project_id, project_name, type, title, content, summary, confidence, timestamp) VALUES ('i1', 's1', 'p1', 'App', 'decision', 'Reuse client', 'content', 'Reuse the existing LLM client', .9, '2026-07-21T10:00:00.000Z')").run();
}

describe('Reports routes', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    runMigrations(testDb);
    seed();
    mockConfigured.mockReturnValue(true);
    mockChat.mockResolvedValue({ content: '## 完成事項\n- 已完成 API', usage: { inputTokens: 12, outputTokens: 8 } });
  });

  it('rejects invalid report types', async () => {
    const res = await createApp().request('/api/reports/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType: 'monthly' }) });
    expect(res.status).toBe(400);
  });

  it('generates a grounded report with source references', async () => {
    const res = await createApp().request('/api/reports/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType: 'daily', dateFrom: '2026-07-21', dateTo: '2026-07-21', homeId: 'home-a', projectIds: ['p1'], instructions: 'Focus on delivery.' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sourceCount).toBe(1);
    expect(body.sources[0].sessionId).toBe('s1');
    expect(body.markdown).toContain('完成事項');
    expect(mockChat.mock.calls[0][0][1].content).toContain('Focus on delivery.');
    expect(mockChat.mock.calls[0][0][1].content).toContain('Reuse the existing LLM client');
  });

  it('filters evidence to the selected projects', async () => {
    const res = await createApp().request('/api/reports/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType: 'daily', dateFrom: '2026-07-21', dateTo: '2026-07-21', homeId: 'home-a', projectIds: ['p1'] }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sourceCount).toBe(1);
    expect(body.sources[0].sessionId).toBe('s1');
  });

  it('returns 404 when no session falls in scope', async () => {
    const res = await createApp().request('/api/reports/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType: 'daily', dateFrom: '2026-07-20', dateTo: '2026-07-20' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unmatched Home Directory', async () => {
    const res = await createApp().request('/api/reports/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType: 'daily', dateFrom: '2026-07-21', dateTo: '2026-07-21', homeId: 'home-b' }) });
    expect(res.status).toBe(404);
  });
});
