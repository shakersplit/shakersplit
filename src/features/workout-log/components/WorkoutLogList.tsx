import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { useDeleteWorkoutLog } from '../hooks/useDeleteWorkoutLog';
import { WorkoutLogCard } from './WorkoutLogCard';

export function WorkoutLogList() {
  const { data, isLoading, error } = useWorkoutLogs();
  const deleteMutation = useDeleteWorkoutLog();

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
        Failed to load workout logs.
      </div>
    );
  }

  const logs = data?.data ?? [];

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No workouts logged yet</p>
        <p className="text-sm text-muted-foreground">Log your first workout above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <WorkoutLogCard
          key={log.id}
          log={log}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      ))}
    </div>
  );
}
