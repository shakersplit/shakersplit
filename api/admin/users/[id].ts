import { createHandler } from '../../_lib/factories/handler.factory';
import { requireAdmin } from '../../_lib/middleware/auth.middleware';
import { supabaseAdmin } from '../../_lib/config/supabase.config';
import { success, error } from '../../_lib/utils/response.util';

/**
 * Admin-only single-user endpoints:
 *   PATCH /api/admin/users/:id  — change role between USER/ADMIN
 *   DELETE /api/admin/users/:id — hard-delete the user (cascades to all their data)
 *
 * Self-protection: an admin cannot demote or delete themselves to avoid lockout.
 */
export default createHandler({
  async PATCH(req, res) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const targetId = req.query.id as string;
    if (!targetId) return error(res, 400, 'VALIDATION_ERROR', 'Missing user id');

    if (targetId === admin.id) {
      return error(res, 400, 'VALIDATION_ERROR', "You can't modify your own admin role.");
    }

    const { role, display_name } = (req.body ?? {}) as { role?: string; display_name?: string };
    const updates: Record<string, unknown> = {};
    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role)) {
        return error(res, 400, 'VALIDATION_ERROR', 'role must be USER or ADMIN');
      }
      updates.role = role;
    }
    if (display_name !== undefined) updates.display_name = display_name;

    if (Object.keys(updates).length === 0) {
      return error(res, 400, 'VALIDATION_ERROR', 'No fields to update');
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();
    if (dbError || !data) return error(res, 500, 'INTERNAL_ERROR', dbError?.message ?? 'Update failed');
    return success(res, data);
  },

  async DELETE(req, res) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const targetId = req.query.id as string;
    if (!targetId) return error(res, 400, 'VALIDATION_ERROR', 'Missing user id');

    if (targetId === admin.id) {
      return error(res, 400, 'VALIDATION_ERROR', "You can't delete your own account from the admin panel. Use Profile → Delete account instead, which prompts confirmation.");
    }

    // Two-step delete: auth.users (cascades to public.users via the FK chain) AND we explicitly
    // call admin.deleteUser so the JWT / refresh tokens are also revoked.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (authErr) return error(res, 500, 'INTERNAL_ERROR', `Auth delete failed: ${authErr.message}`);

    // public.users has ON DELETE CASCADE on the auth user, but to be safe with the trigger flow:
    await supabaseAdmin.from('users').delete().eq('id', targetId);

    return success(res, { deleted: true });
  },
});
