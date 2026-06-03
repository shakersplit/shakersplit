import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAlcoholLog } from '../services/alcohol-log.api';

export function useDeleteAlcoholLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAlcoholLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alcohol-logs'] });
    },
  });
}
