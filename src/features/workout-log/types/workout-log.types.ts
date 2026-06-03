import type { WorkoutType } from '@/types';

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  distance_km?: number;
  pace_min_km?: number;
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  logged_at: string;
  workout_type: WorkoutType;
  duration_minutes: number;
  exercises: Exercise[];
  calories_burned: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateWorkoutLogInput {
  logged_at?: string;
  workout_type: WorkoutType;
  duration_minutes: number;
  exercises: Exercise[];
  calories_burned?: number;
  notes?: string;
}
