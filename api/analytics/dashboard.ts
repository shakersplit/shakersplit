/**
 * Analytics dashboard — today/week aggregates + streaks + latest weight.
 */
import { createHandler } from '../_lib/factories/handler.factory';
import { supabaseAdmin } from '../_lib/config/supabase.config';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(_req, res, user) {
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const todayISO = startOfTodayUTC.toISOString();
    const weekStartISO = sevenDaysAgo.toISOString();

    const [
      foodToday, foodWeek,
      workoutToday, workoutWeek,
      alcoholToday, alcoholWeek,
      streaks, latestWeight,
    ] = await Promise.all([
      supabaseAdmin.from('food_logs').select('total_calories', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', todayISO),
      supabaseAdmin.from('food_logs').select('total_calories, logged_at', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', weekStartISO),
      supabaseAdmin.from('workout_logs').select('duration_minutes, calories_burned', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', todayISO),
      supabaseAdmin.from('workout_logs').select('duration_minutes, calories_burned, logged_at', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', weekStartISO),
      supabaseAdmin.from('alcohol_logs').select('quantity_ml', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', todayISO),
      supabaseAdmin.from('alcohol_logs').select('quantity_ml, logged_at', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', weekStartISO),
      supabaseAdmin.from('activity_streaks').select('streak_type, current_count, longest_count, last_logged_at').eq('user_id', user.id),
      supabaseAdmin.from('weight_logs').select('weight_kg, body_fat_pct, logged_at').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const errs = [foodToday, foodWeek, workoutToday, workoutWeek, alcoholToday, alcoholWeek, streaks, latestWeight].map((r) => r.error).filter(Boolean);
    if (errs.length > 0) return error(res, 500, 'INTERNAL_ERROR', errs[0]?.message ?? 'Aggregation failed');

    const sumCalories = (rows: { total_calories: number | null }[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + (r.total_calories ?? 0), 0);
    const sumMinutes = (rows: { duration_minutes: number | null }[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + (r.duration_minutes ?? 0), 0);
    const sumDrinks = (rows: { quantity_ml: number | null }[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + (r.quantity_ml ?? 0), 0);

    const streakMap: Record<string, { current: number; longest: number }> = {};
    (streaks.data ?? []).forEach((s) => {
      streakMap[s.streak_type] = { current: s.current_count, longest: s.longest_count };
    });

    return success(res, {
      today: {
        food: { meals: foodToday.count ?? 0, calories: sumCalories(foodToday.data) },
        workout: { sessions: workoutToday.count ?? 0, minutes: sumMinutes(workoutToday.data as { duration_minutes: number | null }[] | null) },
        alcohol: { drinks: alcoholToday.count ?? 0, ml: sumDrinks(alcoholToday.data) },
      },
      week: {
        food: { meals: foodWeek.count ?? 0, calories: sumCalories(foodWeek.data) },
        workout: { sessions: workoutWeek.count ?? 0, minutes: sumMinutes(workoutWeek.data as { duration_minutes: number | null }[] | null) },
        alcohol: { drinks: alcoholWeek.count ?? 0, ml: sumDrinks(alcoholWeek.data) },
      },
      streaks: {
        food_log: streakMap.FOOD_LOG?.current ?? 0,
        workout: streakMap.WORKOUT?.current ?? 0,
        alcohol_free: streakMap.ALCOHOL_FREE?.current ?? 0,
        overall: streakMap.OVERALL?.current ?? 0,
      },
      latest_weight: latestWeight.data
        ? { weight_kg: latestWeight.data.weight_kg, body_fat_pct: latestWeight.data.body_fat_pct, logged_at: latestWeight.data.logged_at }
        : null,
    });
  },
});
