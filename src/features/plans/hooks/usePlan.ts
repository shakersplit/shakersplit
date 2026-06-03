import { useQuery } from '@tanstack/react-query';
import { getPlan } from '../services/plan.api';

export function usePlan(planId: string | null) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: () => getPlan(planId!),
    enabled: !!planId,
  });
}
