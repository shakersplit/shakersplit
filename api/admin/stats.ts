import { createHandler } from '../_lib/factories/handler.factory';
import { requireAdmin } from '../_lib/middleware/auth.middleware';
import { supabaseAdmin } from '../_lib/config/supabase.config';
import { success, error } from '../_lib/utils/response.util';

/**
 * Admin dashboard stats — system-wide totals so the admin can see growth at a glance.
 */
export default createHandler({
  async GET(req, res) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    // Run all counts in parallel to keep latency reasonable.
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

    // 7-day signup growth — derive from already-fetched user rows.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newSignups7d = (users.data ?? []).filter(
      (u) => new Date(u.created_at) >= sevenDaysAgo,
    ).length;

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
  },
});
