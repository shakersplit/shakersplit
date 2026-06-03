import type { WorkoutLog } from '../types/workout-log.types';
import { formatDate, formatTime } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface WorkoutLogCardProps {
  log: WorkoutLog;
  onDelete?: (id: string) => void;
}

export function WorkoutLogCard({ log, onDelete }: WorkoutLogCardProps) {
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-workout bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block rounded bg-workout/20 px-2 py-0.5 text-xs font-medium text-workout">
            {log.workout_type.replace(/_/g, ' ')}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(log.logged_at)} at {formatTime(log.logged_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{log.duration_minutes} min</span>
          {onDelete && (
            <button
              onClick={() => onDelete(log.id)}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ul className="mt-2 space-y-1">
        {log.exercises.map((ex, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{ex.name}</span>
            {ex.sets && ex.reps && (
              <span className="text-muted-foreground">
                {' '}— {ex.sets}×{ex.reps}
                {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
              </span>
            )}
            {ex.distance_km && (
              <span className="text-muted-foreground"> — {ex.distance_km} km</span>
            )}
          </li>
        ))}
      </ul>

      {log.notes && <p className="mt-2 text-xs italic text-muted-foreground">{log.notes}</p>}
    </div>
  );
}
