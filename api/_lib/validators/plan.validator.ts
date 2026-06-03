import { z } from 'zod';

const planContentSchema = z.record(z.string(), z.unknown());

export const createPlanSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  name: z.string().max(100).optional(),
  is_template: z.boolean().optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().max(100).nullable().optional(),
  is_template: z.boolean().optional(),
});

export const createPlanEntrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  category: z.enum(['FOOD', 'WORKOUT', 'ALCOHOL']),
  time_slot: z.string().max(50).optional(),
  content: planContentSchema,
  notes: z.string().optional(),
});

export const updatePlanEntrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6).optional(),
  category: z.enum(['FOOD', 'WORKOUT', 'ALCOHOL']).optional(),
  time_slot: z.string().max(50).nullable().optional(),
  content: planContentSchema.optional(),
  notes: z.string().nullable().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type CreatePlanEntryInput = z.infer<typeof createPlanEntrySchema>;
