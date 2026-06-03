import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Plus, X, Repeat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WorkoutType } from '@/types';

interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  workout_type: WorkoutType;
  duration_minutes: number;
  exercises: { name: string; sets?: number; reps?: number; weight_kg?: number }[];
  notes: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface WorkoutTemplatesPickerProps {
  /**
   * Called when the user taps "Use template". Receives the full template payload so the
   * caller can populate the workout log form. Caller is responsible for actually creating
   * the log + bumping the use_count via markUsed() if they want to record usage.
   */
  onPick: (t: WorkoutTemplate) => void;
}

/**
 * Inline templates picker for the LogWorkoutPage. Lists the user's saved templates as
 * compact pills the user can tap to populate the form. Includes a "Manage" toggle that
 * reveals delete buttons for housekeeping.
 *
 * Save-as-template happens after a successful log creation (separate component, see below).
 */
export function WorkoutTemplatesPicker({ onPick }: WorkoutTemplatesPickerProps) {
  const [manage, setManage] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: async (): Promise<WorkoutTemplate[]> => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('use_count', { ascending: false })
        .order('last_used_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as WorkoutTemplate[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-templates'] }),
  });

  const markUsed = useMutation({
    mutationFn: async (template: WorkoutTemplate) => {
      const { error } = await supabase
        .from('workout_templates')
        .update({ use_count: template.use_count + 1, last_used_at: new Date().toISOString() })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-templates'] }),
  });

  if (isLoading || templates.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bookmark className="h-3.5 w-3.5 text-primary" />
          Templates
        </div>
        <button
          type="button"
          onClick={() => setManage(!manage)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {manage ? 'Done' : 'Manage'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onPick(t);
                void markUsed.mutateAsync(t);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-secondary/50 hover:bg-secondary px-3 py-1 text-xs font-medium transition-colors"
            >
              <Repeat className="h-3 w-3" /> {t.name}
              <span className="text-muted-foreground/70">· {t.duration_minutes}m</span>
            </button>
            {manage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete template "${t.name}"?`)) remove.mutate(t.id);
                }}
                aria-label={`Delete ${t.name}`}
                className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SaveAsTemplateProps {
  workoutType: WorkoutType;
  durationMinutes: number;
  exercises: { name: string; sets?: number; reps?: number; weight_kg?: number }[];
  notes?: string;
  /** Called after the template is saved successfully so the caller can show feedback. */
  onSaved?: (t: WorkoutTemplate) => void;
}

/**
 * Inline button that lets the user save the workout they just logged as a template.
 * Lives directly inside the WorkoutLogForm so the data is always in sync with what was
 * just submitted.
 */
export function SaveAsTemplateButton({ workoutType, durationMinutes, exercises, notes, onSaved }: SaveAsTemplateProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');
      if (!name.trim()) throw new Error('Name is required.');
      if (exercises.length === 0) throw new Error('Add at least one exercise first.');
      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: name.trim(),
          workout_type: workoutType,
          duration_minutes: durationMinutes,
          exercises,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkoutTemplate;
    },
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      onSaved?.(t);
      setOpen(false);
      setName('');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setError(''); setOpen(true); }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Save as template
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-card p-3">
      <p className="text-xs font-medium">Name this template</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Push Day A"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || !name.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save template'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setName(''); }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export type { WorkoutTemplate };
