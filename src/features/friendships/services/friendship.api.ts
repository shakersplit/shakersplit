import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

export interface FriendUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Friendship {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
  direction: 'incoming' | 'outgoing';
  other_user: FriendUser;
}

export async function getFriendships() {
  return apiClient<ApiResponse<Friendship[]>>('/friendships');
}

export async function sendFriendRequest(addressee_email: string) {
  return apiClient<ApiResponse<unknown>>('/friendships', {
    method: 'POST',
    body: { addressee_email },
  });
}

export async function decideFriendship(id: string, status: 'ACCEPTED' | 'DECLINED') {
  return apiClient<ApiResponse<unknown>>('/friendships', {
    method: 'PATCH',
    params: { id },
    body: { status },
  });
}

export async function removeFriendship(id: string) {
  return apiClient<ApiResponse<unknown>>('/friendships', {
    method: 'DELETE',
    params: { id },
  });
}
