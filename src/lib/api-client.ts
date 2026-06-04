import { supabase } from './supabase';

const API_BASE = '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  /** Internal — set by retry logic to prevent infinite loops on 401. */
  _isRetry?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, _isRetry = false } = options;

  // Get the current session. supabase-js auto-refreshes tokens that are about to expire,
  // but if the token is already expired we must explicitly refresh before sending the
  // request — otherwise the API returns 401 and the user thinks the app is broken.
  let { data: { session } } = await supabase.auth.getSession();
  if (session?.expires_at) {
    const expiresAtMs = session.expires_at * 1000;
    // Refresh if the token expires in <30 seconds — the request roundtrip plus any
    // server-side processing margin.
    if (Date.now() > expiresAtMs - 30_000) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) session = refreshed.session;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If we get a 401 and haven't already retried, try refreshing the session and
  // sending the request once more. Handles the edge case where Supabase's auto-refresh
  // missed the boundary or the access_token rotation happened mid-request.
  if (response.status === 401 && !_isRetry && session) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session) {
      return apiClient<T>(endpoint, { ...options, _isRetry: true });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiClientError(
      response.status,
      error.error?.message || error.message || 'Unknown error',
      error.error?.code,
    );
  }

  return response.json();
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
