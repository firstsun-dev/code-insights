import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/lib/api';

type Range = '7d' | '30d' | '90d' | 'all';

export function useDashboardStats(range: Range = '7d', homeId?: string) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', range, homeId],
    queryFn: () => fetchDashboardStats(range, homeId).then((r) => r.stats),
    refetchInterval: 60_000,
  });
}
