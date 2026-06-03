import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../config/supabase.config';
import { error } from '../utils/response.util';
import type { AuthUser } from '../types';

export async function verifyAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    error(res, 401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    return null;
  }

  const token = authHeader.slice(7);

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    error(res, 401, 'UNAUTHORIZED', 'Invalid or expired token');
    return null;
  }

  // Fetch user role from our users table
  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email!,
    role: (dbUser?.role as 'ADMIN' | 'USER') || 'USER',
  };
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthUser | null> {
  const user = await verifyAuth(req, res);
  if (!user) return null;

  if (user.role !== 'ADMIN') {
    error(res, 403, 'FORBIDDEN', 'Admin access required');
    return null;
  }

  return user;
}
