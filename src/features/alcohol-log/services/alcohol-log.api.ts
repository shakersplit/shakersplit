import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { AlcoholLog, CreateAlcoholLogInput } from '../types/alcohol-log.types';

/** Single /alcohol-logs route dispatches by ?id= for detail/update/delete (Hobby plan limit). */

export async function getAlcoholLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}) {
  return apiClient<PaginatedResponse<AlcoholLog>>('/alcohol-logs', { params });
}

export async function createAlcoholLog(data: CreateAlcoholLogInput) {
  return apiClient<ApiResponse<AlcoholLog>>('/alcohol-logs', {
    method: 'POST',
    body: data,
  });
}

export async function updateAlcoholLog(id: string, data: CreateAlcoholLogInput) {
  return apiClient<ApiResponse<AlcoholLog>>('/alcohol-logs', {
    method: 'PUT',
    params: { id },
    body: data,
  });
}

export async function deleteAlcoholLog(id: string) {
  return apiClient<ApiResponse<{ deleted: true }>>('/alcohol-logs', {
    method: 'DELETE',
    params: { id },
  });
}
