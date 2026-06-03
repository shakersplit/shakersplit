import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Scale, Plus, TrendingUp, TrendingDown, Trash2, Minus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import type { ApiResponse, PaginatedResponse } from '@/types';

interface WeightLog {
  id: string;
  logged_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  notes: string | null;
}

export function LogWeightPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: logsResp, isLoading } = useQuery({
    queryKey: ['weight-logs'],
    queryFn: () => apiClient<PaginatedResponse<WeightLog>>('/weight-logs', { params: { limit: 60 } }),
  });

  const create = useMutation({
    mutationFn: (body: { weight_kg: number; body_fat_pct?: number; notes?: string }) =>
      apiClient<ApiResponse<WeightLog>>('/weight-logs', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      setShowForm(false);
      setWeightKg('');
      setBodyFat('');
      setNotes('');
      setError('');
    },
    onError: (err: Error) => setError(err.message ?? 'Failed to save'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient('/weight-logs', { method: 'DELETE', params: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weight-logs'] }),
  });

  const logs = logsResp?.data ?? [];
  const latest = logs[0];
  const previous = logs[1];
  const delta = latest && previous ? latest.weight_kg - previous.weight_kg : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const w = parseFloat(weightKg);
    if (!w || w <= 0 || w > 500) {
      setError('Enter a valid weight in kg');
      return;
    }
    const bf = bodyFat ? parseFloat(bodyFat) : undefined;
    if (bf !== undefined && (bf < 0 || bf > 100)) {
      setError('Body fat must be 0–100%');
      return;
    }
    create.mutate({
      weight_kg: w,
      body_fat_pct: bf,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-mental" />
          <h2 className="text-xl font-bold">Weight Log</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Log weight'}
        </button>
      </div>

      {/* Latest weight summary */}
      {latest && (
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Latest</p>
          <div className="mt-1 flex items-baseline gap-3">
            <p className="text-3xl font-bold">{latest.weight_kg} kg</p>
            {delta !== null && (
              <p className={`flex items-center gap-1 text-sm font-medium ${
                delta < 0 ? 'text-food' : delta > 0 ? 'text-workout' : 'text-muted-foreground'
              }`}>
                {delta < 0 && <TrendingDown className="h-4 w-4" />}
                {delta > 0 && <TrendingUp className="h-4 w-4" />}
                {delta === 0 && <Minus className="h-4 w-4" />}
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg vs previous
              </p>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(latest.logged_at)}
            {latest.body_fat_pct !== null && ` · ${latest.body_fat_pct}% body fat`}
          </p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="500"
                required
                autoFocus
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="72.5"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Body fat % <span className="text-muted-foreground/60">(optional)</span></label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="15.0"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Morning, before water…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}
          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? 'Saving…' : 'Save weight'}
          </button>
        </form>
      )}

      {/* History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">History</h3>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-14 animate-pulse rounded-lg bg-secondary" />
            <div className="h-14 animate-pulse rounded-lg bg-secondary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <Scale className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No weight entries yet.</p>
            <p className="text-xs text-muted-foreground">Log your first weight to start tracking trends.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="font-semibold">{log.weight_kg} kg</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(log.logged_at)}
                    {log.body_fat_pct !== null && ` · ${log.body_fat_pct}% body fat`}
                    {log.notes && ` · ${log.notes}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this weight entry?')) remove.mutate(log.id);
                  }}
                  aria-label="Delete entry"
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
