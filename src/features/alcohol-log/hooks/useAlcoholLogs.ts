import { useQuery } from '@tanstack/react-query';
import { getAlcoholLogs } from '../services/alcohol-log.api';

export function useAlcoholLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['alcohol-logs', params],
    queryFn: () => getAlcoholLogs(params),
  });
}
