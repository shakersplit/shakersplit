import { useQuery } from '@tanstack/react-query';
import { getFoodLogs } from '../services/food-log.api';

export function useFoodLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  meal_type?: string;
}) {
  return useQuery({
    queryKey: ['food-logs', params],
    queryFn: () => getFoodLogs(params),
  });
}
