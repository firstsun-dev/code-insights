import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BulkAnalyzeButton } from './BulkAnalyzeButton';
import type { Session } from '@/lib/types';

vi.mock('@/lib/api', () => ({
  analyzeSession: vi.fn(),
}));

vi.mock('@/hooks/useConfig', () => ({
  useLlmConfig: vi.fn(),
}));

import { analyzeSession } from '@/lib/api';
import { useLlmConfig } from '@/hooks/useConfig';

const mockAnalyzeSession = vi.mocked(analyzeSession);
const mockUseLlmConfig = vi.mocked(useLlmConfig);

function makeSession(id: string): Session {
  return {
    id,
    project_id: 'proj-1',
    project_name: 'Test Project',
    project_path: '/test',
    git_remote_url: null,
    summary: null,
    custom_title: null,
    generated_title: 'Test Session',
    title_source: 'fallback',
    session_character: null,
    started_at: '2026-01-01T00:00:00Z',
    ended_at: '2026-01-01T01:00:00Z',
    message_count: 10,
    user_message_count: 5,
    assistant_message_count: 5,
    tool_call_count: 2,
    git_branch: null,
    claude_version: null,
    source_tool: 'claude-code',
    device_id: null,
    device_hostname: null,
    device_platform: null,
    synced_at: '2026-01-01T01:00:00Z',
    total_input_tokens: null,
    total_output_tokens: null,
    cache_creation_tokens: null,
    cache_read_tokens: null,
    estimated_cost_usd: null,
  };
}

function setup(sessions: Session[], onComplete?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <BulkAnalyzeButton sessions={sessions} onComplete={onComplete} />
    </QueryClientProvider>
  );
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: LLM configured
  mockUseLlmConfig.mockReturnValue({
    data: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  } as ReturnType<typeof useLlmConfig>);
});

describe('BulkAnalyzeButton', () => {
  describe('unconfigured state', () => {
    it('renders disabled button with configure message when LLM not configured', () => {
      mockUseLlmConfig.mockReturnValue({ data: null } as ReturnType<typeof useLlmConfig>);
      setup([makeSession('s1')]);
      const btn = screen.getByRole('button', { name: /analyze selected/i });
      expect(btn).toBeDisabled();
      expect(screen.getByText(/configure ai first/i)).toBeInTheDocument();
    });
  });

  describe('trigger button', () => {
    it('is disabled when sessions array is empty', () => {
      setup([]);
      const btn = screen.getByRole('button', { name: /analyze 0 sessions/i });
      expect(btn).toBeDisabled();
    });

    it('shows singular label for 1 session', () => {
      setup([makeSession('s1')]);
      expect(screen.getByRole('button', { name: /analyze 1 session$/i })).toBeInTheDocument();
    });

    it('shows plural label for multiple sessions', () => {
      setup([makeSession('s1'), makeSession('s2'), makeSession('s3')]);
      expect(screen.getByRole('button', { name: /analyze 3 sessions/i })).toBeInTheDocument();
    });
  });

  describe('dialog open/close behavior', () => {
    it('opens dialog when trigger button is clicked', async () => {
      setup([makeSession('s1')]);
      await userEvent.click(screen.getByRole('button', { name: /analyze 1 session/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Bulk Analysis')).toBeInTheDocument();
    });

    it('does not close dialog when Escape pressed while analyzing (regression #293)', async () => {
      // analyzeSession never resolves — keeps component in analyzing=true state
      mockAnalyzeSession.mockReturnValue(new Promise(() => {}));

      setup([makeSession('s1')]);
      await userEvent.click(screen.getByRole('button', { name: /analyze 1 session/i }));
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

      // Wait until analyzing state is active
      await waitFor(() => {
        expect(screen.getByText(/analyzing session/i)).toBeInTheDocument();
      });

      // Fire Escape — dialog must stay open
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });

      // Dialog should still be present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('can be closed after analysis completes', async () => {
      mockAnalyzeSession.mockResolvedValue({ success: true });

      setup([makeSession('s1')]);
      await userEvent.click(screen.getByRole('button', { name: /analyze 1 session/i }));
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /done/i }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('resets progress and result state when dialog is closed and reopened', async () => {
      mockAnalyzeSession.mockResolvedValue({ success: true });

      setup([makeSession('s1')]);
      // First open: run analysis to completion
      await userEvent.click(screen.getByRole('button', { name: /analyze 1 session/i }));
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /done/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      // Second open: should show fresh "Start Analysis" prompt, not stale result
      await userEvent.click(screen.getByRole('button', { name: /analyze 1 session/i }));
      expect(screen.getByRole('button', { name: /start analysis/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /done/i })).not.toBeInTheDocument();
    });
  });

  describe('analysis execution', () => {
    it('calls analyzeSession for each session and shows success result', async () => {
      mockAnalyzeSession.mockResolvedValue({ success: true });
      const onComplete = vi.fn();

      setup([makeSession('s1'), makeSession('s2')], onComplete);
      await userEvent.click(screen.getByRole('button', { name: /analyze 2 sessions/i }));
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

      await waitFor(() => expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument());

      expect(mockAnalyzeSession).toHaveBeenCalledTimes(2);
      expect(mockAnalyzeSession).toHaveBeenCalledWith('s1');
      expect(mockAnalyzeSession).toHaveBeenCalledWith('s2');
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('shows failed count when some sessions error', async () => {
      mockAnalyzeSession
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('API timeout'));

      setup([makeSession('s1'), makeSession('s2')]);
      await userEvent.click(screen.getByRole('button', { name: /analyze 2 sessions/i }));
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

      await waitFor(() => expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument());

      expect(screen.getByText(/1 session.*analyzed successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
      expect(screen.getByText(/api timeout/i)).toBeInTheDocument();
    });
  });

  // UI rendering and interaction tests authored by ux-agent
});
