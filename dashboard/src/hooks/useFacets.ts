import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMissingFacetSessionIds, backfillFacets, fetchFacetAggregation } from '@/lib/api';

export function useMissingFacets(params?: {
  project?: string;
  period?: string;
  source?: string;
}) {
  return useQuery({
    queryKey: ['facets', 'missing', params?.project, params?.period, params?.source],
    queryFn: () => fetchMissingFacetSessionIds(params),
    staleTime: 30_000,
  });
}

// Distinct source_tool values actually present in the DB — drives the source-tool
// multi-select filter so it never shows tools with zero sessions, and automatically
// picks up new tools without a code change. Long staleTime since this rarely
// changes within a session (new sessions from a brand-new tool are rare).
export function useAvailableSourceTools() {
  return useQuery({
    queryKey: ['facets', 'aggregated', 'sourceTools'],
    queryFn: () => fetchFacetAggregation({ period: 'all' }).then((r) => r.sourceTools),
    staleTime: 5 * 60_000,
  });
}

export function useBackfillFacets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionIds: string[]) => backfillFacets(sessionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facets'] });
    },
  });
}
