import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type {
  WeeklyPlan,
  PlanEntry,
  CreatePlanInput,
  CreatePlanEntryInput,
} from '../types/plan.types';

export async function getPlans(params?: { page?: number; limit?: number; is_template?: boolean }) {
  return apiClient<PaginatedResponse<WeeklyPlan>>('/plans', { params });
}

export async function getPlan(planId: string) {
  return apiClient<ApiResponse<WeeklyPlan & { entries: PlanEntry[] }>>(`/plans/${planId}`);
}

export async function createPlan(data: CreatePlanInput) {
  return apiClient<ApiResponse<WeeklyPlan>>('/plans', { method: 'POST', body: data });
}

export async function updatePlan(planId: string, data: Partial<CreatePlanInput>) {
  return apiClient<ApiResponse<WeeklyPlan>>(`/plans/${planId}`, { method: 'PUT', body: data });
}

export async function deletePlan(planId: string) {
  return apiClient<ApiResponse<{ deleted: true }>>(`/plans/${planId}`, { method: 'DELETE' });
}

export async function getPlanEntries(
  planId: string,
  params?: { day_of_week?: number; category?: string },
) {
  return apiClient<ApiResponse<PlanEntry[]>>(`/plans/${planId}/entries`, { params });
}

export async function createPlanEntry(planId: string, data: CreatePlanEntryInput) {
  return apiClient<ApiResponse<PlanEntry>>(`/plans/${planId}/entries`, {
    method: 'POST',
    body: data,
  });
}

export async function updatePlanEntry(
  planId: string,
  entryId: string,
  data: Partial<CreatePlanEntryInput>,
) {
  return apiClient<ApiResponse<PlanEntry>>(`/plans/${planId}/entries/${entryId}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deletePlanEntry(planId: string, entryId: string) {
  return apiClient<ApiResponse<{ deleted: true }>>(`/plans/${planId}/entries/${entryId}`, {
    method: 'DELETE',
  });
}
