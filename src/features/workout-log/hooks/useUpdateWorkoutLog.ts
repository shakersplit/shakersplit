import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWorkoutLog } from '../services/workout-log.api';
import type { CreateWorkoutLogInput } from '../types/workout-log.types';

export function useUpdateWorkoutLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateWorkoutLogInput }) =>
      updateWorkoutLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
    },
  });
}
