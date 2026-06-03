import { createHandler } from '../_lib/factories/handler.factory';
import { validateBody } from '../_lib/middleware/validate.middleware';
import { createFoodLogSchema } from '../_lib/validators/food-log.validator';
import { foodLogRepository } from '../_lib/repositories/food-log.repository';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const { id } = req.query;

    const { data, error: dbError } = await foodLogRepository.findById(id as string, user.id);

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'Food log not found');
    }

    return success(res, data);
  },

  async PUT(req, res, user) {
    const { id } = req.query;
    const body = validateBody(req, res, createFoodLogSchema);
    if (!body) return;

    const { data, error: dbError } = await foodLogRepository.update(id as string, user.id, {
      logged_at: body.logged_at || new Date().toISOString(),
      meal_type: body.meal_type,
      food_items: body.food_items,
      total_calories: body.total_calories,
      total_protein_g: body.total_protein_g,
      photo_url: body.photo_url,
      notes: body.notes,
    });

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'Food log not found');
    }

    return success(res, data);
  },

  async DELETE(req, res, user) {
    const { id } = req.query;

    const { error: dbError } = await foodLogRepository.delete(id as string, user.id);

    if (dbError) {
      return error(res, 404, 'NOT_FOUND', 'Food log not found');
    }

    return success(res, { deleted: true });
  },
});
