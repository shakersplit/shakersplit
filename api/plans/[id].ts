import { createHandler } from '../_lib/factories/handler.factory';
import { validateBody } from '../_lib/middleware/validate.middleware';
import { updatePlanSchema } from '../_lib/validators/plan.validator';
import { planRepository } from '../_lib/repositories/plan.repository';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');

    const { data, error: dbError } = await planRepository.findByIdWithEntries(planId, user.id);
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Plan not found');
    return success(res, data);
  },

  async PUT(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');

    const body = validateBody(req, res, updatePlanSchema);
    if (!body) return;

    const { data, error: dbError } = await planRepository.update(planId, user.id, body);
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Plan not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');

    const { error: dbError } = await planRepository.delete(planId, user.id);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, { deleted: true });
  },
});
