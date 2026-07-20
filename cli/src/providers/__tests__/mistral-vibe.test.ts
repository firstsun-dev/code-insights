import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MistralVibeProvider } from '../mistral-vibe.js';

describe('MistralVibeProvider', () => {
  let tempBaseDir: string;
  let tempLogsDir: string;
  let provider: MistralVibeProvider;

  beforeEach(() => {
    tempBaseDir = path.join(os.tmpdir(), 'vibe-test-logs-' + Math.random().toString(36).substring(7));
    tempLogsDir = path.join(tempBaseDir, 'session');
    fs.mkdirSync(tempLogsDir, { recursive: true });
    provider = new MistralVibeProvider(tempLogsDir);
  });

  afterEach(() => {
    fs.rmSync(tempBaseDir, { recursive: true, force: true });
  });

  it('returns "mistral-vibe" as provider name', () => {
    expect(provider.getProviderName()).toBe('mistral-vibe');
  });

  it('discovers session directories', async () => {
    const sessionDir = path.join(tempLogsDir, 'session_20260415_123456_abc');
    fs.mkdirSync(sessionDir);
    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify({ session_id: 'abc' }));
    fs.writeFileSync(path.join(sessionDir, 'messages.jsonl'), '');

    const discovered = await provider.discover();
    expect(discovered.map(p => path.resolve(p))).toContain(path.resolve(sessionDir));
  });

  it('parses a valid mistral-vibe session', async () => {
    const sessionDir = path.join(tempLogsDir, 'session_20260415_123456_abc');
    fs.mkdirSync(sessionDir);
    
    const meta = {
      session_id: 'abc-123',
      start_time: '2026-04-15T10:00:00Z',
      end_time: '2026-04-15T10:05:00Z',
      environment: {
        working_directory: '/home/user/project'
      },
      stats: {
        session_prompt_tokens: 1000,
        session_completion_tokens: 500,
        session_cost: 0.01
      },
      title: 'Test Session'
    };
    
    const messages = [
      JSON.stringify({ role: 'user', content: 'hello', message_id: 'm1' }),
      JSON.stringify({ role: 'assistant', content: 'hi there', message_id: 'm2' }),
      JSON.stringify({ role: 'user', content: 'run tool', message_id: 'm3' }),
      JSON.stringify({ role: 'assistant', content: '[{"type": "function", "function": {"name": "ls", "parameters": {"path": "."}}}]', message_id: 'm4' }),
      JSON.stringify({ role: 'tool', content: 'file1.txt', tool_call_id: 'tc-0', name: 'ls' }),
      JSON.stringify({ role: 'assistant', content: 'I see file1.txt', message_id: 'm5' })
    ].join('\n');

    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(sessionDir, 'messages.jsonl'), messages);

    const session = await provider.parse(sessionDir);

    expect(session).not.toBeNull();
    expect(session!.id).toBe('abc-123');
    expect(session!.projectName).toBe('project');
    expect(session!.userMessageCount).toBe(3); // 2 real + 1 synthetic for tool results
    expect(session!.assistantMessageCount).toBe(3);
    expect(session!.toolCallCount).toBe(1);
    expect(session!.messages[3].toolCalls).toHaveLength(1);
    expect(session!.messages[3].toolCalls[0].name).toBe('ls');
    
    // Check tool result attachment
    const toolResultMsg = session!.messages[4];
    expect(toolResultMsg.type).toBe('user');
    expect(toolResultMsg.toolResults).toHaveLength(1);
    expect(toolResultMsg.toolResults[0].output).toBe('file1.txt');
  });

  it('handles mixed assistant content', async () => {
    const sessionDir = path.join(tempLogsDir, 'session_abc');
    fs.mkdirSync(sessionDir);

    const meta = {
      session_id: 'abc',
      start_time: '2026-04-15T10:00:00Z',
      end_time: '2026-04-15T10:05:00Z'
    };

    const messages = [
      JSON.stringify({
        role: 'assistant',
        content: '[{"type": "function", "function": {"name": "ask", "parameters": {}}}]Wait for my answer.',
        message_id: 'm1'
      })
    ].join('\n');

    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(sessionDir, 'messages.jsonl'), messages);

    const session = await provider.parse(sessionDir);
    expect(session!.messages[0].toolCalls).toHaveLength(1);
    expect(session!.messages[0].content).toBe('Wait for my answer.');
  });

  it('discovers sessions recursively including nested subagents', async () => {
    // Create main session
    const mainSessionDir = path.join(tempLogsDir, 'session_20260516_140021_d307c163');
    fs.mkdirSync(mainSessionDir, { recursive: true });
    fs.writeFileSync(path.join(mainSessionDir, 'meta.json'), JSON.stringify({
      session_id: 'main-123',
      start_time: '2026-05-16T14:00:21Z',
      end_time: '2026-05-16T14:05:00Z'
    }));
    fs.writeFileSync(path.join(mainSessionDir, 'messages.jsonl'), JSON.stringify({ role: 'user', content: 'test' }));

    // Create subagent at level 1
    const subAgent1Dir = path.join(mainSessionDir, 'agents', 'hybrid-graphify-research_20260516_140129_38643c70');
    fs.mkdirSync(subAgent1Dir, { recursive: true });
    fs.writeFileSync(path.join(subAgent1Dir, 'meta.json'), JSON.stringify({
      session_id: 'sub1-456',
      start_time: '2026-05-16T14:01:29Z',
      end_time: '2026-05-16T14:03:00Z',
      parent_session_id: 'main-123',
      agent_type: 'hybrid-graphify-research'
    }));
    fs.writeFileSync(path.join(subAgent1Dir, 'messages.jsonl'), JSON.stringify({ role: 'user', content: 'subagent task' }));

    // Create nested subagent at level 2
    const subAgent2Dir = path.join(subAgent1Dir, 'agents', 'hybrid-graphify-query_20260516_140208_1d913b6e');
    fs.mkdirSync(subAgent2Dir, { recursive: true });
    fs.writeFileSync(path.join(subAgent2Dir, 'meta.json'), JSON.stringify({
      session_id: 'sub2-789',
      start_time: '2026-05-16T14:02:08Z',
      end_time: '2026-05-16T14:02:30Z',
      parent_session_id: 'sub1-456',
      agent_type: 'hybrid-graphify-query'
    }));
    fs.writeFileSync(path.join(subAgent2Dir, 'messages.jsonl'), JSON.stringify({ role: 'user', content: 'nested query' }));

    const discovered = await provider.discover();

    expect(discovered).toHaveLength(3);
    expect(discovered.map(p => path.resolve(p))).toEqual(
      expect.arrayContaining([
        path.resolve(mainSessionDir),
        path.resolve(subAgent1Dir),
        path.resolve(subAgent2Dir)
      ])
    );
  });

  it('parses session with parent_session_id and agent_type', async () => {
    const sessionDir = path.join(tempLogsDir, 'agents', 'research_agent_123');
    fs.mkdirSync(sessionDir, { recursive: true });

    const meta = {
      session_id: 'agent-abc',
      start_time: '2026-05-16T10:00:00Z',
      end_time: '2026-05-16T10:05:00Z',
      parent_session_id: 'main-session-xyz',
      agent_type: 'research-agent',
      environment: {
        working_directory: '/home/user/project'
      }
    };

    const messages = [
      JSON.stringify({ role: 'user', content: 'search for docs', message_id: 'm1' }),
      JSON.stringify({ role: 'assistant', content: 'Found 3 results', message_id: 'm2', reasoning: 'I analyzed the query...' })
    ].join('\n');

    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(sessionDir, 'messages.jsonl'), messages);

    const session = await provider.parse(sessionDir);

    expect(session).not.toBeNull();
    expect(session!.id).toBe('agent-abc');
    expect(session!.parentSessionId).toBe('main-session-xyz');
    expect(session!.agentType).toBe('research-agent');
    expect(session!.messages[1].thinking).toBe('I analyzed the query...');
  });

  it('discovers sessions with any folder prefix, not just session_', async () => {
    // Create folder with custom prefix
    const customPrefixDir = path.join(tempLogsDir, 'custom_prefix_20260516_abc');
    fs.mkdirSync(customPrefixDir);
    fs.writeFileSync(path.join(customPrefixDir, 'meta.json'), JSON.stringify({ session_id: 'custom-123' }));
    fs.writeFileSync(path.join(customPrefixDir, 'messages.jsonl'), '');

    const discovered = await provider.discover();
    expect(discovered.map(p => path.resolve(p))).toContain(path.resolve(customPrefixDir));
  });
});
