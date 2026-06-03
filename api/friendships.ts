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

    // Find the addressee user by email.
    const { data: target } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', result.data.addressee_email)
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
      .select('id, addressee_id, status')
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
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');

    // Either party can unfriend / cancel.
    const { error: dbErr } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', id)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return success(res, { deleted: true });
  },
});
