import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePlan } from '../services/plan.api';

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
