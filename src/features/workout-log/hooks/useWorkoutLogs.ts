import { useQuery } from '@tanstack/react-query';
import { getWorkoutLogs } from '../services/workout-log.api';

export function useWorkoutLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  workout_type?: string;
}) {
  return useQuery({
    queryKey: ['workout-logs', params],
    queryFn: () => getWorkoutLogs(params),
  });
}
