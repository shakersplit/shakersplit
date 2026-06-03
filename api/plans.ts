import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createPlanSchema } from './_lib/validators/plan.validator';
import { planRepository } from './_lib/repositories/plan.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const pagination = parsePagination(req);
    const isTemplateRaw = req.query.is_template as string | undefined;
    const filters = {
      userId: user.id,
      isTemplate: isTemplateRaw === undefined ? undefined : isTemplateRaw === 'true',
      weekStartDate: req.query.week_start_date as string | undefined,
    };

    const { data, count, error: dbError } = await planRepository.findAll(filters, pagination);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);

    return paginated(res, data ?? [], {
      page: pagination.page,
      limit: pagination.limit,
      total: count ?? 0,
    });
  },

  async POST(req, res, user) {
    const body = validateBody(req, res, createPlanSchema);
    if (!body) return;

    // Idempotent: if a plan for the same week already exists, return it.
    const existing = await planRepository.findByWeek(user.id, body.week_start_date);
    if (existing.data) return success(res, existing.data, 200);

    const { data, error: dbError } = await planRepository.create({
      user_id: user.id,
      week_start_date: body.week_start_date,
      name: body.name,
      is_template: body.is_template ?? false,
    });
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, data, 201);
  },
});
