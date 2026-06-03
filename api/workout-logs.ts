/**
 * Workout logs — single-file CRUD handler. Same pattern as food-logs.ts:
 *   GET/POST   /api/workout-logs            → list/create
 *   GET/PUT/DELETE  /api/workout-logs?id=:id  → detail/update/delete
 */
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createWorkoutLogSchema } from './_lib/validators/workout-log.validator';
import { workoutLogRepository } from './_lib/repositories/workout-log.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const id = req.query.id as string | undefined;
    if (id) {
      const { data, error: dbError } = await workoutLogRepository.findById(id, user.id);
      if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Workout log not found');
      return success(res, data);
    }

    const pagination = parsePagination(req);
    const filters = {
      userId: user.id,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      workout_type: req.query.workout_type as string | undefined,
    };
    const { data, count, error: dbError } = await workoutLogRepository.findAll(filters, pagination);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
  },

  async POST(req, res, user) {
    const body = validateBody(req, res, createWorkoutLogSchema);
    if (!body) return;
    const { data, error: dbError } = await workoutLogRepository.create({
      user_id: user.id,
      logged_at: body.logged_at || new Date().toISOString(),
      workout_type: body.workout_type,
      duration_minutes: body.duration_minutes,
      exercises: body.exercises,
      calories_burned: body.calories_burned,
      notes: body.notes,
    });
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, data, 201);
  },

  async PUT(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const body = validateBody(req, res, createWorkoutLogSchema);
    if (!body) return;
    const { data, error: dbError } = await workoutLogRepository.update(id, user.id, {
      logged_at: body.logged_at || new Date().toISOString(),
      workout_type: body.workout_type,
      duration_minutes: body.duration_minutes,
      exercises: body.exercises,
      calories_burned: body.calories_burned,
      notes: body.notes,
    });
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Workout log not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { error: dbError } = await workoutLogRepository.delete(id, user.id);
    if (dbError) return error(res, 404, 'NOT_FOUND', 'Workout log not found');
    return success(res, { deleted: true });
  },
});
