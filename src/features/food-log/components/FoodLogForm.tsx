import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateFoodLog } from '../hooks/useCreateFoodLog';
import { Plus, Trash2 } from 'lucide-react';
import type { MealType } from '@/types';

const foodItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  calories: z.number().optional(),
  protein_g: z.number().optional(),
});

const foodLogSchema = z.object({
  meal_type: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_GAME']),
  food_items: z.array(foodItemSchema).min(1, 'Add at least one food item'),
  total_calories: z.number().optional(),
  total_protein_g: z.number().optional(),
  notes: z.string().optional(),
});

type FoodLogFormValues = z.infer<typeof foodLogSchema>;

interface FoodLogFormProps {
  onSuccess?: () => void;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'PRE_GAME', label: 'Pre-Game' },
];

export function FoodLogForm({ onSuccess }: FoodLogFormProps) {
  const [submitError, setSubmitError] = useState('');
  const createFoodLog = useCreateFoodLog();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FoodLogFormValues>({
    resolver: zodResolver(foodLogSchema),
    defaultValues: {
      meal_type: 'LUNCH',
      food_items: [{ name: '', quantity: '', calories: undefined, protein_g: undefined }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'food_items',
  });

  const onSubmit = async (data: FoodLogFormValues) => {
    setSubmitError('');
    try {
      await createFoodLog.mutateAsync(data);
      reset();
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create food log');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Meal Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Meal Type</label>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map(({ value, label }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                value={value}
                {...register('meal_type')}
                className="peer hidden"
              />
              <span className="inline-block rounded-lg border border-input px-3 py-1.5 text-sm peer-checked:bg-food peer-checked:text-white peer-checked:border-food transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
        {errors.meal_type && (
          <p className="mt-1 text-xs text-destructive">{errors.meal_type.message}</p>
        )}
      </div>

      {/* Food Items */}
      <div>
        <label className="block text-sm font-medium mb-2">Food Items</label>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  {...register(`food_items.${index}.name`)}
                  placeholder="Food name"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  {...register(`food_items.${index}.quantity`)}
                  placeholder="Quantity (e.g., 200g)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  {...register(`food_items.${index}.calories`, { valueAsNumber: true })}
                  placeholder="Calories (opt)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  {...register(`food_items.${index}.protein_g`, { valueAsNumber: true })}
                  placeholder="Protein g (opt)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
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
        {errors.food_items && (
          <p className="mt-1 text-xs text-destructive">
            {errors.food_items.message || errors.food_items.root?.message}
          </p>
        )}
        <button
          type="button"
          onClick={() =>
            append({ name: '', quantity: '', calories: undefined, protein_g: undefined })
          }
          className="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Any additional notes..."
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
        disabled={createFoodLog.isPending}
        className="w-full rounded-lg bg-food px-4 py-2.5 text-sm font-medium text-white hover:bg-food/90 disabled:opacity-50"
      >
        {createFoodLog.isPending ? 'Saving...' : 'Log Food'}
      </button>
    </form>
  );
}
