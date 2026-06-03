import { useAlcoholLogs } from '../hooks/useAlcoholLogs';
import { useDeleteAlcoholLog } from '../hooks/useDeleteAlcoholLog';
import { AlcoholLogCard } from './AlcoholLogCard';

export function AlcoholLogList() {
  const { data, isLoading, error } = useAlcoholLogs();
  const deleteMutation = useDeleteAlcoholLog();

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
        Failed to load alcohol logs.
      </div>
    );
  }

  const logs = data?.data ?? [];

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No alcohol logs yet</p>
        <p className="text-sm text-muted-foreground">Track your drinking to stay mindful</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <AlcoholLogCard key={log.id} log={log} onDelete={(id) => deleteMutation.mutate(id)} />
      ))}
    </div>
  );
}
