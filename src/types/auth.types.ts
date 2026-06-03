import type { UserRole } from './enums';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  created_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
}
