import { useQuery } from '@tanstack/react-query';
import { fetchPersonalityTrend } from '@/lib/api';
import type { PersonalityTrendResponse } from '@/lib/types';

export function usePersonalityTrend(params?: { projectId?: string; weeks?: number }) {
  return useQuery<PersonalityTrendResponse>({
    queryKey: ['personality', 'trend', params?.projectId, params?.weeks],
    queryFn: () => fetchPersonalityTrend(params),
    staleTime: 60_000,
  });
}
