import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AntigravityProvider } from '../antigravity.js';

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    createReadStream: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('AntigravityProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should discover both .pb and .db files in ~/.gemini/antigravity-cli/conversations', async () => {
    const provider = new AntigravityProvider();
    
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      'session-1.pb' as any,
      'session-2.db' as any,
      'other.txt' as any
    ]);

    const sessions = await provider.discover();
    expect(sessions.length).toBe(2);
    expect(sessions[0]).toMatch(/\.pb$/);
    expect(sessions[1]).toMatch(/\.db$/);
    expect(sessions[0]).toContain('.gemini/antigravity-cli/conversations');
  });
});
