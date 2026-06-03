import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAlcoholLog } from '../services/alcohol-log.api';
import type { CreateAlcoholLogInput } from '../types/alcohol-log.types';

export function useUpdateAlcoholLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAlcoholLogInput }) =>
      updateAlcoholLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alcohol-logs'] });
    },
  });
}
