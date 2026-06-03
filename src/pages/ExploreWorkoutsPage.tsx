import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Dumbbell } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const WORKOUT_TYPES = ['All', 'GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_FULL', 'RUN', 'SPORT'] as const;
const DIFFICULTIES = ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
type WorkoutType = (typeof WORKOUT_TYPES)[number];
type Difficulty = (typeof DIFFICULTIES)[number];

interface Routine {
  id: string;
  title: string;
  description: string | null;
  workout_type: string;
  exercises: { name: string; sets?: number; reps?: number }[];
  youtube_url: string | null;
  difficulty: string;
  is_public: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  GYM_PUSH: 'Push', GYM_PULL: 'Pull', GYM_LEGS: 'Legs',
  GYM_UPPER: 'Upper', GYM_LOWER: 'Lower', GYM_FULL: 'Full Body',
  RUN: 'Run', WALK: 'Walk', SPORT: 'Sport', OTHER: 'Other',
};

const DIFF_COLORS: Record<string, string> = {
  BEGINNER: 'bg-food/20 text-food',
  INTERMEDIATE: 'bg-workout/20 text-workout',
  ADVANCED: 'bg-destructive/20 text-destructive',
};

export function ExploreWorkoutsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<WorkoutType>('All');
  const [difficulty, setDifficulty] = useState<Difficulty>('All');

  const { data: routines = [], isLoading, error } = useQuery({
    queryKey: ['workout-routines', 'public'],
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await supabase
        .from('workout_routines')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routines.filter((r) => {
      if (type !== 'All' && r.workout_type !== type) return false;
      if (difficulty !== 'All' && r.difficulty !== difficulty) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [routines, search, type, difficulty]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5" />
        <h2 className="text-xl font-bold">Workout Routines</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search routines..."
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {WORKOUT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              type === t
                ? 'bg-secondary border-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            }`}
          >
            {t === 'All' ? 'All' : TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`shrink-0 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
              difficulty === d
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load routines: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {routines.length === 0
              ? 'No routines published yet. An admin can add them from the Admin Panel.'
              : 'No routines match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((routine) => (
            <article
              key={routine.id}
              className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
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
                {routine.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{routine.description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <span className="rounded bg-workout/10 px-2 py-0.5 text-xs text-workout">
                    {TYPE_LABELS[routine.workout_type]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(routine.exercises ?? []).length} exercises
                  </span>
                </div>
                {routine.youtube_url && (
                  <a
                    href={routine.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-mental hover:underline inline-flex items-center gap-1"
                  >
                    ▶ Watch video
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
