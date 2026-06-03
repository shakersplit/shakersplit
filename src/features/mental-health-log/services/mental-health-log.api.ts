import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { MentalHealthLog, CreateMentalHealthLogInput } from '../types/mental-health-log.types';

export async function getMentalHealthLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}) {
  return apiClient<PaginatedResponse<MentalHealthLog>>('/mental-health-logs', { params });
}

export async function createMentalHealthLog(data: CreateMentalHealthLogInput) {
  return apiClient<ApiResponse<MentalHealthLog>>('/mental-health-logs', {
    method: 'POST',
    body: data,
  });
}

export async function updateMentalHealthLog(id: string, data: CreateMentalHealthLogInput) {
  return apiClient<ApiResponse<MentalHealthLog>>('/mental-health-logs', {
    method: 'PUT',
    params: { id },
    body: data,
  });
}

export async function deleteMentalHealthLog(id: string) {
  return apiClient<ApiResponse<{ deleted: true }>>('/mental-health-logs', {
    method: 'DELETE',
    params: { id },
  });
}
