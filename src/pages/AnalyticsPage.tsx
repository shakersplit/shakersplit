import { BarChart3 } from 'lucide-react';

export function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h2 className="text-xl font-bold">Analytics</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Workouts" value="0" subtitle="this week" />
        <StatCard title="Meals Logged" value="0" subtitle="this week" />
        <StatCard title="Alcohol-Free Days" value="0" subtitle="this week" />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
          Charts Coming in Phase 2
        </h3>
        <div className="space-y-3">
          {['Calories over time', 'Workout frequency', 'Alcohol consumption trend', 'Weight progress'].map(
            (label) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary/40" />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3">Streaks</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Food Log', type: 'food', days: 0 },
            { label: 'Workout', type: 'workout', days: 0 },
            { label: 'Alcohol-Free', type: 'alcohol', days: 0 },
            { label: 'Overall', type: 'overall', days: 0 },
          ].map(({ label, days }) => (
            <div key={label} className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-2xl font-bold">{days}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
              <p className="text-xs text-muted-foreground">day streak</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
