/**
 * Plans detail —
 *   GET    /api/plans/:id    detail (with entries inline)
 *   PUT    /api/plans/:id    update name/is_template
 *   DELETE /api/plans/:id    delete plan + cascade entries
 */
import { createHandler } from '../_lib/factories/handler.factory';
import { validateBody } from '../_lib/middleware/validate.middleware';
import { updatePlanSchema } from '../_lib/validators/plan.validator';
import { planRepository } from '../_lib/repositories/plan.repository';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const id = req.query.id as string;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');
    const { data, error: dbErr } = await planRepository.findByIdWithEntries(id, user.id);
    if (dbErr || !data) return error(res, 404, 'NOT_FOUND', 'Plan not found');
    return success(res, data);
  },

  async PUT(req, res, user) {
    const id = req.query.id as string;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');
    const body = validateBody(req, res, updatePlanSchema);
    if (!body) return;
    const { data, error: dbErr } = await planRepository.update(id, user.id, body);
    if (dbErr || !data) return error(res, 404, 'NOT_FOUND', 'Plan not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');
    const { error: dbErr } = await planRepository.delete(id, user.id);
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return success(res, { deleted: true });
  },
});
