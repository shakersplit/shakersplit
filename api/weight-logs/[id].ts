import { createHandler } from '../_lib/factories/handler.factory';
import { weightLogRepository } from '../_lib/repositories/weight-log.repository';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async DELETE(req, res, user) {
    const id = req.query.id as string;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id');

    const { error: dbError } = await weightLogRepository.delete(id, user.id);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, { deleted: true });
  },

  async PATCH(req, res, user) {
    const id = req.query.id as string;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id');

    const { weight_kg, body_fat_pct, notes } = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (weight_kg !== undefined) updates.weight_kg = weight_kg;
    if (body_fat_pct !== undefined) updates.body_fat_pct = body_fat_pct;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return error(res, 400, 'VALIDATION_ERROR', 'No fields to update');
    }

    const { data, error: dbError } = await weightLogRepository.update(id, user.id, updates);
    if (dbError || !data) return error(res, 500, 'INTERNAL_ERROR', dbError?.message ?? 'Update failed');
    return success(res, data);
  },
});
