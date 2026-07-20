import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHomes, addHome, removeHome, setHomeEnabled } from '@/lib/api';

export function useHomes() {
  return useQuery({
    queryKey: ['homes'],
    queryFn: () => fetchHomes().then((r) => r.homes),
    refetchInterval: 60_000,
  });
}

export function useAddHomeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { path: string; label?: string }) => addHome(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] });
    },
  });
}

export function useRemoveHomeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeHome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] });
    },
  });
}

export function useSetHomeEnabledMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setHomeEnabled(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] });
    },
  });
}
