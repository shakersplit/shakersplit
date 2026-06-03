export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}
