import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlanEntry } from '../services/plan.api';
import type { CreatePlanEntryInput } from '../types/plan.types';

export function useCreatePlanEntry(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanEntryInput) => createPlanEntry(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
    },
  });
}
