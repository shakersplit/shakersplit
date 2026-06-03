/**
 * Admin catch-all — admin-only routes consolidated under /api/admin/*.
 * All routes pass through requireAdmin middleware, so non-admins get 403.
 *
 * Path matrix:
 *   GET    /api/admin/stats           → system-wide aggregate counts
 *   GET    /api/admin/users           → list every user (with per-user log counts)
 *   PATCH  /api/admin/users/:id       → change role / display_name
 *   DELETE /api/admin/users/:id       → hard-delete user + cascade
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

  const rawPath = req.query.path;
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const method = req.method?.toUpperCase();

  try {
    // /api/admin/stats
    if (segments.length === 1 && segments[0] === 'stats' && method === 'GET') {
      return await handleStats(res);
    }

    // /api/admin/users
    if (segments.length === 1 && segments[0] === 'users' && method === 'GET') {
      return await handleListUsers(res);
    }

    // /api/admin/users/:id
    if (segments.length === 2 && segments[0] === 'users') {
      const targetId = segments[1]!;
      if (method === 'PATCH') return await handlePatchUser(req, res, admin.id, targetId);
      if (method === 'DELETE') return await handleDeleteUser(res, admin.id, targetId);
    }

    return error(res, 404, 'NOT_FOUND', `No admin route for ${method} /api/admin/${segments.join('/')}`);
  } catch (err) {
    console.error('Unhandled /api/admin/* error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}

async function handleStats(res: VercelResponse) {
  const [users, food, workout, alcohol, weight, plans] = await Promise.all([
    supabaseAdmin.from('users').select('id, role, created_at', { count: 'exact', head: false }),
    supabaseAdmin.from('food_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('workout_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('alcohol_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('weight_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('weekly_plans').select('id', { count: 'exact', head: true }),
  ]);

  if (users.error) return error(res, 500, 'INTERNAL_ERROR', users.error.message);

  const totalUsers = users.count ?? 0;
  const adminUsers = (users.data ?? []).filter((u) => u.role === 'ADMIN').length;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newSignups7d = (users.data ?? []).filter((u) => new Date(u.created_at) >= sevenDaysAgo).length;

  return success(res, {
    total_users: totalUsers,
    admin_users: adminUsers,
    new_signups_7d: newSignups7d,
    total_food_logs: food.count ?? 0,
    total_workout_logs: workout.count ?? 0,
    total_alcohol_logs: alcohol.count ?? 0,
    total_weight_logs: weight.count ?? 0,
    total_plans: plans.count ?? 0,
  });
}

async function handleListUsers(res: VercelResponse) {
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

async function handlePatchUser(req: VercelRequest, res: VercelResponse, adminId: string, targetId: string) {
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

async function handleDeleteUser(res: VercelResponse, adminId: string, targetId: string) {
  if (targetId === adminId) {
    return error(res, 400, 'VALIDATION_ERROR', "You can't delete your own account from the admin panel. Use Profile → Delete account.");
  }
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
  if (authErr) return error(res, 500, 'INTERNAL_ERROR', `Auth delete failed: ${authErr.message}`);
  await supabaseAdmin.from('users').delete().eq('id', targetId);
  return success(res, { deleted: true });
}
