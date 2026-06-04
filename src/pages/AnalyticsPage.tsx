import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, UtensilsCrossed, Dumbbell, Wine, Scale, Flame } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

interface DashboardData {
  today: { food: { meals: number; calories: number }; workout: { sessions: number; minutes: number }; alcohol: { drinks: number; ml: number } };
  week: { food: { meals: number; calories: number }; workout: { sessions: number; minutes: number }; alcohol: { drinks: number; ml: number } };
  streaks: { food_log: number; workout: number; alcohol_free: number; overall: number };
  latest_weight: { weight_kg: number; body_fat_pct: number | null; logged_at: string } | null;
}

interface TrendDay {
  date: string;
  food_meals: number;
  food_calories: number;
  workout_minutes: number;
  alcohol_drinks: number;
  weight_kg: number | null;
}

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);

  const { data: dashResp } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiClient<ApiResponse<DashboardData>>('/analytics', { params: { type: 'dashboard' } }),
  });

  const { data: trendsResp, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'trends', days],
    queryFn: () => apiClient<ApiResponse<{ days: TrendDay[] }>>('/analytics', { params: { type: 'trends', days } }),
  });

  const dash = dashResp?.data;
  const trendDays = trendsResp?.data?.days ?? [];

  // Trim ISO date to "MMM D" for the X axis so labels don't crowd.
  const formattedTrends = trendDays.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  // Weight chart needs nulls dropped so the line connects across measurements.
  const weightSeries = formattedTrends.filter((d) => d.weight_kg !== null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-xl font-bold">Analytics</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                days === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats — pulled from dashboard endpoint, instant load */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Workouts (week)" value={dash?.week.workout.sessions} accent="text-workout" icon={<Dumbbell className="h-4 w-4" />} />
        <Stat label="Meals logged (week)" value={dash?.week.food.meals} accent="text-food" icon={<UtensilsCrossed className="h-4 w-4" />} />
        <Stat label="Drinks (week)" value={dash?.week.alcohol.drinks} accent="text-alcohol" icon={<Wine className="h-4 w-4" />} />
        <Stat label="Overall streak" value={dash?.streaks.overall} accent="text-orange-500" icon={<Flame className="h-4 w-4" />} suffix="days" />
      </div>

      {/* Calories over time */}
      <ChartCard title="Calories per day" subtitle={`Last ${days} days`} accent="text-food">
        {trendsLoading ? (
          <ChartSkeleton />
        ) : formattedTrends.length === 0 ? (
          <EmptyChart message="No data yet — log some meals to see trends." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="food_calories" stroke="#4caf50" strokeWidth={2} dot={false} name="Calories" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Workout minutes */}
      <ChartCard title="Workout minutes per day" subtitle={`Last ${days} days`} accent="text-workout">
        {trendsLoading ? (
          <ChartSkeleton />
        ) : formattedTrends.length === 0 ? (
          <EmptyChart message="No data yet — log a workout to see trends." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="workout_minutes" fill="#ff9800" radius={[4, 4, 0, 0]} name="Minutes" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Alcohol drinks per day */}
      <ChartCard title="Alcohol drinks per day" subtitle={`Last ${days} days`} accent="text-alcohol">
        {trendsLoading ? (
          <ChartSkeleton />
        ) : formattedTrends.length === 0 ? (
          <EmptyChart message="No data yet — log a drink to see trends." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="alcohol_drinks" fill="#9c27b0" radius={[4, 4, 0, 0]} name="Drinks" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Weight progress */}
      <ChartCard title="Weight progress" subtitle={`Last ${days} days · ${weightSeries.length} entries`} accent="text-mental">
        {trendsLoading ? (
          <ChartSkeleton />
        ) : weightSeries.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-8 justify-center">
            <Scale className="h-5 w-5" />
            No weight entries in this range yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weightSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="weight_kg" stroke="#2196f3" strokeWidth={2} dot={{ r: 3 }} name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Streaks */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-3">Streaks</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StreakBadge label="Food Log" days={dash?.streaks.food_log ?? 0} />
          <StreakBadge label="Workout" days={dash?.streaks.workout ?? 0} />
          <StreakBadge label="Alcohol-Free" days={dash?.streaks.alcohol_free ?? 0} />
          <StreakBadge label="Overall" days={dash?.streaks.overall ?? 0} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[240px] animate-pulse rounded-lg bg-secondary/30" />;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground py-8">
      {message}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon,
  suffix,
}: {
  label: string;
  value: number | undefined;
  accent: string;
  icon: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${accent}`}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">
        {value === undefined ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-secondary" /> : (value ?? 0).toLocaleString()}
        {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function StreakBadge({ label, days }: { label: string; days: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
      <p className="text-2xl font-bold">{days}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      <p className="text-xs text-muted-foreground">day streak</p>
    </div>
  );
}
