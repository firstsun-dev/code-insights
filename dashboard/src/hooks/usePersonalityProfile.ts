import { useQuery } from '@tanstack/react-query';
import { fetchPersonalityProfile } from '@/lib/api';
import type { PersonalityProfile } from '@/lib/types';

export function usePersonalityProfile(params?: { period?: string; projectId?: string }) {
  return useQuery<PersonalityProfile>({
    queryKey: ['personality', 'profile', params?.period, params?.projectId],
    queryFn: () => fetchPersonalityProfile(params),
    staleTime: 30_000,
  });
}
