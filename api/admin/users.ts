import { createHandler } from './_lib/factories/handler.factory';
import { requireAdmin } from './_lib/middleware/auth.middleware';
import { supabaseAdmin } from './_lib/config/supabase.config';
import { success, error } from './_lib/utils/response.util';

/**
 * Admin-only: list every user in the system, with summary counts of their logs.
 * Wrapped in createHandler so we still get CORS, but auth check is the stricter
 * requireAdmin gate (returns 403 to non-admins).
 */
export default createHandler({
  async GET(req, res) {
    // The factory already called verifyAuth; replace with admin check.
    const admin = await requireAdmin(req, res);
    if (!admin) return; // requireAdmin already wrote 401/403

    const { data: users, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, role, created_at, height_cm, weight_kg')
      .order('created_at', { ascending: false });

    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);

    // Pull aggregate counts per user — three small queries, results joined in JS.
    // For a project with ~80 users this is fine; if it grows we'll move to a SQL view.
    const ids = (users ?? []).map((u) => u.id);
    if (ids.length === 0) return success(res, []);

    const [foodCounts, workoutCounts, alcoholCounts] = await Promise.all([
      supabaseAdmin.from('food_logs').select('user_id').in('user_id', ids),
      supabaseAdmin.from('workout_logs').select('user_id').in('user_id', ids),
      supabaseAdmin.from('alcohol_logs').select('user_id').in('user_id', ids),
    ]);

    function tally(rows: { user_id: string }[] | null) {
      const m = new Map<string, number>();
      (rows ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
      return m;
    }
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
  },
});
