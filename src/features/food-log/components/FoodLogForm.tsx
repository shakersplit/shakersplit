import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateFoodLog } from '../hooks/useCreateFoodLog';
import { Plus, Trash2 } from 'lucide-react';
import type { MealType } from '@/types';
import { PhotoUploader } from '@/components/photo/PhotoUploader';
import { AIQuickLogBar } from '@/components/ai/AIQuickLogBar';

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

interface AIFoodResponse {
  meal_type: MealType;
  items: { name: string; quantity: string; calories?: number; protein_g?: number }[];
  total_calories: number;
  total_protein_g: number;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export function FoodLogForm({ onSuccess }: FoodLogFormProps) {
  const [submitError, setSubmitError] = useState('');
  // Photo URL is local state — gets attached to the create payload as photo_url.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // Share-with-friends opt-in for THIS log only. Defaults off for privacy.
  const [shareWithFriends, setShareWithFriends] = useState(false);
  const createFoodLog = useCreateFoodLog();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FoodLogFormValues>({
    resolver: zodResolver(foodLogSchema),
    defaultValues: {
      meal_type: 'LUNCH',
      food_items: [{ name: '', quantity: '', calories: undefined, protein_g: undefined }],
      notes: '',
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'food_items',
  });

  const onSubmit = async (data: FoodLogFormValues) => {
    setSubmitError('');
    try {
      // Mutation type only knows the validated shape; merge in extras manually.
      await createFoodLog.mutateAsync({
        ...data,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
        ...(shareWithFriends ? { share_with_friends: true } : {}),
      } as typeof data & { photo_url?: string; share_with_friends?: boolean });
      reset();
      setPhotoUrl(null);
      setShareWithFriends(false);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create food log');
    }
  };

  /** Drop the parsed AI response into the form fields. */
  const applyAIParse = (parsed: AIFoodResponse) => {
    setValue('meal_type', parsed.meal_type);
    replace(
      parsed.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        calories: i.calories,
        protein_g: i.protein_g,
      })),
    );
    setValue('total_calories', parsed.total_calories);
    setValue('total_protein_g', parsed.total_protein_g);
    if (parsed.notes) setValue('notes', parsed.notes);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* AI parser — natural-language entry. Optional shortcut. */}
      <AIQuickLogBar<AIFoodResponse>
        endpoint="/food-logs"
        placeholder="e.g. 2 scrambled eggs, toast, and a banana"
        onParsed={applyAIParse}
      />

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

      {/* Photo upload — optional */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Photo <span className="text-muted-foreground/70 font-normal">(optional)</span>
        </label>
        <PhotoUploader scope="food" value={photoUrl} onChange={setPhotoUrl} />
      </div>

      {/* Share with friends toggle */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={shareWithFriends}
          onChange={(e) => setShareWithFriends(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <span className="text-sm">
          Share with friends
          <span className="block text-xs text-muted-foreground">
            Show this meal in your friends' Activity feed.
          </span>
        </span>
      </label>

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
