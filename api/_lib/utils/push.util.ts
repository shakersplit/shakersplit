import webpush from 'web-push';
import { supabaseAdmin } from '../config/supabase.config';

/**
 * Web Push helper — wraps the web-push library with a thin interface that:
 *   - Configures VAPID once on import
 *   - Looks up active subscriptions for a user
 *   - Sends to all of them in parallel
 *   - Auto-removes subscriptions that return 404/410 (stale endpoints)
 */

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  // VAPID config is read directly from process.env (not via env.config) because env.config's
  // schema doesn't list these — they're optional and only needed for push, not for the app
  // to start.
  const subject = process.env.VAPID_SUBJECT;
  const pub = process.env.VITE_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !pub || !priv) {
    console.warn('VAPID env vars missing — push notifications will be no-op');
    return;
  }
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a notification to every device registered to a user. Stale endpoints (404/410) are
 * cleaned up automatically. Returns the number of subscriptions actually delivered to.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  ensureVapid();
  if (!vapidConfigured) return 0;

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subs || subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  const staleIds: string[] = [];

  const sends = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        json,
      );
      return true;
    } catch (err) {
      // 404 / 410 mean the subscription is dead — purge it.
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(sub.id);
      } else {
        console.error('Push send failed for', sub.id, err);
      }
      return false;
    }
  });

  const results = await Promise.all(sends);

  if (staleIds.length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('id', staleIds);
    if (delErr) console.error('[push] failed to delete stale subscriptions:', delErr);
  }

  // Update last_used_at for successful sends so we can spot inactive devices later.
  const successIds = subs.filter((_, i) => results[i]).map((s) => s.id);
  if (successIds.length > 0) {
    const { error: updErr } = await supabaseAdmin
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', successIds);
    if (updErr) console.error('[push] failed to update last_used_at:', updErr);
  }

  return results.filter(Boolean).length;
}

/**
 * Fan-out: send to multiple users at once. Used by admin broadcast and weekly-recap jobs.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  const results = await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
  return results.reduce((acc, n) => acc + n, 0);
}
