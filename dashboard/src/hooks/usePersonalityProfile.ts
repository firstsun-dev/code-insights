import { useQuery } from '@tanstack/react-query';
import { fetchPersonalityProfile, fetchPersonalityProjects, fetchPersonalityWeeks } from '@/lib/api';
import type { WeekInfo } from '@/lib/api';
import type { PersonalityProfile } from '@/lib/types';

export function usePersonalityProfile(params?: { period?: string; projectId?: string }) {
  return useQuery<PersonalityProfile>({
    queryKey: ['personality', 'profile', params?.period, params?.projectId],
    queryFn: () => fetchPersonalityProfile(params),
    staleTime: 30_000,
  });
}

export function usePersonalityProjects(params?: { period?: string }) {
  return useQuery<{ projects: Array<{ id: string; name: string }> }>({
    queryKey: ['personality', 'projects', params?.period],
    queryFn: () => fetchPersonalityProjects(params),
    staleTime: 30_000,
  });
}

export function usePersonalityWeeks(params?: { project?: string }) {
  return useQuery<{ weeks: WeekInfo[] }>({
    queryKey: ['personality', 'weeks', params?.project],
    queryFn: () => fetchPersonalityWeeks(params),
    staleTime: 60_000,
  });
}
