import { useQuery } from '@tanstack/react-query';
import { fetchAnalyzedSessionIds } from '@/lib/api';

/**
 * Session IDs with a completed session analysis, sourced from analysis_usage
 * (one row per session) rather than the insights table — insights has no row
 * cap safe to rely on for "is this session analyzed" checks at scale, since a
 * single session can produce 5-10+ insight rows.
 */
export function useAnalyzedSessionIds() {
  return useQuery({
    queryKey: ['analyzedSessionIds'],
    queryFn: () => fetchAnalyzedSessionIds().then((r) => new Set(r.sessionIds)),
  });
}
