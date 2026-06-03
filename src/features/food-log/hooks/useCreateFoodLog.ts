import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFoodLog } from '../services/food-log.api';
import type { CreateFoodLogInput } from '../types/food-log.types';

export function useCreateFoodLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFoodLogInput) => createFoodLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs'] });
    },
  });
}
