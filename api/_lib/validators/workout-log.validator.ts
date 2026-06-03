import { z } from 'zod';

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  weight_kg: z.number().positive().optional(),
  distance_km: z.number().positive().optional(),
  pace_min_km: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const createWorkoutLogSchema = z.object({
  logged_at: z.string().datetime().optional(),
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
  duration_minutes: z.number().int().positive(),
  exercises: z.array(exerciseSchema).min(1),
  calories_burned: z.number().positive().optional(),
  notes: z.string().optional(),
});

export type CreateWorkoutLogInput = z.infer<typeof createWorkoutLogSchema>;
