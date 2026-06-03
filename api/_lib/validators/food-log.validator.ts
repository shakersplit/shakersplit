import { z } from 'zod';

const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1),
  calories: z.number().optional(),
  protein_g: z.number().optional(),
});

export const createFoodLogSchema = z.object({
  logged_at: z.string().datetime().optional(),
  meal_type: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_GAME']),
  food_items: z.array(foodItemSchema).min(1),
  total_calories: z.number().optional(),
  total_protein_g: z.number().optional(),
  photo_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreateFoodLogInput = z.infer<typeof createFoodLogSchema>;
