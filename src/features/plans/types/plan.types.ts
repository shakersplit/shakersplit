export type PlanCategory = 'FOOD' | 'WORKOUT' | 'ALCOHOL';

export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  name: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodPlanContent {
  meal_type: string;
  items: string[];
  estimated_calories?: number;
}

export interface WorkoutPlanContent {
  workout_type: string;
  exercises: string[];
  duration_minutes?: number;
}

export interface AlcoholPlanContent {
  occasion: string;
  planned_drinks?: number;
  pre_game_plan?: string;
}

export type PlanContent = FoodPlanContent | WorkoutPlanContent | AlcoholPlanContent;

export interface PlanEntry {
  id: string;
  weekly_plan_id: string;
  day_of_week: number;
  category: PlanCategory;
  time_slot: string | null;
  content: PlanContent;
  notes: string | null;
  created_at: string;
}

export interface CreatePlanInput {
  week_start_date: string;
  name?: string;
  is_template?: boolean;
}

export interface CreatePlanEntryInput {
  day_of_week: number;
  category: PlanCategory;
  time_slot?: string;
  content: PlanContent;
  notes?: string;
}
