import { z } from 'zod';

export const createWeightLogSchema = z.object({
  logged_at: z.string().datetime().optional(),
  weight_kg: z.number().positive().max(500),
  body_fat_pct: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
  share_with_friends: z.boolean().optional(),
});

export type CreateWeightLogInput = z.infer<typeof createWeightLogSchema>;
