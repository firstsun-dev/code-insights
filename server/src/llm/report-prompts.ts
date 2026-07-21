// Prompt and evidence formatting for work-report generation.

export type ReportType = 'daily' | 'weekly' | 'project';

export interface ReportSource {
  sessionId: string;
  title: string;
  projectName: string;
  startedAt: string;
  summary: string | null;
  insights: Array<{ type: string; title: string; summary: string }>;
}

const TYPE_LABELS: Record<ReportType, string> = {
  daily: 'daily work report',
  weekly: 'weekly work report',
  project: 'project progress report',
};

export function buildReportSystemPrompt(type: ReportType): string {
  return `You write concise, evidence-grounded ${TYPE_LABELS[type]}s for a software engineer.
Write in Traditional Chinese. Use Markdown and these headings exactly:
## 完成事項
## 進行中
## 風險與待確認
## 下一步

Only state facts supported by the supplied session evidence. Do not invent status, dates, people, or outcomes.
When evidence is missing or ambiguous, place it under「風險與待確認」and say「待確認」.
Combine duplicated evidence into one clear item. Keep implementation details useful but concise.
Do not mention Code Insights, AI sessions, prompts, or the evidence formatting.`;
}

export function buildReportContext(input: {
  type: ReportType;
  dateFrom?: string;
  dateTo?: string;
  instructions?: string;
  sources: ReportSource[];
}): string {
  const period = [input.dateFrom, input.dateTo].filter(Boolean).join(' to ') || 'all available dates';
  const instruction = input.instructions ? `\nAdditional request: ${input.instructions}` : '';
  const sourceText = input.sources.map((source, index) => {
    const insights = source.insights.length
      ? source.insights.map((item) => `- [${item.type}] ${item.title}: ${item.summary}`).join('\n')
      : '- No generated insights for this session.';
    return `[SOURCE ${index + 1} | sessionId=${source.sessionId}]
Project: ${source.projectName}
Title: ${source.title}
Started: ${source.startedAt}
Session summary: ${source.summary || 'Not available'}
Insights:
${insights}`;
  }).join('\n\n---\n\n');

  return `Generate a ${TYPE_LABELS[input.type]} for ${period}.${instruction}

Evidence (${input.sources.length} sessions):
${sourceText}`;
}
