import type { VercelResponse } from '@vercel/node';
import type { ApiResponse, PaginatedResponse } from '../types';

export function success<T>(res: VercelResponse, data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return res.status(status).json(body);
}

export function paginated<T>(
  res: VercelResponse,
  data: T[],
  pagination: { page: number; limit: number; total: number },
) {
  const body: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
  return res.status(200).json(body);
}

export function error(
  res: VercelResponse,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
) {
  return res.status(status).json({
    success: false,
    error: { code, message, details },
  });
}
