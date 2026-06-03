import { createHandler } from '../../_lib/factories/handler.factory';
import { validateBody } from '../../_lib/middleware/validate.middleware';
import { createPlanEntrySchema } from '../../_lib/validators/plan.validator';
import { planRepository } from '../../_lib/repositories/plan.repository';
import { success, error } from '../../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');

    const dayOfWeekParam = req.query.day_of_week as string | undefined;
    const category = req.query.category as string | undefined;

    const filters: { day_of_week?: number; category?: string } = {};
    if (dayOfWeekParam !== undefined) filters.day_of_week = Number(dayOfWeekParam);
    if (category) filters.category = category;

    const { data, error: dbError } = await planRepository.findEntries(planId, user.id, filters);
    if (dbError) return error(res, 404, 'NOT_FOUND', dbError.message ?? 'Plan not found');
    return success(res, data ?? []);
  },

  async POST(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');

    const owns = await planRepository.ensurePlanOwnership(planId, user.id);
    if (!owns) return error(res, 404, 'NOT_FOUND', 'Plan not found');

    const body = validateBody(req, res, createPlanEntrySchema);
    if (!body) return;

    const { data, error: dbError } = await planRepository.createEntry(planId, body);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, data, 201);
  },
});
