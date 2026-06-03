import { Search, Dumbbell } from 'lucide-react';

const WORKOUT_TYPES = ['All', 'GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_FULL', 'RUN', 'SPORT'];
const DIFFICULTIES = ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const SAMPLE_ROUTINES = [
  {
    id: '1',
    title: 'Push Day A',
    workout_type: 'GYM_PUSH',
    difficulty: 'INTERMEDIATE',
    description: 'Chest, shoulders, triceps — classic PPL push session.',
    exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Pushdown'],
  },
  {
    id: '2',
    title: 'Pull Day A',
    workout_type: 'GYM_PULL',
    difficulty: 'INTERMEDIATE',
    description: 'Back and biceps focused pulling session.',
    exercises: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Face Pulls'],
  },
  {
    id: '3',
    title: '5K Easy Run',
    workout_type: 'RUN',
    difficulty: 'BEGINNER',
    description: 'Zone 2 cardio at a comfortable conversational pace.',
    exercises: ['5km at 6:00/km pace'],
  },
];

const TYPE_LABELS: Record<string, string> = {
  GYM_PUSH: 'Push',
  GYM_PULL: 'Pull',
  GYM_LEGS: 'Legs',
  GYM_UPPER: 'Upper',
  GYM_LOWER: 'Lower',
  GYM_FULL: 'Full Body',
  RUN: 'Run',
  WALK: 'Walk',
  SPORT: 'Sport',
  OTHER: 'Other',
};

const DIFF_COLORS: Record<string, string> = {
  BEGINNER: 'bg-food/20 text-food',
  INTERMEDIATE: 'bg-workout/20 text-workout',
  ADVANCED: 'bg-destructive/20 text-destructive',
};

export function ExploreWorkoutsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5" />
        <h2 className="text-xl font-bold">Workout Routines</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search routines..."
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {WORKOUT_TYPES.map((t) => (
          <button
            key={t}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors first:bg-secondary first:text-foreground"
          >
            {t === 'All' ? 'All' : TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className="shrink-0 rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            {d}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_ROUTINES.map((routine) => (
          <div
            key={routine.id}
            className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
          >
            <div className="h-24 bg-gradient-to-br from-workout/20 to-workout/5 flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-workout/40" />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm">{routine.title}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${DIFF_COLORS[routine.difficulty]}`}>
                  {routine.difficulty.toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{routine.description}</p>
              <div className="flex gap-2 flex-wrap">
                <span className="rounded bg-workout/10 px-2 py-0.5 text-xs text-workout">
                  {TYPE_LABELS[routine.workout_type]}
                </span>
                <span className="text-xs text-muted-foreground">{routine.exercises.length} exercises</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        More routines coming soon. Admins can add routines via the API.
      </p>
    </div>
  );
}
