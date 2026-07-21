import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePersonalityProfile, usePersonalityWeeks } from '@/hooks/usePersonalityProfile';
import { usePersonalityTrend } from '@/hooks/usePersonalityTrend';
import { personalityGenerateStream } from '@/lib/api';
import { parseSSEStream } from '@/lib/sse';
import { getCurrentIsoWeek } from '@/lib/date-utils';
import { PersonalityRadarChart } from '@/components/personality/PersonalityRadarChart';
import { ExplorerExecutorGauge, PaceGauge } from '@/components/personality/PersonalityGauges';
import { ArchetypeCard } from '@/components/personality/ArchetypeCard';
import { PersonalityTrendChart } from '@/components/personality/PersonalityTrendChart';
import { ProjectPersonalitySwitcher } from '@/components/personality/ProjectPersonalitySwitcher';
import { WeekSelector } from '@/components/patterns/WeekSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorCard } from '@/components/ErrorCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import type { PersonalityProfile } from '@/lib/types';

export default function PersonalityPage() {
  const [projectId, setProjectId] = useState<string>('__all__');
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  // Persists independently of `generating` — an SSE `error` event (or a thrown fetch
  // error) must stay visible to the user after the stream closes and `generating`
  // flips back to false in the `finally` block below. Only cleared on retry or scope
  // change, never implicitly by the generation lifecycle itself.
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [localProfile, setLocalProfile] = useState<PersonalityProfile | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState<string>(() => getCurrentIsoWeek());

  const { data: profileData, isLoading, isError, refetch } = usePersonalityProfile({
    period: currentWeek,
    projectId,
  });

  const { data: trendData } = usePersonalityTrend({ projectId, weeks: 12 });

  const { data: weeksData } = usePersonalityWeeks({
    project: projectId === '__all__' ? undefined : projectId,
  });
  const weeks = weeksData?.weeks ?? [];

  // Abort in-flight generation on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Reset local (freshly-generated) profile and any stale error whenever the scope
  // (project or week) changes so we fall back to the fetched profile for the new
  // scope instead of showing stale data or an error from a different project/period.
  useEffect(() => {
    setLocalProfile(null);
    setGenerationError(null);
  }, [projectId, currentWeek]);

  const handleWeekChange = useCallback((week: string) => {
    setCurrentWeek(week);
  }, []);

  const handleGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setGenerationProgress('Starting...');
    setGenerationError(null); // clear any previous error on retry

    try {
      const response = await personalityGenerateStream(
        { period: currentWeek, project: projectId === '__all__' ? undefined : projectId },
        controller.signal
      );
      if (!response.body) throw new Error('No response body');

      for await (const event of parseSSEStream(response.body)) {
        if (event.event === 'progress') {
          try {
            const data = JSON.parse(event.data) as { message?: string };
            setGenerationProgress(data.message || 'Processing...');
          } catch { /* skip malformed event */ }
        } else if (event.event === 'complete') {
          try {
            const data = JSON.parse(event.data) as { profile?: PersonalityProfile };
            if (data.profile) setLocalProfile(data.profile);
            queryClient.invalidateQueries({ queryKey: ['personality'] });
          } catch { /* skip malformed event */ }
        } else if (event.event === 'error') {
          try {
            const data = JSON.parse(event.data) as { error?: string };
            setGenerationError(data.error ?? 'Unknown error');
          } catch {
            setGenerationError('Generation failed with an unreadable error response.');
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [currentWeek, projectId, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 lg:p-6">
        <ErrorCard message="Failed to load personality profile" onRetry={refetch} />
      </div>
    );
  }

  const profile = localProfile ?? profileData ?? null;
  const hasEnoughSessions = (profile?.sessionCount ?? 0) > 0;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personality</h1>
          <p className="text-sm text-muted-foreground">
            A deterministic trait profile plus an optional LLM-written narrative
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WeekSelector currentWeek={currentWeek} weeks={weeks} onWeekChange={handleWeekChange} />
          <ProjectPersonalitySwitcher value={projectId} onChange={setProjectId} period={currentWeek} />
        </div>
      </div>

      {!hasEnoughSessions && (
        <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">No analyzed sessions this week</p>
            <p className="text-xs text-muted-foreground mt-1">
              Analyze sessions to extract facets — the personality profile is derived from them.
            </p>
          </div>
        </div>
      )}

      {generating && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{generationProgress}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persists after the SSE stream closes (generating -> false) so the user can
          actually read what went wrong, instead of the message vanishing on the same
          tick the "generating" spinner disappears. */}
      {!generating && generationError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      {profile && (
        <>
          <ArchetypeCard archetype={profile.archetype} generating={generating} onGenerate={handleGenerate} />

          <div className="grid gap-4 lg:grid-cols-2">
            <PersonalityRadarChart traits={profile.traits} />
            <div className="space-y-4">
              <ExplorerExecutorGauge axis={profile.axis} />
              <PaceGauge pace={profile.pace} />
            </div>
          </div>

          {trendData && trendData.rows.length > 0 && (
            <PersonalityTrendChart rows={trendData.rows} />
          )}
        </>
      )}
    </div>
  );
}
