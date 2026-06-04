/**
 * Friendships — bidirectional friend connections.
 *   GET    /api/friendships                            list current user's friendships (any status)
 *   POST   /api/friendships                            create a request   { addressee_email }
 *   PATCH  /api/friendships?id=:id                     accept or decline  { status: 'ACCEPTED' | 'DECLINED' }
 *   DELETE /api/friendships?id=:id                     remove (unfriend or cancel)
 *
 * Single file with query-param dispatch (Hobby plan limit). The DB schema enforces
 * UNIQUE(requester_id, addressee_id) so duplicate requests are rejected at insert time.
 */
import { createHandler } from './_lib/factories/handler.factory';
import { supabaseAdmin } from './_lib/config/supabase.config';
import { success, error } from './_lib/utils/response.util';
import { sendPushToUser } from './_lib/utils/push.util';
import { z } from 'zod';

const requestSchema = z.object({
  addressee_email: z.string().email().toLowerCase(),
});

const decisionSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export default createHandler({
  async GET(_req, res, user) {
    // Return all friendships involving this user, with the other party's profile inlined.
    const { data, error: dbErr } = await supabaseAdmin
      .from('friendships')
      .select(`
        id, status, created_at,
        requester:requester_id ( id, email, display_name, avatar_url ),
        addressee:addressee_id ( id, email, display_name, avatar_url )
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);

    // Annotate "direction" so the client knows whether the current user is the asker or askee.
    const enriched = (data ?? []).map((f) => ({
      id: f.id,
      status: f.status,
      created_at: f.created_at,
      // @ts-expect-error supabase joined-relation typing
      direction: f.requester?.id === user.id ? 'outgoing' : 'incoming',
      // @ts-expect-error
      other_user: f.requester?.id === user.id ? f.addressee : f.requester,
    }));

    return success(res, enriched);
  },

  async POST(req, res, user) {
    const result = requestSchema.safeParse(req.body);
    if (!result.success) {
      return error(res, 400, 'VALIDATION_ERROR', 'addressee_email required');
    }

    // Find the addressee user by email. Use ilike for case-insensitive matching since
    // some users may have signed up with mixed-case emails before Supabase Auth's
    // normalization landed.
    const { data: target } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .ilike('email', result.data.addressee_email)
      .maybeSingle();

    if (!target) {
      // Don't leak existence — pretend it succeeded so a malicious user can't enumerate accounts.
      return success(res, { sent: true });
    }
    if (target.id === user.id) {
      return error(res, 400, 'VALIDATION_ERROR', "You can't friend yourself.");
    }

    // Check for existing friendship in either direction.
    const { data: existing } = await supabaseAdmin
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'ACCEPTED') return error(res, 409, 'CONFLICT', 'Already friends.');
      if (existing.status === 'PENDING') return error(res, 409, 'CONFLICT', 'A request already exists.');
      // DECLINED — allow re-request by deleting the old one first.
      await supabaseAdmin.from('friendships').delete().eq('id', existing.id);
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: target.id, status: 'PENDING' })
      .select()
      .single();
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);

    // Fire-and-forget push to the addressee. We don't await the send so a slow push
    // service can't delay the API response. Wrap in an async IIFE because Supabase's
    // query builder returns a PromiseLike (not a Promise), so .then(...).catch(...) chaining
    // doesn't compile under strict TS — we use try/catch in an async function instead.
    void (async () => {
      try {
        const { data: requester } = await supabaseAdmin
          .from('users')
          .select('display_name, email')
          .eq('id', user.id)
          .single();
        const requesterName =
          requester?.display_name || requester?.email?.split('@')[0] || 'Someone';
        await sendPushToUser(target.id, {
          title: 'New friend request',
          body: `${requesterName} wants to be friends.`,
          url: '/app/friends',
          tag: `friend-req-${data.id}`,
        });
      } catch (e) {
        console.error('friend-request push failed:', e);
      }
    })();

    return success(res, data, 201);
  },

  async PATCH(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');

    const result = decisionSchema.safeParse(req.body);
    if (!result.success) return error(res, 400, 'VALIDATION_ERROR', 'status must be ACCEPTED or DECLINED');

    // Only the addressee can accept/decline.
    const { data: existing } = await supabaseAdmin
      .from('friendships')
      .select('id, addressee_id, requester_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return error(res, 404, 'NOT_FOUND', 'Friendship not found');
    if (existing.addressee_id !== user.id) return error(res, 403, 'FORBIDDEN', 'Only the addressee can act on this request.');
    if (existing.status !== 'PENDING') return error(res, 409, 'CONFLICT', `Already ${existing.status}.`);

    const { data, error: dbErr } = await supabaseAdmin
      .from('friendships')
      .update({ status: result.data.status })
      .eq('id', id)
      .select()
      .single();
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);

    // Notify the requester that their request was accepted (ignore declines — quieter UX).
    if (result.data.status === 'ACCEPTED') {
      void (async () => {
        try {
          const { data: accepter } = await supabaseAdmin
            .from('users')
            .select('display_name, email')
            .eq('id', user.id)
            .single();
          const accepterName =
            accepter?.display_name || accepter?.email?.split('@')[0] || 'Someone';
          // existing.requester_id = the user who originally sent the request.
          const requesterId = (existing as { requester_id?: string }).requester_id;
          if (!requesterId) return;
          await sendPushToUser(requesterId, {
            title: 'Friend request accepted',
            body: `${accepterName} accepted your friend request. 🎉`,
            url: '/app/friends',
            tag: `friend-acc-${id}`,
          });
        } catch (e) {
          console.error('friend-accept push failed:', e);
        }
      })();
    }

    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');

    // Either party can unfriend / cancel. We must verify ownership BEFORE deleting because
    // PostgREST's DELETE doesn't reliably honor an `.or()` filter chained after `.eq('id')`.
    // Without this fetch, any authenticated user could delete any friendship by knowing its ID.
    const { data: existing } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return error(res, 404, 'NOT_FOUND', 'Friendship not found');
    if (existing.requester_id !== user.id && existing.addressee_id !== user.id) {
      return error(res, 403, 'FORBIDDEN', "You can't modify this friendship.");
    }

    const { error: dbErr } = await supabaseAdmin.from('friendships').delete().eq('id', id);
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return success(res, { deleted: true });
  },
});
