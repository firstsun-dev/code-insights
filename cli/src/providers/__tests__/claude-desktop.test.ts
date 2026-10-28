import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ClaudeDesktopProvider, getClaudeDesktopDir } from '../claude-desktop.js';

const provider = new ClaudeDesktopProvider();
let home: string;

beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-claude-desktop-')); });
afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

function writeSession() {
  const projectDir = path.join(getClaudeDesktopDir(home), 'account-1', 'project-1');
  const sessionDir = path.join(projectDir, 'session-1');
  fs.mkdirSync(sessionDir, { recursive: true });
  const audit = path.join(sessionDir, 'audit.jsonl');
  const rows = [
    { type: 'user', uuid: 'u1', sessionId: 'original', timestamp: '2026-09-01T10:00:00Z', message: { role: 'user', content: 'Investigate API latency' } },
    { type: 'assistant', uuid: 'a1', sessionId: 'original', timestamp: '2026-09-01T10:00:05Z', parentUuid: 'u1', message: { role: 'assistant', content: 'I will inspect the traces', model: 'claude-sonnet-4-5', usage: { input_tokens: 100, output_tokens: 30 } } },
    { type: 'user', uuid: 'u2', sessionId: 'original', timestamp: '2026-09-01T10:00:15Z', parentUuid: 'a1', message: { role: 'user', content: 'Check the slow endpoint too' } },
  ];
  fs.writeFileSync(audit, rows.map(x => JSON.stringify(x)).join('\n'));
  fs.writeFileSync(path.join(projectDir, 'session-1.json'), JSON.stringify({ title: 'Investigate latency', userSelectedFolders: ['/tmp/my-app'] }));
  return audit;
}

describe('ClaudeDesktopProvider', () => {
  it('is manual opt-in rather than included in a regular sync', async () => {
    expect(provider.getProviderName()).toBe('claude-desktop');
    expect(await provider.discover({ homeRoot: home })).toEqual([]);
  });
  it('discovers local audit.jsonl from a selected home and parses non-UUID filename', async () => {
    const audit = writeSession();
    expect(await provider.discover({ homeRoot: home })).toEqual([audit]);
    expect(await provider.discover({ homeRoot: home, projectFilter: 'other' })).toEqual([]);
    const parsed = await provider.parse(audit);
    expect(parsed).not.toBeNull();
    expect(parsed!.sourceTool).toBe('claude-desktop');
    expect(parsed!.id).toMatch(/^claude-desktop-/);
    expect(parsed!.messages).toHaveLength(3);
    expect(parsed!.messages.every(m => m.sessionId === parsed!.id && m.id.startsWith(parsed!.id + ':'))).toBe(true);
    expect(parsed!.messages[1].parentId).toBe(`${parsed!.id}:u1`);
    expect(parsed!.projectPath).toBe('/tmp/my-app');
    expect(parsed!.customTitle).toBe('Investigate latency');
    expect((await provider.parse(audit))!.id).toBe(parsed!.id);
  });
  it('does not import an empty audit session', async () => {
    const audit = writeSession();
    fs.writeFileSync(audit, '');
    expect(await provider.parse(audit)).toBeNull();
  });
});