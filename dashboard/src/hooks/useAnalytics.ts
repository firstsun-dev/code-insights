import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, fetchDailyStats, fetchCacheBySource } from '@/lib/api';
import type { CacheBySourceRow } from '@/lib/types';

type Range = '7d' | '30d' | '90d' | 'all';

export function useDashboardStats(range: Range = '7d', homeId?: string) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', range, homeId],
    queryFn: () => fetchDashboardStats(range, homeId).then((r) => r.stats),
    refetchInterval: 60_000,
  });
}

export function useDailyStats(range: Range = '7d', homeId?: string) {
  return useQuery({
    queryKey: ['analytics', 'daily', range, homeId],
    queryFn: () => fetchDailyStats(range, homeId).then((r) => r.daily),
    refetchInterval: 60_000,
  });
}

export function useCacheBySource(range: Range = '7d', homeId?: string, source?: string) {
  return useQuery<{ rows: CacheBySourceRow[] }>({
    queryKey: ['analytics', 'cache-by-source', range, homeId, source],
    queryFn: () => fetchCacheBySource(range, homeId, source),
    refetchInterval: 60_000,
  });
}
