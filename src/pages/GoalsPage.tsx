import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Trash2, Edit3, X, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

type GoalType =
  | 'WORKOUTS_PER_WEEK'
  | 'CALORIES_PER_DAY_MAX'
  | 'CALORIES_PER_DAY_MIN'
  | 'PROTEIN_PER_DAY_MIN'
  | 'ALCOHOL_FREE_DAYS_PER_WEEK'
  | 'WEIGHT_TARGET_KG'
  | 'MOOD_AVG_MIN';

type Period = 'DAY' | 'WEEK' | 'MONTH' | 'ONGOING';

interface Goal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  target_value: number;
  period: Period;
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardData {
  today: {
    food: { meals: number; calories: number };
    workout: { sessions: number; minutes: number };
    alcohol: { drinks: number; ml: number };
  };
  week: {
    food: { meals: number; calories: number };
    workout: { sessions: number; minutes: number };
    alcohol: { drinks: number; ml: number };
  };
  streaks: { food_log: number; workout: number; alcohol_free: number; overall: number };
  latest_weight: { weight_kg: number; body_fat_pct: number | null; logged_at: string } | null;
}

const GOAL_DEFS: Record<GoalType, {
  label: string;
  unit: string;
  defaultPeriod: Period;
  // Compare actual against target — 'min' = need to reach or exceed, 'max' = stay under, 'target' = match.
  comparison: 'min' | 'max' | 'target';
  defaultTarget: number;
}> = {
  WORKOUTS_PER_WEEK: { label: 'Workouts per week', unit: 'sessions', defaultPeriod: 'WEEK', comparison: 'min', defaultTarget: 4 },
  CALORIES_PER_DAY_MAX: { label: 'Daily calorie cap', unit: 'cal', defaultPeriod: 'DAY', comparison: 'max', defaultTarget: 2200 },
  CALORIES_PER_DAY_MIN: { label: 'Daily calorie minimum', unit: 'cal', defaultPeriod: 'DAY', comparison: 'min', defaultTarget: 1800 },
  PROTEIN_PER_DAY_MIN: { label: 'Daily protein minimum', unit: 'g', defaultPeriod: 'DAY', comparison: 'min', defaultTarget: 130 },
  ALCOHOL_FREE_DAYS_PER_WEEK: { label: 'Alcohol-free days per week', unit: 'days', defaultPeriod: 'WEEK', comparison: 'min', defaultTarget: 5 },
  WEIGHT_TARGET_KG: { label: 'Weight target', unit: 'kg', defaultPeriod: 'ONGOING', comparison: 'target', defaultTarget: 75 },
  MOOD_AVG_MIN: { label: 'Average mood (1-10)', unit: '/10', defaultPeriod: 'WEEK', comparison: 'min', defaultTarget: 7 },
};

