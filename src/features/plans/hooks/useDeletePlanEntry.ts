import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePlanEntry } from '../services/plan.api';

export function useDeletePlanEntry(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => deletePlanEntry(planId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
    },
  });
}
