import { z } from 'zod';

export const createMentalHealthLogSchema = z.object({
  logged_at: z.string().datetime().optional(),
  mood_score: z.number().int().min(1).max(10),
  sleep_hours: z.number().min(0).max(24).optional(),
  sleep_quality: z.number().int().min(1).max(5).optional(),
  journal_entry: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  share_with_friends: z.boolean().optional(),
});;

export type CreateMentalHealthLogInput = z.infer<typeof createMentalHealthLogSchema>;
