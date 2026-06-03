import { useAuth } from '@/hooks/useAuth';
import { getGreeting } from '@/lib/utils';
import { UtensilsCrossed, Dumbbell, Wine, Flame, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">
          {getGreeting()}, {displayName} 👋
        </h2>
        <p className="text-muted-foreground">Here&apos;s your today&apos;s snapshot</p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
        <Flame className="h-5 w-5 text-orange-500" />
        <span className="text-sm font-medium">0 day streak</span>
        <span className="text-xs text-muted-foreground">— Start logging to build your streak!</span>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Food"
          value="0 meals"
          subtitle="0 cal today"
          icon={<UtensilsCrossed className="h-5 w-5" />}
          color="border-l-food"
          to="/app/log/food"
        />
        <SummaryCard
          title="Workout"
          value="No workout"
          subtitle="Log your session"
          icon={<Dumbbell className="h-5 w-5" />}
          color="border-l-workout"
          to="/app/log/workout"
        />
        <SummaryCard
          title="Alcohol"
          value="0 drinks"
          subtitle="Alcohol-free day ✓"
          icon={<Wine className="h-5 w-5" />}
          color="border-l-alcohol"
          to="/app/log/alcohol"
        />
      </div>

      {/* Weekly Progress */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">This Week</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </div>
          <div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Meals Logged</p>
          </div>
          <div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Alcohol-Free Days</p>
          </div>
        </div>
      </div>

      {/* Quick Add FAB */}
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

function QuickAddFAB() {
  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
      <div className="group relative">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95">
          <span className="text-2xl">+</span>
        </button>
        {/* Expandable menu - hidden for now, will be interactive in Phase 1 refinement */}
      </div>
    </div>
  );
}
