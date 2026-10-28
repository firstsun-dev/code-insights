import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PiProvider } from '../pi.js';
import { getProvider, getAllProviders } from '../registry.js';

const provider = new PiProvider();
let home: string;

beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-pi-')); });
afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

function writeSession() {
  const dir = path.join(home, '.pi', 'agent', 'sessions', '--tmp-project--');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'sample.jsonl');
  const rows = [
    { type: 'session', cwd: '/tmp/project' },
    { type: 'message', id: '1', timestamp: '2026-09-01T10:00:00Z', message: { role: 'user', content: [{ type: 'text', text: 'Review this PR' }] } },
    { type: 'message', id: '2', parentId: '1', timestamp: '2026-09-01T10:00:05Z', message: { role: 'assistant', content: [{ type: 'text', text: 'I found a bug' }], model: 'gpt-4o-mini', usage: { input: 120, output: 40, cacheRead: 10 } } },
    { type: 'compaction' },
    { type: 'message', id: '3', parentId: '2', timestamp: '2026-09-01T10:00:15Z', message: { role: 'user', content: 'Please fix it' } },
  ];
  fs.writeFileSync(file, rows.map(x => JSON.stringify(x)).join('\n'));
  return file;
}

describe('PiProvider', () => {
  it('is registered for explicit --source but excluded from default all-provider scans', () => {
    expect(getProvider('pi').getProviderName()).toBe('pi');
    expect(getProvider('claude-desktop').getProviderName()).toBe('claude-desktop');
    const enabled = getAllProviders().map(p => p.getProviderName());
    expect(enabled).not.toContain('pi');
    expect(enabled).not.toContain('claude-desktop');
    expect(enabled).toContain('kilo');
    expect(getAllProviders(true).map(p => p.getProviderName())).toContain('pi');
  });
  it('discovers and parses Pi session JSONL under a selected home', async () => {
    const file = writeSession();
    expect(await provider.discover({ homeRoot: home })).toEqual([file]);
    expect(await provider.discover({ homeRoot: home, projectFilter: 'unmatched' })).toEqual([]);
    const parsed = await provider.parse(file);
    expect(parsed).not.toBeNull();
    expect(parsed!.sourceTool).toBe('pi');
    expect(parsed!.id).toMatch(/^pi-/);
    expect(parsed!.messages).toHaveLength(3);
    expect(parsed!.messages.every(m => m.id.startsWith(parsed!.id + ':'))).toBe(true);
    expect(parsed!.messages[1].parentId).toBe(`${parsed!.id}:1`);
    expect(parsed!.usage?.totalInputTokens).toBe(120);
    expect(parsed!.usage?.cacheReadTokens).toBe(10);
    expect(parsed!.compactCount).toBe(1);
    expect((await provider.parse(file))!.id).toBe(parsed!.id);
  });
  it('skips malformed and empty sessions', async () => {
    const file = writeSession();
    fs.writeFileSync(file, '{not-json}\n');
    expect(await provider.parse(file)).toBeNull();
  });
});