import { describe, it, expect } from 'vitest';
import { resolveTurnReference } from '../turn-citations.js';

const messages = [
  { id: 'u0', type: 'user', content: 'Choose SQLite' },
  { id: 'a0', type: 'assistant', content: 'I propose D1' },
  { id: 'tool', type: 'user', content: '[{"type":"tool_result","content":"ok"}]' },
  { id: 'compact', type: 'user', content: 'Here is a summary of our conversation so far' },
  { id: 'slash', type: 'user', content: '/compact' },
  { id: 'u1', type: 'user', content: 'No, use SQLite' },
  { id: 'a1', type: 'assistant', content: 'Agreed' },
  { id: 'sys', type: 'system', content: 'Runtime event' },
];

describe('resolveTurnReference', () => {
  it('matches human role ordinals while excluding tool/system artifacts', () => {
    expect(resolveTurnReference(messages, 'User', 0)).toEqual({ messageId: 'u0', offset: 0 });
    expect(resolveTurnReference(messages, 'User', 1)).toEqual({ messageId: 'u1', offset: 5 });
    expect(resolveTurnReference(messages, 'Assistant', 1)).toEqual({ messageId: 'a1', offset: 6 });
    expect(resolveTurnReference(messages, 'User', 2)).toBeNull();
  });
  it('rejects invalid, unsafe and out-of-range indices', () => {
    expect(resolveTurnReference(messages, 'User', -1)).toBeNull();
    expect(resolveTurnReference(messages, 'User', 1.5)).toBeNull();
    expect(resolveTurnReference(messages, 'User', Number.MAX_SAFE_INTEGER + 1)).toBeNull();
    expect(resolveTurnReference(messages, 'Assistant', 2)).toBeNull();
  });
});
