import { createHandler } from '../_lib/factories/handler.factory';
import { validateBody } from '../_lib/middleware/validate.middleware';
import { createWorkoutLogSchema } from '../_lib/validators/workout-log.validator';
import { workoutLogRepository } from '../_lib/repositories/workout-log.repository';
import { success, error } from '../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const { id } = req.query;
    const { data, error: dbError } = await workoutLogRepository.findById(id as string, user.id);

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'Workout log not found');
    }

    return success(res, data);
  },

  async PUT(req, res, user) {
    const { id } = req.query;
    const body = validateBody(req, res, createWorkoutLogSchema);
    if (!body) return;

    const { data, error: dbError } = await workoutLogRepository.update(id as string, user.id, {
      logged_at: body.logged_at || new Date().toISOString(),
      workout_type: body.workout_type,
      duration_minutes: body.duration_minutes,
      exercises: body.exercises,
      calories_burned: body.calories_burned,
      notes: body.notes,
    });

    if (dbError || !data) {
      return error(res, 404, 'NOT_FOUND', 'Workout log not found');
    }

    return success(res, data);
  },

  async DELETE(req, res, user) {
    const { id } = req.query;
    const { error: dbError } = await workoutLogRepository.delete(id as string, user.id);

    if (dbError) {
      return error(res, 404, 'NOT_FOUND', 'Workout log not found');
    }

    return success(res, { deleted: true });
  },
});
