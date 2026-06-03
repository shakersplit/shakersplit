import { createHandler } from '../../_lib/factories/handler.factory';
import { supabaseAdmin } from '../../_lib/config/supabase.config';
import { success, error } from '../../_lib/utils/response.util';

export default createHandler({
  async GET(_req, res, user) {
    const { data, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'User not found');
    }

    return success(res, data);
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

    if (dbError || !data) {
      return error(res, 500, 'INTERNAL_ERROR', 'Failed to update profile');
    }

    return success(res, data);
  },
});
