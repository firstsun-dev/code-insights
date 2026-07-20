import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, fetchDailyStats } from '@/lib/api';

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
