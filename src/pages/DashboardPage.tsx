import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getGreeting } from '@/lib/utils';
import {
  UtensilsCrossed,
  Dumbbell,
  Wine,
  Flame,
  TrendingUp,
  Plus,
  Scale,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

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
  streaks: {
    food_log: number;
    workout: number;
    alcohol_free: number;
    overall: number;
  };
  latest_weight: { weight_kg: number; body_fat_pct: number | null; logged_at: string } | null;
}

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiClient<ApiResponse<DashboardData>>('/analytics/dashboard'),
    refetchOnWindowFocus: true,
  });

  const dash = data?.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">
          {getGreeting()}, {displayName} 👋
        </h2>
        <p className="text-muted-foreground">Here&apos;s your snapshot</p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
        <Flame className="h-5 w-5 text-orange-500" />
        {isLoading ? (
          <span className="inline-block h-4 w-32 animate-pulse rounded bg-secondary" />
        ) : (dash?.streaks.overall ?? 0) > 0 ? (
          <>
            <span className="text-sm font-medium">{dash?.streaks.overall} day streak</span>
            <span className="text-xs text-muted-foreground">— keep it going!</span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">0 day streak</span>
            <span className="text-xs text-muted-foreground">— Start logging to build your streak!</span>
          </>
        )}
      </div>

      {/* Today's Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Food"
          value={isLoading ? '…' : `${dash?.today.food.meals ?? 0} meals`}
          subtitle={
            isLoading
              ? ''
              : (dash?.today.food.calories ?? 0) > 0
              ? `${Math.round(dash?.today.food.calories ?? 0)} cal today`
              : 'Log your first meal'
          }
          icon={<UtensilsCrossed className="h-5 w-5 text-food" />}
          color="border-l-food"
          to="/app/log/food"
        />
        <SummaryCard
          title="Workout"
          value={isLoading ? '…' : (dash?.today.workout.sessions ?? 0) > 0 ? `${dash?.today.workout.sessions} session${dash?.today.workout.sessions === 1 ? '' : 's'}` : 'No workout'}
          subtitle={
            isLoading
              ? ''
              : (dash?.today.workout.minutes ?? 0) > 0
              ? `${dash?.today.workout.minutes} min today`
              : 'Log your session'
          }
          icon={<Dumbbell className="h-5 w-5 text-workout" />}
          color="border-l-workout"
          to="/app/log/workout"
        />
        <SummaryCard
          title="Alcohol"
          value={isLoading ? '…' : `${dash?.today.alcohol.drinks ?? 0} drinks`}
          subtitle={
            isLoading
              ? ''
              : (dash?.today.alcohol.drinks ?? 0) === 0
              ? 'Alcohol-free day ✓'
              : `${Math.round(dash?.today.alcohol.ml ?? 0)} ml today`
          }
          icon={<Wine className="h-5 w-5 text-alcohol" />}
          color="border-l-alcohol"
          to="/app/log/alcohol"
        />
      </div>

      {/* Weight card — only shown if user has a weight entry, otherwise prompts them */}
      <Link
        to="/app/log/weight"
        className="flex items-center justify-between rounded-lg border border-border border-l-4 border-l-mental bg-card p-4 transition-colors hover:bg-secondary/50"
      >
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-mental" />
          <div>
            <p className="text-sm font-medium">Weight</p>
            {isLoading ? (
              <span className="inline-block h-3 w-24 animate-pulse rounded bg-secondary" />
            ) : dash?.latest_weight ? (
              <p className="text-xs text-muted-foreground">
                {dash.latest_weight.weight_kg} kg
                {dash.latest_weight.body_fat_pct !== null && ` · ${dash.latest_weight.body_fat_pct}% bf`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No entries yet — tap to log</p>
            )}
          </div>
        </div>
        <Plus className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Weekly Progress */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">This Week</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{isLoading ? '…' : dash?.week.workout.sessions ?? 0}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{isLoading ? '…' : dash?.week.food.meals ?? 0}</p>
            <p className="text-xs text-muted-foreground">Meals Logged</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{isLoading ? '…' : dash?.streaks.alcohol_free ?? 0}</p>
            <p className="text-xs text-muted-foreground">Alcohol-Free Days</p>
          </div>
        </div>
      </div>

      <QuickAddFAB />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
  to,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`rounded-lg border border-border border-l-4 ${color} bg-card p-4 transition-colors hover:bg-secondary/50`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </Link>
  );
}

/**
 * Floating action button — clicking it reveals the four log shortcuts in a vertical stack.
 * Closes when any shortcut is clicked or when the user clicks outside the button.
 */
function QuickAddFAB() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6 flex flex-col items-end gap-3">
      {open && (
        <>
          <FabAction to="/app/log/food" label="Food" icon={<UtensilsCrossed className="h-4 w-4" />} accent="bg-food" onClick={() => setOpen(false)} />
          <FabAction to="/app/log/workout" label="Workout" icon={<Dumbbell className="h-4 w-4" />} accent="bg-workout" onClick={() => setOpen(false)} />
          <FabAction to="/app/log/alcohol" label="Alcohol" icon={<Wine className="h-4 w-4" />} accent="bg-alcohol" onClick={() => setOpen(false)} />
          <FabAction to="/app/log/weight" label="Weight" icon={<Scale className="h-4 w-4" />} accent="bg-mental" onClick={() => setOpen(false)} />
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close quick add' : 'Quick add'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <span className="text-2xl">+</span>}
      </button>
    </div>
  );
}

function FabAction({
  to,
  label,
  icon,
  accent,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full ${accent} px-4 py-2 text-sm font-medium text-white shadow-lg`}
    >
      {icon}
      {label}
    </Link>
  );
}
