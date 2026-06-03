import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkoutLog } from '../services/workout-log.api';

export function useDeleteWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkoutLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
    },
  });
}
