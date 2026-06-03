export interface AlcoholLog {
  id: string;
  user_id: string;
  logged_at: string;
  spirit_type: string;
  quantity_ml: number;
  mixer: string | null;
  pre_game_meal_eaten: boolean;
  water_consumed_ml: number;
  intoxication_level: number | null;
  hangover_severity: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateAlcoholLogInput {
  logged_at?: string;
  spirit_type: string;
  quantity_ml: number;
  mixer?: string;
  pre_game_meal_eaten?: boolean;
  water_consumed_ml?: number;
  intoxication_level?: number;
  hangover_severity?: number;
  notes?: string;
}
