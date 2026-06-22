import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFileSync } from 'child_process';
import { MistralVibeRunner } from '../mistral-vibe-runner.js';

// Mock child_process
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);

describe('MistralVibeRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has the correct runner name', () => {
    const runner = new MistralVibeRunner();
    expect(runner.name).toBe('mistral-vibe-cli');
  });

  it('calls vibe -p with correct args', async () => {
    const runner = new MistralVibeRunner();
    const mockJson = JSON.stringify([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: '{"summary": "test"}' }
    ]);
    
    mockedExecFileSync.mockReturnValue(mockJson);

    const result = await runner.runAnalysis({
      systemPrompt: 'sys',
      userPrompt: 'user',
    });

    expect(mockedExecFileSync).toHaveBeenCalledWith(
      'vibe',
      ['-p', '--output', 'json', '--trust', '--auto-approve'],
      expect.objectContaining({
        input: expect.stringContaining('sys'),
        encoding: 'utf-8',
        timeout: 300000,
        maxBuffer: 30 * 1024 * 1024,
      })
    );
    expect(result.rawJson).toBe('{"summary": "test"}');
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
  });

  it('strips <json> tags from the assistant response', async () => {
    const runner = new MistralVibeRunner();
    const mockJson = JSON.stringify([
      { role: 'assistant', content: '<json>\n{"test": true}\n</json>' }
    ]);
    mockedExecFileSync.mockReturnValue(mockJson);

    const result = await runner.runAnalysis({ systemPrompt: 's', userPrompt: 'u' });
    expect(result.rawJson).toBe('{"test": true}');
  });

  it('throws usage limit error when rate limit is detected', async () => {
    const runner = new MistralVibeRunner();
    const err: any = new Error('Command failed');
    err.stderr = Buffer.from('rateLimitExceeded');
    mockedExecFileSync.mockImplementation(() => { throw err; });

    await expect(runner.runAnalysis({ systemPrompt: 's', userPrompt: 'u' }))
      .rejects.toThrow(/Mistral Vibe usage limit reached/);
  });

  it('retries on SSL/connection error', async () => {
    const runner = new MistralVibeRunner();
    const sslErr: any = new Error('Command failed');
    sslErr.stderr = Buffer.from('SSLError: certificate verify failed');

    // First attempt fails with SSL error, second attempt succeeds
    const mockJson = JSON.stringify([
      { role: 'assistant', content: '{"success": true}' }
    ]);

    mockedExecFileSync
      .mockImplementationOnce(() => { throw sslErr; })
      .mockReturnValueOnce(mockJson);

    const result = await runner.runAnalysis({ systemPrompt: 's', userPrompt: 'u' });
    
    expect(mockedExecFileSync).toHaveBeenCalledTimes(2);
    expect(result.rawJson).toBe('{"success": true}');
  });
});
