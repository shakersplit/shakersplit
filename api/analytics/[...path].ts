/**
 * Analytics catch-all — /api/analytics/dashboard, /api/analytics/trends.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/middleware/cors.middleware';
import { verifyAuth } from '../_lib/middleware/auth.middleware';
import { supabaseAdmin } from '../_lib/config/supabase.config';
import { success, error } from '../_lib/utils/response.util';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const user = await verifyAuth(req, res);
  if (!user) return;

  const rawPath = req.query.path;
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const method = req.method?.toUpperCase();

  if (method !== 'GET') return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`);

  try {
    if (segments.length === 1 && segments[0] === 'dashboard') return await dashboardHandler(req, res, user.id);
    if (segments.length === 1 && segments[0] === 'trends') return await trendsHandler(req, res, user.id);
    return error(res, 404, 'NOT_FOUND', `No analytics route for /${segments.join('/')}`);
  } catch (err) {
    console.error('Unhandled /api/analytics/* error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}

async function dashboardHandler(_req: VercelRequest, res: VercelResponse, userId: string) {
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
    supabaseAdmin.from('food_logs').select('total_calories', { count: 'exact' }).eq('user_id', userId).gte('logged_at', todayISO),
    supabaseAdmin.from('food_logs').select('total_calories, logged_at', { count: 'exact' }).eq('user_id', userId).gte('logged_at', weekStartISO),
    supabaseAdmin.from('workout_logs').select('duration_minutes, calories_burned', { count: 'exact' }).eq('user_id', userId).gte('logged_at', todayISO),
    supabaseAdmin.from('workout_logs').select('duration_minutes, calories_burned, logged_at', { count: 'exact' }).eq('user_id', userId).gte('logged_at', weekStartISO),
    supabaseAdmin.from('alcohol_logs').select('quantity_ml', { count: 'exact' }).eq('user_id', userId).gte('logged_at', todayISO),
    supabaseAdmin.from('alcohol_logs').select('quantity_ml, logged_at', { count: 'exact' }).eq('user_id', userId).gte('logged_at', weekStartISO),
    supabaseAdmin.from('activity_streaks').select('streak_type, current_count, longest_count, last_logged_at').eq('user_id', userId),
    supabaseAdmin.from('weight_logs').select('weight_kg, body_fat_pct, logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
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
}

async function trendsHandler(req: VercelRequest, res: VercelResponse, userId: string) {
  const days = Math.min(90, Math.max(7, parseInt(String(req.query.days)) || 30));
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [foodRows, workoutRows, alcoholRows, weightRows] = await Promise.all([
    supabaseAdmin.from('food_logs').select('logged_at, total_calories').eq('user_id', userId).gte('logged_at', sinceISO),
    supabaseAdmin.from('workout_logs').select('logged_at, duration_minutes').eq('user_id', userId).gte('logged_at', sinceISO),
    supabaseAdmin.from('alcohol_logs').select('logged_at, quantity_ml').eq('user_id', userId).gte('logged_at', sinceISO),
    supabaseAdmin.from('weight_logs').select('logged_at, weight_kg').eq('user_id', userId).gte('logged_at', sinceISO),
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
}
