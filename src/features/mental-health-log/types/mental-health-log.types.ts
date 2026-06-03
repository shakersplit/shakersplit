export interface MentalHealthLog {
  id: string;
  user_id: string;
  logged_at: string;
  mood_score: number;
  sleep_hours: number | null;
  sleep_quality: number | null;
  journal_entry: string | null;
  tags: string[];
  created_at: string;
}

export interface CreateMentalHealthLogInput {
  logged_at?: string;
  mood_score: number;
  sleep_hours?: number;
  sleep_quality?: number;
  journal_entry?: string;
  tags?: string[];
}
