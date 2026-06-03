import type { MealType } from '@/types';

export interface FoodItem {
  name: string;
  quantity: string;
  calories?: number;
  protein_g?: number;
}

export interface FoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  food_items: FoodItem[];
  total_calories: number | null;
  total_protein_g: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateFoodLogInput {
  logged_at?: string;
  meal_type: MealType;
  food_items: FoodItem[];
  total_calories?: number;
  total_protein_g?: number;
  photo_url?: string;
  notes?: string;
}
