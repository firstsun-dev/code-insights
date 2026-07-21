import { describe, expect, it } from 'vitest';
import { buildReportContext, buildReportSystemPrompt } from './report-prompts.js';

const sources = [{
  sessionId: 'session-1', title: 'Implement reports', projectName: 'code-insights',
  startedAt: '2026-07-21T09:00:00.000Z', summary: 'Added a reports API.',
  insights: [{ type: 'decision', title: 'Reuse LLM client', summary: 'Avoid a second provider abstraction.' }],
}];

describe('report prompts', () => {
  it('requires grounded Traditional Chinese report sections', () => {
    const prompt = buildReportSystemPrompt('weekly');
    expect(prompt).toContain('Traditional Chinese');
    expect(prompt).toContain('## 完成事項');
    expect(prompt).toContain('Do not invent');
  });

  it('includes sources and optional user instructions in context', () => {
    const context = buildReportContext({ type: 'daily', dateFrom: '2026-07-21', instructions: 'Focus on blockers.', sources });
    expect(context).toContain('Focus on blockers.');
    expect(context).toContain('sessionId=session-1');
    expect(context).toContain('Reuse LLM client');
  });
});
