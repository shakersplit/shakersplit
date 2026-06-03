/**
 * /api/users/me — self-management endpoint. Dispatches by ?action= for the auxiliary
 * push-subscription management routes; the bare endpoint still handles the original
 * GET/PATCH/DELETE for the user record.
 *
 * Routes:
 *   GET    /api/users/me                                  fetch own user record
 *   GET    /api/users/me?action=push-subscriptions        list devices receiving push
 *   GET    /api/users/me?action=export                    download all my data as JSON
 *   PATCH  /api/users/me                                  update own user record
 *   DELETE /api/users/me                                  delete account
 *   POST   /api/users/me?action=push-subscribe            register a Web Push subscription
 *   POST   /api/users/me?action=push-unsubscribe          remove a Web Push subscription
 *   POST   /api/users/me?action=push-test                 send a test push to all my devices
 *
 * Single file because the Vercel Hobby plan caps deployments at 12 functions.
 */
import { createHandler } from '../_lib/factories/handler.factory';
import { supabaseAdmin } from '../_lib/config/supabase.config';
import { success, error } from '../_lib/utils/response.util';
import { sendPushToUser } from '../_lib/utils/push.util';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default createHandler({
  async GET(req, res, user) {
    const action = req.query.action as string | undefined;
    if (action === 'push-subscriptions') return await listSubscriptions(res, user.id);
    if (action === 'export') return await exportUserData(res, user.id);

    const { data, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'User not found');
    return success(res, data);
  },

  async POST(req, res, user) {
    const action = req.query.action as string | undefined;
    if (action === 'push-subscribe') return await subscribe(req, res, user.id);
    if (action === 'push-unsubscribe') return await unsubscribe(req, res, user.id);
    if (action === 'push-test') return await sendTestPush(res, user.id);
    return error(res, 400, 'VALIDATION_ERROR', `Unsupported action: ${action ?? '(none)'}`);
  },

  async PATCH(req, res, user) {
    const { display_name, avatar_url, height_cm, weight_kg, date_of_birth } = req.body || {};

    const updates: Record<string, unknown> = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (height_cm !== undefined) updates.height_cm = height_cm;
    if (weight_kg !== undefined) updates.weight_kg = weight_kg;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;

    if (Object.keys(updates).length === 0) {
      return error(res, 400, 'VALIDATION_ERROR', 'No fields to update');
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (dbError || !data) return error(res, 500, 'INTERNAL_ERROR', 'Failed to update profile');
    return success(res, data);
  },

  async DELETE(_req, res, user) {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authErr) {
      return error(res, 500, 'INTERNAL_ERROR', `Account deletion failed: ${authErr.message}`);
    }
    await supabaseAdmin.from('users').delete().eq('id', user.id);
    return success(res, { deleted: true });
  },
});

// ── Push helpers ────────────────────────────────────────────────────────────

async function subscribe(req: VercelRequest, res: VercelResponse, userId: string) {
  const { endpoint, keys, user_agent } = (req.body ?? {}) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    user_agent?: string;
  };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return error(res, 400, 'VALIDATION_ERROR', 'endpoint and keys.{p256dh,auth} required');
  }

  // Upsert: same endpoint may already exist if the user reinstalls the PWA on the same device.
  const { data, error: dbErr } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: user_agent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )
    .select()
    .single();

  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, data, 201);
}

async function unsubscribe(req: VercelRequest, res: VercelResponse, userId: string) {
  const { endpoint } = (req.body ?? {}) as { endpoint?: string };
  if (!endpoint) return error(res, 400, 'VALIDATION_ERROR', 'endpoint required');

  const { error: dbErr } = await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userId);
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, { unsubscribed: true });
}

async function listSubscriptions(res: VercelResponse, userId: string) {
  const { data, error: dbErr } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_agent, created_at, last_used_at')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false });
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, data ?? []);
}

async function sendTestPush(res: VercelResponse, userId: string) {
  const sent = await sendPushToUser(userId, {
    title: 'ShakerSplit',
    body: 'Test notification — your device is set up correctly. 🎉',
    url: '/app',
    tag: 'test',
  });
  if (sent === 0) {
    return error(res, 404, 'NOT_FOUND', 'No active push subscriptions for this account.');
  }
  return success(res, { sent });
}

/**
 * Export every row this user owns across every table, packaged as a single JSON object
 * that the browser can download. Streams in parallel and respects RLS by going through
 * supabaseAdmin with explicit user_id scoping.
 */
async function exportUserData(res: VercelResponse, userId: string) {
  const [
    profile,
    foodLogs,
    workoutLogs,
    alcoholLogs,
    weightLogs,
    mentalLogs,
    plans,
    planEntries,
    goals,
    templates,
    streaks,
    friendships,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('food_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
    supabaseAdmin.from('workout_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
    supabaseAdmin.from('alcohol_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
    supabaseAdmin.from('weight_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
    supabaseAdmin.from('mental_health_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
    supabaseAdmin.from('weekly_plans').select('*').eq('user_id', userId).order('week_start_date', { ascending: false }),
    supabaseAdmin.from('plan_entries').select('*, weekly_plans!inner(user_id)').eq('weekly_plans.user_id', userId),
    supabaseAdmin.from('user_goals').select('*').eq('user_id', userId),
    supabaseAdmin.from('workout_templates').select('*').eq('user_id', userId),
    supabaseAdmin.from('activity_streaks').select('*').eq('user_id', userId),
    supabaseAdmin.from('friendships').select('*').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);

  const errs = [profile, foodLogs, workoutLogs, alcoholLogs, weightLogs, mentalLogs, plans, planEntries, goals, templates, streaks, friendships]
    .map((r) => r.error)
    .filter(Boolean);
  if (errs.length > 0) return error(res, 500, 'INTERNAL_ERROR', errs[0]?.message ?? 'Export failed');

  // Strip the joined weekly_plans wrapper from plan_entries — it was only used for the filter.
  const cleanedEntries = (planEntries.data ?? []).map((e: Record<string, unknown>) => {
    const copy = { ...e } as Record<string, unknown>;
    delete copy.weekly_plans;
    return copy;
  });

  const payload = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    user: profile.data ?? null,
    food_logs: foodLogs.data ?? [],
    workout_logs: workoutLogs.data ?? [],
    alcohol_logs: alcoholLogs.data ?? [],
    weight_logs: weightLogs.data ?? [],
    mental_health_logs: mentalLogs.data ?? [],
    weekly_plans: plans.data ?? [],
    plan_entries: cleanedEntries,
    goals: goals.data ?? [],
    workout_templates: templates.data ?? [],
    activity_streaks: streaks.data ?? [],
    friendships: friendships.data ?? [],
    stats: {
      food_logs: foodLogs.data?.length ?? 0,
      workout_logs: workoutLogs.data?.length ?? 0,
      alcohol_logs: alcoholLogs.data?.length ?? 0,
      weight_logs: weightLogs.data?.length ?? 0,
      mental_health_logs: mentalLogs.data?.length ?? 0,
    },
  };

  // Set Content-Disposition so browsers offer it as a download named for the user.
  const today = new Date().toISOString().slice(0, 10);
  const filename = `shakersplit-export-${today}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(JSON.stringify(payload, null, 2));
}
