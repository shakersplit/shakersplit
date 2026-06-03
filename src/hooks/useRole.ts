import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from './useAuth';
import type { ApiResponse } from '@/types';

interface UserRecord {
  id: string;
  email: string;
  display_name: string | null;
  role: 'ADMIN' | 'USER';
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the current user's profile (including role) from the API. Cached for 5 minutes
 * because role rarely changes and we hit this on every authenticated page load.
 */
export function useUserProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => apiClient<ApiResponse<UserRecord>>('/users/me'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Convenience: returns whether the current authenticated user is an admin.
 * Returns `undefined` while loading so callers can distinguish "not yet known"
 * from "definitely not admin".
 */
export function useIsAdmin(): { isAdmin: boolean | undefined; isLoading: boolean } {
  const { data, isLoading } = useUserProfile();
  if (isLoading) return { isAdmin: undefined, isLoading: true };
  return { isAdmin: data?.data?.role === 'ADMIN', isLoading: false };
}
