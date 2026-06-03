import { createHandler } from '../_lib/factories/handler.factory';
import { validateBody } from '../_lib/middleware/validate.middleware';
import { createAlcoholLogSchema } from '../_lib/validators/alcohol-log.validator';
import { alcoholLogRepository } from '../_lib/repositories/alcohol-log.repository';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const { id } = req.query;
    const { data, error: dbError } = await alcoholLogRepository.findById(id as string, user.id);

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    }

    return success(res, data);
  },

  async PUT(req, res, user) {
    const { id } = req.query;
    const body = validateBody(req, res, createAlcoholLogSchema);
    if (!body) return;

    const { data, error: dbError } = await alcoholLogRepository.update(id as string, user.id, {
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

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    }

    return success(res, data);
  },

  async DELETE(req, res, user) {
    const { id } = req.query;
    const { error: dbError } = await alcoholLogRepository.delete(id as string, user.id);

    if (dbError) {
      return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    }

    return success(res, { deleted: true });
  },
});
