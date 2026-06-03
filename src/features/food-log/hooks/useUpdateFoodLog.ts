import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateFoodLog } from '../services/food-log.api';
import type { CreateFoodLogInput } from '../types/food-log.types';

export function useUpdateFoodLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateFoodLogInput }) =>
      updateFoodLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs'] });
    },
  });
}
