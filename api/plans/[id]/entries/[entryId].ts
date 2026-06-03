import { createHandler } from '../../../_lib/factories/handler.factory';
import { validateBody } from '../../../_lib/middleware/validate.middleware';
import { updatePlanEntrySchema } from '../../../_lib/validators/plan.validator';
import { planRepository } from '../../../_lib/repositories/plan.repository';
import { success, error } from '../../../_lib/utils/response.util';

export default createHandler({
  async PUT(req, res, user) {
    const entryId = req.query.entryId as string;
    if (!entryId) return error(res, 400, 'VALIDATION_ERROR', 'Missing entry id');

    // Ownership check via parent plan
    const owned = await planRepository.findEntryWithPlanOwner(entryId, user.id);
    if (!owned.data) return error(res, 404, 'NOT_FOUND', 'Entry not found');

    const body = validateBody(req, res, updatePlanEntrySchema);
    if (!body) return;

    const { data, error: dbError } = await planRepository.updateEntry(entryId, body);
    if (dbError || !data) return error(res, 500, 'INTERNAL_ERROR', dbError?.message ?? 'Update failed');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const entryId = req.query.entryId as string;
    if (!entryId) return error(res, 400, 'VALIDATION_ERROR', 'Missing entry id');

    const owned = await planRepository.findEntryWithPlanOwner(entryId, user.id);
    if (!owned.data) return error(res, 404, 'NOT_FOUND', 'Entry not found');

    const { error: dbError } = await planRepository.deleteEntry(entryId);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, { deleted: true });
  },
});
