import { describe, it, expect } from 'vitest';
import { detectRageLoopHeuristic } from '../loop-detector.js';
import type { SQLiteMessageRow } from '../prompt-types.js';

describe('detectRageLoopHeuristic', () => {
  const mockMessage = (id: string, timestamp: string, usage: string, content: string = 'msg'): SQLiteMessageRow => ({
    id,
    session_id: 's1',
    type: 'user',
    content,
    thinking: null,
    tool_calls: '[]',
    tool_results: '[]',
    usage,
    timestamp,
    parent_id: null,
  });

  it('should detect a rage loop when token count is static and messages are rapid', () => {
    const messages: SQLiteMessageRow[] = [
      mockMessage('1', '2026-04-24T10:00:00Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('2', '2026-04-24T10:00:10Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('3', '2026-04-24T10:00:20Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('4', '2026-04-24T10:00:30Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('5', '2026-04-24T10:00:40Z', JSON.stringify({ inputTokens: 150000 })),
    ];

    // Repeat a substantive failure; empty [] tool-call fields are not evidence.
    messages[2].content = 'Timeout when deploying exactly the same revision';
    messages[3].content = 'Timeout when deploying exactly the same revision';
    messages[4].content = 'Timeout when deploying exactly the same revision';

    const result = detectRageLoopHeuristic(messages);
    expect(result.detected).toBe(true);
    expect(result.reasoning).toContain('static token count (150k)');
    expect(result.turnRange).toEqual(['Turn#0', 'Turn#4']);
  });

  it('does not classify empty tool calls and short, generic responses as a rage loop', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      mockMessage(String(i), `2026-04-24T10:00:${String(i * 10).padStart(2, '0')}Z`, JSON.stringify({ inputTokens: 150000 }), 'OK')
    );
    expect(detectRageLoopHeuristic(messages).detected).toBe(false);
  });

  it('does not treat out-of-order timestamps as a rapid loop', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      mockMessage(String(i), `2026-04-24T10:00:${String(i * 10).padStart(2, '0')}Z`, JSON.stringify({ inputTokens: 150000 }), 'Timeout when deploying exactly the same revision')
    );
    messages[2].timestamp = '2026-04-24T09:00:00Z';
    expect(detectRageLoopHeuristic(messages).detected).toBe(false);
  });

  it('classifies repeated low-context errors separately from rage loops', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      mockMessage(String(i), `2026-04-24T10:00:${String(i * 10).padStart(2, '0')}Z`, JSON.stringify({ inputTokens: 8000 }), 'Timeout when deploying exactly the same revision')
    );
    expect(detectRageLoopHeuristic(messages).detected).toBe(false);
  });

  it('should not detect a loop if token count is growing', () => {
    const messages: SQLiteMessageRow[] = [
      mockMessage('1', '2026-04-24T10:00:00Z', JSON.stringify({ inputTokens: 100000 })),
      mockMessage('2', '2026-04-24T10:00:10Z', JSON.stringify({ inputTokens: 110000 })),
      mockMessage('3', '2026-04-24T10:00:20Z', JSON.stringify({ inputTokens: 120000 })),
      mockMessage('4', '2026-04-24T10:00:30Z', JSON.stringify({ inputTokens: 130000 })),
      mockMessage('5', '2026-04-24T10:00:40Z', JSON.stringify({ inputTokens: 140000 })),
    ];

    const result = detectRageLoopHeuristic(messages);
    expect(result.detected).toBe(false);
  });

  it('should not detect a loop if messages are sparse in time', () => {
    const messages: SQLiteMessageRow[] = [
      mockMessage('1', '2026-04-24T10:00:00Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('2', '2026-04-24T10:10:00Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('3', '2026-04-24T10:20:00Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('4', '2026-04-24T10:30:00Z', JSON.stringify({ inputTokens: 150000 })),
      mockMessage('5', '2026-04-24T10:40:00Z', JSON.stringify({ inputTokens: 150000 })),
    ];

    const result = detectRageLoopHeuristic(messages);
    expect(result.detected).toBe(false);
  });
});
