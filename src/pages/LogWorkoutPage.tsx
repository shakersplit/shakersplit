import { WorkoutLogForm, WorkoutLogList } from '@/features/workout-log';
import { Dumbbell } from 'lucide-react';

export function LogWorkoutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5 text-workout" />
        <h2 className="text-xl font-bold">Log Workout</h2>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        <WorkoutLogForm />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent Workouts</h3>
        <WorkoutLogList />
      </div>
    </div>
  );
}
