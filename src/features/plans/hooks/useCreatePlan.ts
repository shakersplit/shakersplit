import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan } from '../services/plan.api';
import type { CreatePlanInput } from '../types/plan.types';

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanInput) => createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
