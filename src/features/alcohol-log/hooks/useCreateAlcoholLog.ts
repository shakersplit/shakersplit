import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAlcoholLog } from '../services/alcohol-log.api';
import type { CreateAlcoholLogInput } from '../types/alcohol-log.types';

export function useCreateAlcoholLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAlcoholLogInput) => createAlcoholLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alcohol-logs'] });
    },
  });
}
