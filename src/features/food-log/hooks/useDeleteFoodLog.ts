import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFoodLog } from '../services/food-log.api';

export function useDeleteFoodLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFoodLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs'] });
    },
  });
}
