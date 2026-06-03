import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateWorkoutLog } from '../hooks/useCreateWorkoutLog';
import { Plus, Trash2 } from 'lucide-react';
import type { WorkoutType } from '@/types';
import { WorkoutTemplatesPicker, SaveAsTemplateButton, type WorkoutTemplate } from './WorkoutTemplates';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name required'),
  sets: z.number().optional(),
  reps: z.number().optional(),
  weight_kg: z.number().optional(),
  distance_km: z.number().optional(),
});

const workoutLogSchema = z.object({
  workout_type: z.enum([
    'GYM_PUSH',
    'GYM_PULL',
    'GYM_LEGS',
    'GYM_UPPER',
    'GYM_LOWER',
    'GYM_FULL',
    'RUN',
    'WALK',
    'SPORT',
    'OTHER',
  ]),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  exercises: z.array(exerciseSchema).min(1, 'Add at least one exercise'),
  calories_burned: z.number().optional(),
  notes: z.string().optional(),
});

type WorkoutLogFormValues = z.infer<typeof workoutLogSchema>;

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'GYM_PUSH', label: 'Push' },
  { value: 'GYM_PULL', label: 'Pull' },
  { value: 'GYM_LEGS', label: 'Legs' },
  { value: 'GYM_UPPER', label: 'Upper' },
  { value: 'GYM_LOWER', label: 'Lower' },
  { value: 'GYM_FULL', label: 'Full Body' },
  { value: 'RUN', label: 'Run' },
  { value: 'WALK', label: 'Walk' },
  { value: 'SPORT', label: 'Sport' },
  { value: 'OTHER', label: 'Other' },
];

interface WorkoutLogFormProps {
  onSuccess?: () => void;
}

export function WorkoutLogForm({ onSuccess }: WorkoutLogFormProps) {
  const [submitError, setSubmitError] = useState('');
  const createWorkoutLog = useCreateWorkoutLog();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<WorkoutLogFormValues>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: {
      workout_type: 'GYM_PUSH',
      duration_minutes: 60,
      exercises: [{ name: '', sets: undefined, reps: undefined, weight_kg: undefined }],
      notes: '',
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'exercises',
  });

  const workoutType = watch('workout_type');
  const isCardio = ['RUN', 'WALK'].includes(workoutType);

  const onSubmit = async (data: WorkoutLogFormValues) => {
    setSubmitError('');
    try {
      await createWorkoutLog.mutateAsync(data);
      reset();
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create workout log');
    }
  };

  /** Populate the form from a saved template — overwrites all fields. */
  const applyTemplate = (t: WorkoutTemplate) => {
    setValue('workout_type', t.workout_type);
    setValue('duration_minutes', t.duration_minutes);
    setValue('notes', t.notes ?? '');
    // Replace whole field array with template exercises so RHF re-renders cleanly.
    replace(
      t.exercises.length > 0
        ? t.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight_kg: e.weight_kg,
          }))
        : [{ name: '', sets: undefined, reps: undefined, weight_kg: undefined }],
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Templates picker — appears only if user has saved any */}
      <WorkoutTemplatesPicker onPick={applyTemplate} />
      {/* Workout Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Workout Type</label>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_TYPES.map(({ value, label }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                value={value}
                {...register('workout_type')}
                className="peer hidden"
              />
              <span className="inline-block rounded-lg border border-input px-3 py-1.5 text-sm peer-checked:bg-workout peer-checked:text-white peer-checked:border-workout transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Duration (minutes)</label>
        <input
          type="number"
          {...register('duration_minutes', { valueAsNumber: true })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="60"
        />
        {errors.duration_minutes && (
          <p className="mt-1 text-xs text-destructive">{errors.duration_minutes.message}</p>
        )}
      </div>

      {/* Exercises */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {isCardio ? 'Activity Details' : 'Exercises'}
        </label>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  {...register(`exercises.${index}.name`)}
                  placeholder={isCardio ? 'Route / Location' : 'Exercise name'}
                  className="col-span-2 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {isCardio ? (
                  <input
                    type="number"
                    step="0.1"
                    {...register(`exercises.${index}.distance_km`, { valueAsNumber: true })}
                    placeholder="Distance (km)"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <>
                    <input
                      type="number"
                      {...register(`exercises.${index}.sets`, { valueAsNumber: true })}
                      placeholder="Sets"
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
                      placeholder="Reps"
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      step="0.5"
                      {...register(`exercises.${index}.weight_kg`, { valueAsNumber: true })}
                      placeholder="Weight (kg)"
                      className="col-span-2 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </>
                )}
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-2 rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            append({ name: '', sets: undefined, reps: undefined, weight_kg: undefined })
          }
          className="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add {isCardio ? 'segment' : 'exercise'}
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="How did you feel?"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {submitError && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={createWorkoutLog.isPending}
        className="w-full rounded-lg bg-workout px-4 py-2.5 text-sm font-medium text-white hover:bg-workout/90 disabled:opacity-50"
      >
        {createWorkoutLog.isPending ? 'Saving...' : 'Log Workout'}
      </button>

      {/* Save current workout as template — visible only when there's at least one named exercise. */}
      {fields.length > 0 && (
        <SaveAsTemplateCallout watchValues={watch} getValues={getValues} />
      )}
    </form>
  );
}

/**
 * Tiny adapter — pulls current form values via watch() so the template button reflects what's
 * in the form right now. Hidden until the user has typed an exercise name (template would be empty).
 */
function SaveAsTemplateCallout({
  watchValues,
  getValues,
}: {
  watchValues: ReturnType<typeof useForm<WorkoutLogFormValues>>['watch'];
  getValues: ReturnType<typeof useForm<WorkoutLogFormValues>>['getValues'];
}) {
  // Subscribe to exercises so the button hides/shows when the first name appears.
  const exercises = watchValues('exercises');
  const hasNamedExercise = exercises.some((e) => e.name?.trim());
  if (!hasNamedExercise) return null;

  return (
    <div className="pt-1">
      <SaveAsTemplateButton
        workoutType={getValues('workout_type')}
        durationMinutes={getValues('duration_minutes')}
        exercises={getValues('exercises').filter((e) => e.name?.trim())}
        notes={getValues('notes') || undefined}
      />
    </div>
  );
}
