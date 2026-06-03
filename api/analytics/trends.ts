/**
 * Analytics trends — daily-bucketed series for charts.
 */
import { createHandler } from '../_lib/factories/handler.factory';
import { supabaseAdmin } from '../_lib/config/supabase.config';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days)) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    const [foodRows, workoutRows, alcoholRows, weightRows] = await Promise.all([
      supabaseAdmin.from('food_logs').select('logged_at, total_calories').eq('user_id', user.id).gte('logged_at', sinceISO),
      supabaseAdmin.from('workout_logs').select('logged_at, duration_minutes').eq('user_id', user.id).gte('logged_at', sinceISO),
      supabaseAdmin.from('alcohol_logs').select('logged_at, quantity_ml').eq('user_id', user.id).gte('logged_at', sinceISO),
      supabaseAdmin.from('weight_logs').select('logged_at, weight_kg').eq('user_id', user.id).gte('logged_at', sinceISO),
    ]);

    const errs = [foodRows, workoutRows, alcoholRows, weightRows].map((r) => r.error).filter(Boolean);
    if (errs.length > 0) return error(res, 500, 'INTERNAL_ERROR', errs[0]?.message ?? 'Failed to load trends');

    const buckets: Record<string, {
      date: string;
      food_meals: number;
      food_calories: number;
      workout_minutes: number;
      alcohol_drinks: number;
      weight_kg: number | null;
    }> = {};

    const dateKey = (iso: string): string => iso.slice(0, 10);
    const ensure = (date: string) => {
      if (!buckets[date]) {
        buckets[date] = {
          date,
          food_meals: 0,
          food_calories: 0,
          workout_minutes: 0,
          alcohol_drinks: 0,
          weight_kg: null,
        };
      }
      return buckets[date];
    };

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      ensure(d.toISOString().slice(0, 10));
    }

    (foodRows.data ?? []).forEach((r) => {
      const b = ensure(dateKey(r.logged_at));
      b.food_meals += 1;
      b.food_calories += r.total_calories ?? 0;
    });
    (workoutRows.data ?? []).forEach((r) => {
      const b = ensure(dateKey(r.logged_at));
      b.workout_minutes += r.duration_minutes ?? 0;
    });
    (alcoholRows.data ?? []).forEach((r) => {
      const b = ensure(dateKey(r.logged_at));
      b.alcohol_drinks += 1;
    });
    (weightRows.data ?? []).forEach((r) => {
      const b = ensure(dateKey(r.logged_at));
      if (b.weight_kg === null) b.weight_kg = r.weight_kg;
      else b.weight_kg = (b.weight_kg + r.weight_kg) / 2;
    });

    const sortedDays = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
    return success(res, { days: sortedDays });
  },
});
