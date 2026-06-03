/**
 * Alcohol logs — single-file CRUD handler.
 *   GET/POST   /api/alcohol-logs
 *   GET/PUT/DELETE  /api/alcohol-logs?id=:id
 */
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createAlcoholLogSchema } from './_lib/validators/alcohol-log.validator';
import { alcoholLogRepository } from './_lib/repositories/alcohol-log.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const id = req.query.id as string | undefined;
    if (id) {
      const { data, error: dbError } = await alcoholLogRepository.findById(id, user.id);
      if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
      return success(res, data);
    }

    const pagination = parsePagination(req);
    const filters = {
      userId: user.id,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };
    const { data, count, error: dbError } = await alcoholLogRepository.findAll(filters, pagination);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
  },

  async POST(req, res, user) {
    const body = validateBody(req, res, createAlcoholLogSchema);
    if (!body) return;
    const { data, error: dbError } = await alcoholLogRepository.create({
      user_id: user.id,
      logged_at: body.logged_at || new Date().toISOString(),
      spirit_type: body.spirit_type,
      quantity_ml: body.quantity_ml,
      mixer: body.mixer,
      pre_game_meal_eaten: body.pre_game_meal_eaten,
      water_consumed_ml: body.water_consumed_ml,
      intoxication_level: body.intoxication_level,
      hangover_severity: body.hangover_severity,
      notes: body.notes,
    });
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, data, 201);
  },

  async PUT(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const body = validateBody(req, res, createAlcoholLogSchema);
    if (!body) return;
    const { data, error: dbError } = await alcoholLogRepository.update(id, user.id, {
      logged_at: body.logged_at || new Date().toISOString(),
      spirit_type: body.spirit_type,
      quantity_ml: body.quantity_ml,
      mixer: body.mixer,
      pre_game_meal_eaten: body.pre_game_meal_eaten,
      water_consumed_ml: body.water_consumed_ml,
      intoxication_level: body.intoxication_level,
      hangover_severity: body.hangover_severity,
      notes: body.notes,
    });
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { error: dbError } = await alcoholLogRepository.delete(id, user.id);
    if (dbError) return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    return success(res, { deleted: true });
  },
});
