import { useQuery } from '@tanstack/react-query';
import { getPlans } from '../services/plan.api';

export function usePlans(params?: { page?: number; limit?: number; is_template?: boolean }) {
  return useQuery({
    queryKey: ['plans', params],
    queryFn: () => getPlans(params),
  });
}
