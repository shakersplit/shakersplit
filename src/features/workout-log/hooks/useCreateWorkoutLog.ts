import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkoutLog } from '../services/workout-log.api';
import type { CreateWorkoutLogInput } from '../types/workout-log.types';

export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkoutLogInput) => createWorkoutLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
    },
  });
}
