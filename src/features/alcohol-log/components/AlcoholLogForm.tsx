import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateAlcoholLog } from '../hooks/useCreateAlcoholLog';

const alcoholLogSchema = z.object({
  spirit_type: z.string().min(1, 'Spirit type is required'),
  quantity_ml: z.number().min(1, 'Quantity must be at least 1ml'),
  mixer: z.string().optional(),
  pre_game_meal_eaten: z.boolean(),
  water_consumed_ml: z.number().optional(),
  intoxication_level: z.number().min(1).max(5).optional(),
  hangover_severity: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
});

type AlcoholLogFormValues = z.infer<typeof alcoholLogSchema>;

const SPIRIT_OPTIONS = [
  'Vodka',
  'Gin',
  'Tequila',
  'Rum',
  'Whiskey',
  'Beer',
  'Wine',
  'Cocktail',
  'Other',
];

interface AlcoholLogFormProps {
  onSuccess?: () => void;
}

export function AlcoholLogForm({ onSuccess }: AlcoholLogFormProps) {
  const [submitError, setSubmitError] = useState('');
  const createAlcoholLog = useCreateAlcoholLog();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlcoholLogFormValues>({
    resolver: zodResolver(alcoholLogSchema),
    defaultValues: {
      spirit_type: '',
      quantity_ml: 60,
      mixer: '',
      pre_game_meal_eaten: false,
      water_consumed_ml: 0,
      notes: '',
    },
  });

  const onSubmit = async (data: AlcoholLogFormValues) => {
    setSubmitError('');
    try {
      await createAlcoholLog.mutateAsync(data);
      reset();
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to log alcohol');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Spirit Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Spirit Type</label>
        <div className="flex flex-wrap gap-2">
          {SPIRIT_OPTIONS.map((spirit) => (
            <label key={spirit} className="cursor-pointer">
              <input
                type="radio"
                value={spirit.toLowerCase()}
                {...register('spirit_type')}
                className="peer hidden"
              />
              <span className="inline-block rounded-lg border border-input px-3 py-1.5 text-sm peer-checked:bg-alcohol peer-checked:text-white peer-checked:border-alcohol transition-colors">
                {spirit}
              </span>
            </label>
          ))}
        </div>
        {errors.spirit_type && (
          <p className="mt-1 text-xs text-destructive">{errors.spirit_type.message}</p>
        )}
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Quantity (ml)</label>
        <input
          type="number"
          {...register('quantity_ml', { valueAsNumber: true })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="60"
        />
        {errors.quantity_ml && (
          <p className="mt-1 text-xs text-destructive">{errors.quantity_ml.message}</p>
        )}
      </div>

      {/* Mixer */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Mixer (optional)</label>
        <input
          {...register('mixer')}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Coconut water, soda, tonic..."
        />
      </div>

      {/* Damage Control Checklist */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
        <h4 className="text-sm font-medium">Damage Control Checklist</h4>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('pre_game_meal_eaten')}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">Pre-game meal eaten</span>
        </label>

        <div>
          <label className="block text-sm mb-1">Water consumed (ml)</label>
          <input
            type="number"
            {...register('water_consumed_ml', { valueAsNumber: true })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="500"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Intoxication level (1-5)</label>
          <input
            type="range"
            min="1"
            max="5"
            {...register('intoxication_level', { valueAsNumber: true })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sober</span>
            <span>Tipsy</span>
            <span>Drunk</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Occasion, how you felt..."
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
        disabled={createAlcoholLog.isPending}
        className="w-full rounded-lg bg-alcohol px-4 py-2.5 text-sm font-medium text-white hover:bg-alcohol/90 disabled:opacity-50"
      >
        {createAlcoholLog.isPending ? 'Saving...' : 'Log Alcohol'}
      </button>
    </form>
  );
}
