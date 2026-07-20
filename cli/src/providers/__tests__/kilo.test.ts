import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import { KiloProvider } from '../kilo.js';

// Mock the config utilities
vi.mock('../../utils/config.js', async () => {
  const actual = await vi.importActual('../../utils/config.js') as any;
  return {
    ...actual,
    getKiloDir: vi.fn(),
  };
});

import { getKiloDir } from '../../utils/config.js';

describe('KiloProvider', () => {
  let tempBaseDir: string;
  const provider = new KiloProvider();

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kilo-test-'));
    vi.mocked(getKiloDir).mockReturnValue(tempBaseDir);

    // Create directory structure
    fs.mkdirSync(path.join(tempBaseDir, 'storage', 'session', 'project-1'), { recursive: true });
    fs.mkdirSync(path.join(tempBaseDir, 'storage', 'message', 'ses-1'), { recursive: true });
    fs.mkdirSync(path.join(tempBaseDir, 'storage', 'part', 'msg-1'), { recursive: true });
    fs.mkdirSync(path.join(tempBaseDir, 'storage', 'part', 'msg-2'), { recursive: true });

    // Mock session
    fs.writeFileSync(
      path.join(tempBaseDir, 'storage', 'session', 'project-1', 'ses-1.json'),
      JSON.stringify({
        id: 'ses-1',
        slug: 'witty-cactus',
        directory: '/home/user/project',
        title: 'My Kilo Session',
        time: { created: 1784386623277, updated: 1784386889098 }
      })
    );

    // Mock messages
    fs.writeFileSync(
      path.join(tempBaseDir, 'storage', 'message', 'ses-1', 'msg-1.json'),
      JSON.stringify({
        id: 'msg-1',
        sessionID: 'ses-1',
        role: 'user',
        time: { created: 1784386623277 }
      })
    );
    fs.writeFileSync(
      path.join(tempBaseDir, 'storage', 'message', 'ses-1', 'msg-2.json'),
      JSON.stringify({
        id: 'msg-2',
        sessionID: 'ses-1',
        role: 'assistant',
        time: { created: 1784386624886 },
        model: { providerID: 'anthropic', modelID: 'claude-3-5-sonnet' },
        cost: 0.05,
        tokens: { input: 100, output: 50 }
      })
    );

    // Mock parts - Kilo uses 'reasoning' instead of 'thinking'
    fs.writeFileSync(
      path.join(tempBaseDir, 'storage', 'part', 'msg-1', 'prt-1.json'),
      JSON.stringify({
        id: 'prt-1',
        messageID: 'msg-1',
        type: 'text',
        text: 'Hello Kilo'
      })
    );
    fs.writeFileSync(
      path.join(tempBaseDir, 'storage', 'part', 'msg-2', 'prt-2.json'),
      JSON.stringify({
        id: 'prt-2',
        messageID: 'msg-2',
        type: 'text',
        text: 'Hello User'
      })
    );
    fs.writeFileSync(
      path.join(tempBaseDir, 'storage', 'part', 'msg-2', 'prt-3.json'),
      JSON.stringify({
        id: 'prt-3',
        messageID: 'msg-2',
        type: 'tool',
        tool: 'read_file',
        callID: 'call-1',
        state: { input: { path: 'a.txt' }, output: 'file content' }
      })
    );
  });

  afterEach(() => {
    fs.rmSync(tempBaseDir, { recursive: true, force: true });
  });

  it('returns "kilo" as provider name', () => {
    expect(provider.getProviderName()).toBe('kilo');
  });

  describe('discover', () => {
    it('discovers session files in project subdirectories', async () => {
      const discovered = await provider.discover();
      expect(discovered).toContain(path.join(tempBaseDir, 'storage', 'session', 'project-1', 'ses-1.json'));
    });

    it('discovers bundled session directories and skips their parent files', async () => {
      const projectDir = path.join(tempBaseDir, 'storage', 'session', 'project-bundle');
      fs.mkdirSync(projectDir, { recursive: true });
      
      const parentFile = path.join(projectDir, 'bundle-1.json');
      fs.writeFileSync(parentFile, JSON.stringify({ id: 'bundle-1' }));
      
      const bundleDir = path.join(projectDir, 'bundle-1');
      fs.mkdirSync(bundleDir, { recursive: true });
      
      const discovered = await provider.discover({ projectFilter: 'project-bundle' });
      expect(discovered).toContain(bundleDir);
      expect(discovered).not.toContain(parentFile);
    });

    it('filters by project slug (directory name)', async () => {
      const discovered = await provider.discover({ projectFilter: 'project-1' });
      expect(discovered).toHaveLength(1);

      const filtered = await provider.discover({ projectFilter: 'none' });
      expect(filtered).toHaveLength(0);
    });
  });

  describe('parse', () => {
    it('parses a valid Kilo session from the filesystem', async () => {
      const filePath = path.join(tempBaseDir, 'storage', 'session', 'project-1', 'ses-1.json');
      const session = await provider.parse(filePath);

      expect(session).not.toBeNull();
      expect(session!.id).toBe('ses-1');
      expect(session!.projectName).toBe('My Kilo Session');
      expect(session!.sourceTool).toBe('kilo');
      expect(session!.messageCount).toBe(2);
      expect(session!.userMessageCount).toBe(1);
      expect(session!.assistantMessageCount).toBe(1);
      expect(session!.toolCallCount).toBe(1);
      
      const userMsg = session!.messages.find(m => m.type === 'user');
      expect(userMsg!.content).toBe('Hello Kilo');

      const assistantMsg = session!.messages.find(m => m.type === 'assistant');
      expect(assistantMsg!.content).toBe('Hello User');
      expect(assistantMsg!.toolCalls).toHaveLength(1);
      expect(assistantMsg!.toolResults).toHaveLength(1);
      expect(assistantMsg!.toolResults[0].output).toBe('file content');

      expect(session!.usage).not.toBeUndefined();
      expect(session!.usage!.totalInputTokens).toBe(100);
      expect(session!.usage!.totalOutputTokens).toBe(50);
      expect(session!.usage!.estimatedCostUsd).toBe(0.05);
    });

    it('parses a bundled session with aggregated messages', async () => {
      const sessionId = 'bundle-ses';
      const projectDir = path.join(tempBaseDir, 'storage', 'session', 'project-bundle');
      fs.mkdirSync(projectDir, { recursive: true });
      
      const parentFile = path.join(projectDir, `${sessionId}.json`);
      fs.writeFileSync(parentFile, JSON.stringify({
        id: sessionId,
        title: 'Parent Session',
        time: { created: 1784000000000 }
      }));
      
      const messagesDir = path.join(tempBaseDir, 'storage', 'message', sessionId);
      fs.mkdirSync(messagesDir, { recursive: true });
      fs.writeFileSync(path.join(messagesDir, 'msg-parent.json'), JSON.stringify({
        id: 'msg-parent',
        role: 'user',
        time: { created: 1784000000000 }
      }));

      const bundleDir = path.join(projectDir, sessionId);
      fs.mkdirSync(bundleDir, { recursive: true });
      fs.writeFileSync(path.join(bundleDir, 'sub-1.json'), JSON.stringify({
        id: 'sub-1-id',
        title: 'Sub Session',
        time: { created: 1784000001000 }
      }));
      
      const subMessagesDir = path.join(tempBaseDir, 'storage', 'message', 'sub-1-id');
      fs.mkdirSync(subMessagesDir, { recursive: true });
      fs.writeFileSync(path.join(subMessagesDir, 'msg-sub.json'), JSON.stringify({
        id: 'msg-sub',
        role: 'assistant',
        time: { created: 1784000001000 }
      }));

      const session = await provider.parse(bundleDir);
      
      expect(session).not.toBeNull();
      expect(session!.messageCount).toBe(2);
      expect(session!.messages[0].id).toBe('msg-parent');
      expect(session!.messages[1].id).toBe('msg-sub');
      expect(session!.startedAt.getTime()).toBe(1784000000000);
      expect(session!.endedAt.getTime()).toBe(1784000001000);
    });

    it('handles missing timestamps with Date.now() fallback', async () => {
      const filePath = path.join(tempBaseDir, 'storage', 'session', 'project-1', 'ses-1.json');
      fs.writeFileSync(filePath, JSON.stringify({
        id: 'ses-1',
        time: { created: 0, updated: 0 }
      }));
      
      const session = await provider.parse(filePath);
      if (session) {
        expect(session.startedAt.getTime()).toBeGreaterThan(0);
        expect(session.endedAt.getTime()).toBeGreaterThan(0);
      }
    });

    it('maps reasoning part type to thinking', async () => {
      fs.writeFileSync(
        path.join(tempBaseDir, 'storage', 'part', 'msg-2', 'prt-reasoning.json'),
        JSON.stringify({
          id: 'prt-reasoning',
          messageID: 'msg-2',
          type: 'reasoning',
          text: 'This is my reasoning process'
        })
      );

      const filePath = path.join(tempBaseDir, 'storage', 'session', 'project-1', 'ses-1.json');
      const session = await provider.parse(filePath);

      const assistantMsg = session!.messages.find(m => m.type === 'assistant');
      expect(assistantMsg!.thinking).toBe('This is my reasoning process');
    });
  });

  describe('parseDatabaseSession', () => {
    let tempDbPath: string;

    beforeEach(() => {
      tempDbPath = path.join(tempBaseDir, 'kilo.db');
      const db = new Database(tempDbPath);

      // Create schema matching Kilo's actual structure
      db.exec(`
        CREATE TABLE session (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          model TEXT,
          cost REAL,
          tokens_input INTEGER,
          tokens_output INTEGER,
          tokens_cache_read INTEGER,
          tokens_cache_write INTEGER,
          agent TEXT,
          slug TEXT,
          version TEXT,
          title TEXT,
          directory TEXT,
          time_created INTEGER,
          time_updated INTEGER
        );

        CREATE TABLE message (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          role TEXT,
          data TEXT,
          time_created INTEGER,
          time_updated INTEGER
        );

        CREATE TABLE part (
          id TEXT PRIMARY KEY,
          message_id TEXT,
          type TEXT,
          data TEXT,
          text TEXT,
          tool TEXT,
          state TEXT,
          call_id TEXT
        );
      `);

      // Insert test session with millisecond timestamps
      db.prepare(`
        INSERT INTO session (id, project_id, model, cost, tokens_input, tokens_output, 
                            tokens_cache_read, tokens_cache_write, agent, slug, version, 
                            title, directory, time_created, time_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'db-ses-1', 'proj-1', 
        JSON.stringify({ id: 'claude-3-5-sonnet', providerID: 'anthropic' }),
        0.03, 80, 40, 10, 5, 'kilo-agent', 'test-slug', '7.4.11',
        'Database Session Test', '/home/user/test-project',
        1784386623277, 1784386889098
      );

      // Insert messages with millisecond timestamps
      db.prepare(`
        INSERT INTO message (id, session_id, role, data, time_created, time_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'db-msg-1', 'db-ses-1', 'user',
        JSON.stringify({ role: 'user' }),
        1784386623277, 1784386623277
      );
      db.prepare(`
        INSERT INTO message (id, session_id, role, data, time_created, time_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'db-msg-2', 'db-ses-1', 'assistant',
        JSON.stringify({ 
          role: 'assistant',
          model: { providerID: 'anthropic', modelID: 'claude-3-5-sonnet' }
        }),
        1784386624886, 1784386624886
      );

      // Insert parts
      db.prepare(`
        INSERT INTO part (id, message_id, type, data, text, tool, state, call_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'db-prt-1', 'db-msg-1', 'text',
        JSON.stringify({ type: 'text', text: 'Database query' }),
        'Database query', null, null, null
      );
      db.prepare(`
        INSERT INTO part (id, message_id, type, data, text, tool, state, call_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'db-prt-2', 'db-msg-2', 'text',
        JSON.stringify({ type: 'text', text: 'Database response' }),
        'Database response', null, null, null
      );
      db.prepare(`
        INSERT INTO part (id, message_id, type, data, text, tool, state, call_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'db-prt-3', 'db-msg-2', 'step-finish',
        JSON.stringify({ 
          type: 'step-finish',
          tokens: { input: 80, output: 40, cache: { read: 10, write: 5 } },
          cost: 0.03
        }),
        null, null, null, null
      );

      db.close();
    });

    it('parses a session from the SQLite database with millisecond timestamps', async () => {
      const virtualPath = `${tempDbPath}#db-ses-1`;
      const session = await provider.parse(virtualPath);

      expect(session).not.toBeNull();
      expect(session!.id).toBe('db-ses-1');
      expect(session!.projectName).toBe('Database Session Test');
      expect(session!.projectPath).toBe('/home/user/test-project');
      expect(session!.sourceTool).toBe('kilo');
      expect(session!.claudeVersion).toBe('7.4.11');
      expect(session!.messageCount).toBe(2);

      // Verify millisecond timestamp parsing
      expect(session!.startedAt.getTime()).toBe(1784386623277);
      expect(session!.endedAt.getTime()).toBe(1784386889098);

      const userMsg = session!.messages.find(m => m.type === 'user');
      expect(userMsg!.content).toBe('Database query');
      expect(userMsg!.timestamp.getTime()).toBe(1784386623277);

      const assistantMsg = session!.messages.find(m => m.type === 'assistant');
      expect(assistantMsg!.content).toBe('Database response');
      expect(assistantMsg!.timestamp.getTime()).toBe(1784386624886);
    });

    it('uses session-level token usage when available', async () => {
      const virtualPath = `${tempDbPath}#db-ses-1`;
      const session = await provider.parse(virtualPath);

      expect(session!.usage).not.toBeUndefined();
      expect(session!.usage!.totalInputTokens).toBe(80);
      expect(session!.usage!.totalOutputTokens).toBe(40);
      expect(session!.usage!.cacheReadTokens).toBe(10);
      expect(session!.usage!.estimatedCostUsd).toBe(0.03);
    });

    it('handles reasoning part type in database', async () => {
      const db = new Database(tempDbPath, { readonly: false });
      db.prepare(`
        INSERT INTO part (id, message_id, type, data, text)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'db-prt-reasoning', 'db-msg-2', 'reasoning',
        JSON.stringify({ type: 'reasoning', text: 'Thinking about this...' }),
        'Thinking about this...'
      );
      db.close();

      const virtualPath = `${tempDbPath}#db-ses-1`;
      const session = await provider.parse(virtualPath);

      const assistantMsg = session!.messages.find(m => m.type === 'assistant');
      expect(assistantMsg!.thinking).toContain('Thinking about this...');
    });
  });
});
