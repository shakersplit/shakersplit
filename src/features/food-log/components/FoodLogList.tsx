import { useFoodLogs } from '../hooks/useFoodLogs';
import { useDeleteFoodLog } from '../hooks/useDeleteFoodLog';
import { FoodLogCard } from './FoodLogCard';

export function FoodLogList() {
  const { data, isLoading, error } = useFoodLogs();
  const deleteMutation = useDeleteFoodLog();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load food logs. Please try again.
      </div>
    );
  }

  const logs = data?.data ?? [];

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No food logs yet</p>
        <p className="text-sm text-muted-foreground">Use the form above to log your first meal!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <FoodLogCard key={log.id} log={log} onDelete={(id) => deleteMutation.mutate(id)} />
      ))}
    </div>
  );
}
