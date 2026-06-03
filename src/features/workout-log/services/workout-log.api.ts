import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { WorkoutLog, CreateWorkoutLogInput } from '../types/workout-log.types';

export async function getWorkoutLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  workout_type?: string;
}) {
  return apiClient<PaginatedResponse<WorkoutLog>>('/workout-logs', { params });
}

export async function createWorkoutLog(data: CreateWorkoutLogInput) {
  return apiClient<ApiResponse<WorkoutLog>>('/workout-logs', {
    method: 'POST',
    body: data,
  });
}

export async function deleteWorkoutLog(id: string) {
  return apiClient<ApiResponse<{ deleted: true }>>(`/workout-logs/${id}`, {
    method: 'DELETE',
  });
}
