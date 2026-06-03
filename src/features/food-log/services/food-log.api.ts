import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { FoodLog, CreateFoodLogInput } from '../types/food-log.types';

export async function getFoodLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  meal_type?: string;
}) {
  return apiClient<PaginatedResponse<FoodLog>>('/food-logs', { params });
}

export async function getFoodLog(id: string) {
  return apiClient<ApiResponse<FoodLog>>(`/food-logs/${id}`);
}

export async function createFoodLog(data: CreateFoodLogInput) {
  return apiClient<ApiResponse<FoodLog>>('/food-logs', {
    method: 'POST',
    body: data,
  });
}

export async function updateFoodLog(id: string, data: CreateFoodLogInput) {
  return apiClient<ApiResponse<FoodLog>>(`/food-logs/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deleteFoodLog(id: string) {
  return apiClient<ApiResponse<{ deleted: true }>>(`/food-logs/${id}`, {
    method: 'DELETE',
  });
}
