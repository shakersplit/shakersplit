/**
 * Admin: users management. Single file with query-param dispatch:
 *   GET    /api/admin/users                  list every user with per-user log counts
 *   PATCH  /api/admin/users?id=:id           change role / display_name
 *   DELETE /api/admin/users?id=:id           hard-delete user + cascade
 *
 * All routes pass through requireAdmin so non-admins get 403. Self-protection: an admin
 * cannot demote or delete themselves to avoid lockout.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/middleware/cors.middleware';
import { requireAdmin } from '../_lib/middleware/auth.middleware';
import { supabaseAdmin } from '../_lib/config/supabase.config';
import { success, error } from '../_lib/utils/response.util';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const targetId = req.query.id as string | undefined;
  const method = req.method?.toUpperCase();

  try {
    if (method === 'GET' && !targetId) return await handleList(res);
    if (method === 'PATCH' && targetId) return await handlePatch(req, res, admin.id, targetId);
    if (method === 'DELETE' && targetId) return await handleDelete(res, admin.id, targetId);
    return error(res, 400, 'VALIDATION_ERROR', `Unsupported method/params: ${method}${targetId ? ' (id given)' : ''}`);
  } catch (err) {
    console.error('admin/users error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}

async function handleList(res: VercelResponse) {
  const { data: users, error: dbErr } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name, role, created_at, height_cm, weight_kg')
    .order('created_at', { ascending: false });

  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);

  const ids = (users ?? []).map((u) => u.id);
  if (ids.length === 0) return success(res, []);

  const [foodCounts, workoutCounts, alcoholCounts] = await Promise.all([
    supabaseAdmin.from('food_logs').select('user_id').in('user_id', ids),
    supabaseAdmin.from('workout_logs').select('user_id').in('user_id', ids),
    supabaseAdmin.from('alcohol_logs').select('user_id').in('user_id', ids),
  ]);

  const tally = (rows: { user_id: string }[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return m;
  };

  const foodMap = tally(foodCounts.data);
  const workoutMap = tally(workoutCounts.data);
  const alcoholMap = tally(alcoholCounts.data);

  const enriched = (users ?? []).map((u) => ({
    ...u,
    food_log_count: foodMap.get(u.id) ?? 0,
    workout_log_count: workoutMap.get(u.id) ?? 0,
    alcohol_log_count: alcoholMap.get(u.id) ?? 0,
  }));

  return success(res, enriched);
}

async function handlePatch(req: VercelRequest, res: VercelResponse, adminId: string, targetId: string) {
  if (targetId === adminId) {
    return error(res, 400, 'VALIDATION_ERROR', "You can't modify your own admin role.");
  }
  const { role, display_name } = (req.body ?? {}) as { role?: string; display_name?: string };
  const updates: Record<string, unknown> = {};
  if (role !== undefined) {
    if (!['USER', 'ADMIN'].includes(role)) return error(res, 400, 'VALIDATION_ERROR', 'role must be USER or ADMIN');
    updates.role = role;
  }
  if (display_name !== undefined) updates.display_name = display_name;
  if (Object.keys(updates).length === 0) return error(res, 400, 'VALIDATION_ERROR', 'No fields to update');

  const { data, error: dbErr } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', targetId)
    .select()
    .single();
  if (dbErr || !data) return error(res, 500, 'INTERNAL_ERROR', dbErr?.message ?? 'Update failed');
  return success(res, data);
}

async function handleDelete(res: VercelResponse, adminId: string, targetId: string) {
  if (targetId === adminId) {
    return error(res, 400, 'VALIDATION_ERROR', "You can't delete your own account from the admin panel. Use Profile → Delete account.");
  }
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
  if (authErr) return error(res, 500, 'INTERNAL_ERROR', `Auth delete failed: ${authErr.message}`);
  await supabaseAdmin.from('users').delete().eq('id', targetId);
  return success(res, { deleted: true });
}
