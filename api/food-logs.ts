/**
 * Food logs — single-file CRUD handler. Dispatches on req.query.id presence:
 *   GET    /api/food-logs              → list (paginated, filterable)
 *   POST   /api/food-logs              → create
 *   GET    /api/food-logs?id=:id       → detail
 *   PUT    /api/food-logs?id=:id       → update
 *   DELETE /api/food-logs?id=:id       → delete
 *
 * Single file because Vercel Hobby plan limits us to 12 serverless functions total.
 */
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createFoodLogSchema } from './_lib/validators/food-log.validator';
import { foodLogRepository } from './_lib/repositories/food-log.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const id = req.query.id as string | undefined;
    if (id) {
      const { data, error: dbError } = await foodLogRepository.findById(id, user.id);
      if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Food log not found');
      return success(res, data);
    }

    const pagination = parsePagination(req);
    const filters = {
      userId: user.id,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      meal_type: req.query.meal_type as string | undefined,
    };
    const { data, count, error: dbError } = await foodLogRepository.findAll(filters, pagination);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
  },

  async POST(req, res, user) {
    const body = validateBody(req, res, createFoodLogSchema);
    if (!body) return;
    const { data, error: dbError } = await foodLogRepository.create({
      user_id: user.id,
      logged_at: body.logged_at || new Date().toISOString(),
      meal_type: body.meal_type,
      food_items: body.food_items,
      total_calories: body.total_calories,
      total_protein_g: body.total_protein_g,
      photo_url: body.photo_url,
      notes: body.notes,
    });
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, data, 201);
  },

  async PUT(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const body = validateBody(req, res, createFoodLogSchema);
    if (!body) return;
    const { data, error: dbError } = await foodLogRepository.update(id, user.id, {
      logged_at: body.logged_at || new Date().toISOString(),
      meal_type: body.meal_type,
      food_items: body.food_items,
      total_calories: body.total_calories,
      total_protein_g: body.total_protein_g,
      photo_url: body.photo_url,
      notes: body.notes,
    });
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Food log not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { error: dbError } = await foodLogRepository.delete(id, user.id);
    if (dbError) return error(res, 404, 'NOT_FOUND', 'Food log not found');
    return success(res, { deleted: true });
  },
});