/** Goals page — set targets, see actuals from the dashboard endpoint. */
export function GoalsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });

  // Pull dashboard data so we can compute actuals client-side.
  const { data: dashResp } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiClient<ApiResponse<DashboardData>>('/analytics', { params: { type: 'dashboard' } }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Goals</h2>
        </div>
        <button
          onClick={() => { setEditing(null); setCreating(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New goal
        </button>
      </div>

      {(creating || editing) && (
        <GoalForm
          goal={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No active goals yet.</p>
          <p className="text-xs text-muted-foreground">Set a goal to see progress on your dashboard.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              dashboard={dashResp?.data}
              onEdit={() => { setCreating(false); setEditing(g); }}
              onDelete={() => {
                if (window.confirm(`Delete goal "${displayLabel(g)}"?`)) remove.mutate(g.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function displayLabel(g: Goal): string {
  return g.label || GOAL_DEFS[g.goal_type].label;
}

function computeActual(g: Goal, dash: DashboardData | undefined): number | null {
  if (!dash) return null;
  switch (g.goal_type) {
    case 'WORKOUTS_PER_WEEK':
      return dash.week.workout.sessions;
    case 'CALORIES_PER_DAY_MAX':
    case 'CALORIES_PER_DAY_MIN':
      return Math.round(dash.today.food.calories);
    case 'PROTEIN_PER_DAY_MIN':
      // Dashboard doesn't return protein today; show null so the UI degrades gracefully.
      return null;
    case 'ALCOHOL_FREE_DAYS_PER_WEEK':
      // Best proxy: days in last 7 with no alcohol. We don't have that exact number; use streak.
      return Math.min(7, dash.streaks.alcohol_free);
    case 'WEIGHT_TARGET_KG':
      return dash.latest_weight ? dash.latest_weight.weight_kg : null;
    case 'MOOD_AVG_MIN':
      // Dashboard doesn't expose mood — null.
      return null;
    default:
      return null;
  }
}

function GoalCard({
  goal,
  dashboard,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  dashboard: DashboardData | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const def = GOAL_DEFS[goal.goal_type];
  const actual = computeActual(goal, dashboard);
  const target = Number(goal.target_value);

  // Progress bar: clamped 0..1 of actual / target. For "max" we invert so being under is good.
  let progress: number = 0;
  let onTrack = false;
  if (actual !== null) {
    if (def.comparison === 'min') {
      progress = Math.min(1, Math.max(0, actual / target));
      onTrack = actual >= target;
    } else if (def.comparison === 'max') {
      progress = Math.min(1, Math.max(0, actual / target));
      onTrack = actual <= target;
    } else {
      // target: distance from goal as % (closer = higher progress)
      const delta = Math.abs(actual - target);
      const tolerance = target * 0.05; // ±5% counts as "hit"
      progress = Math.min(1, 1 - delta / Math.max(target, 1));
      onTrack = delta <= tolerance;
    }
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{displayLabel(goal)}</p>
            {onTrack && actual !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-food/15 px-2 py-0.5 text-xs font-medium text-food">
                <CheckCircle2 className="h-3 w-3" /> On track
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target {def.comparison === 'max' ? '≤ ' : def.comparison === 'min' ? '≥ ' : ''}
            {target} {def.unit} · {goal.period.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} aria-label="Edit"
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} aria-label="Delete"
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">
            Current: {actual === null ? '—' : `${actual} ${def.unit}`}
          </span>
          <span className="text-muted-foreground">
            {actual !== null ? `${Math.round(progress * 100)}%` : 'No data yet'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full transition-all ${
              onTrack ? 'bg-food' : actual === null ? 'bg-muted-foreground/30' : 'bg-workout'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {actual !== null && def.comparison !== 'target' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {def.comparison === 'min' ? (
              actual >= target ? <TrendingUp className="h-3 w-3 text-food" /> : <TrendingDown className="h-3 w-3 text-workout" />
            ) : (
              actual <= target ? <TrendingDown className="h-3 w-3 text-food" /> : <TrendingUp className="h-3 w-3 text-workout" />
            )}
            {actual >= target && def.comparison === 'min'
              ? `${actual - target} ${def.unit} ahead`
              : actual <= target && def.comparison === 'max'
              ? `${target - actual} ${def.unit} under`
              : def.comparison === 'min'
              ? `${target - actual} ${def.unit} to go`
              : `${actual - target} ${def.unit} over`}
          </p>
        )}
      </div>
    </li>
  );
}

function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<GoalType>(goal?.goal_type ?? 'WORKOUTS_PER_WEEK');
  const [target, setTarget] = useState(goal?.target_value.toString() ?? '');
  const [period, setPeriod] = useState<Period>(goal?.period ?? 'WEEK');
  const [label, setLabel] = useState(goal?.label ?? '');
  const [error, setError] = useState('');

  const def = GOAL_DEFS[type];

  const save = useMutation({
    mutationFn: async () => {
      const targetValue = Number(target || def.defaultTarget);
      const payload = {
        goal_type: type,
        target_value: targetValue,
        period,
        label: label.trim() || null,
        is_active: true,
      };
      if (goal) {
        const { error } = await supabase.from('user_goals').update(payload).eq('id', goal.id);
        if (error) throw error;
      } else {
        // user_id is set automatically via RLS — supabase-js fills auth.uid() in insert
        // when WITH CHECK uses it. To make it explicit and reliable, fetch session.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in.');
        const { error } = await supabase.from('user_goals').insert({ ...payload, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="rounded-lg border border-primary/30 bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{goal ? 'Edit goal' : 'New goal'}</h4>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal type</label>
        <select
          value={type}
          onChange={(e) => {
            const t = e.target.value as GoalType;
            setType(t);
            // Auto-set sensible default target + period when type changes (unless user already typed).
            if (!target) setTarget(GOAL_DEFS[t].defaultTarget.toString());
            setPeriod(GOAL_DEFS[t].defaultPeriod);
          }}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Object.entries(GOAL_DEFS).map(([key, d]) => (
            <option key={key} value={key}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Target ({def.unit})
          </label>
          <input
            type="number"
            step="0.1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={def.defaultTarget.toString()}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="DAY">Daily</option>
            <option value="WEEK">Weekly</option>
            <option value="MONTH">Monthly</option>
            <option value="ONGOING">Ongoing</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Custom label <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={def.label}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : goal ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
