import { z } from 'zod';

export const createAlcoholLogSchema = z.object({
  logged_at: z.string().datetime().optional(),
  spirit_type: z.string().min(1),
  quantity_ml: z.number().positive(),
  mixer: z.string().optional(),
  pre_game_meal_eaten: z.boolean().default(false),
  water_consumed_ml: z.number().min(0).default(0),
  intoxication_level: z.number().int().min(1).max(5).optional(),
  hangover_severity: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  share_with_friends: z.boolean().optional(),
});

export type CreateAlcoholLogInput = z.infer<typeof createAlcoholLogSchema>;
