/**
 * Workout logs — single-file CRUD handler with AI parser.
 *   GET/POST   /api/workout-logs                       list / create
 *   GET/PUT/DELETE  /api/workout-logs?id=:id            detail / update / delete
 *   POST       /api/workout-logs?action=parse-ai        parse plain-English description
 *
 * AI parser uses the shared parseWithGemini helper (api/_lib/utils/gemini.util.ts).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createWorkoutLogSchema } from './_lib/validators/workout-log.validator';
import { workoutLogRepository } from './_lib/repositories/workout-log.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';
import { parseWithGemini, respondParseResult } from './_lib/utils/gemini.util';

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
    if (req.query.action === 'parse-ai') return parseWorkoutHandler(req, res);

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

// ── AI parser ───────────────────────────────────────────────────────────────

interface ParsedWorkoutResponse {
  workout_type:
    | 'GYM_PUSH' | 'GYM_PULL' | 'GYM_LEGS' | 'GYM_UPPER' | 'GYM_LOWER' | 'GYM_FULL'
    | 'RUN' | 'WALK' | 'SPORT' | 'OTHER';
  duration_minutes: number;
  exercises: { name: string; sets?: number; reps?: number; weight_kg?: number; distance_km?: number }[];
  calories_burned?: number;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const WORKOUT_SCHEMA = {
  type: 'object',
  properties: {
    workout_type: {
      type: 'string',
      enum: ['GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_UPPER', 'GYM_LOWER', 'GYM_FULL', 'RUN', 'WALK', 'SPORT', 'OTHER'],
      description:
        'Best inference. Push = chest/shoulders/triceps. Pull = back/biceps. Legs = quads/hamstrings/glutes. Upper = full upper body. Lower = full lower. Full = full body. Run/Walk for cardio with distance. Sport for tennis/football/etc. Default OTHER if unsure.',
    },
    duration_minutes: { type: 'number', description: 'Estimate from context — typical gym session 45-75 min, run depends on distance. If user says explicit time, use it.' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Exercise name, capitalized. e.g. "Bench Press", "Pull-up", "5K run".' },
          sets: { type: 'number', description: 'Number of sets if a strength exercise.' },
          reps: { type: 'number', description: 'Reps per set if known.' },
          weight_kg: { type: 'number', description: 'Weight in kg if user mentioned it.' },
          distance_km: { type: 'number', description: 'Distance in km for running/walking. Convert miles to km if needed.' },
        },
        required: ['name'],
      },
    },
    calories_burned: { type: 'number', description: 'Optional. Rough estimate based on duration + intensity (running ~10 cal/min, gym ~5-7 cal/min).' },
    notes: { type: 'string', description: "Anything that doesn't fit elsewhere (how it felt, location, partner). Empty string if nothing relevant." },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['workout_type', 'duration_minutes', 'exercises', 'confidence'],
} as const;

const WORKOUT_SYSTEM_PROMPT =
  "You are a fitness-logging assistant. Given a user's plain-English workout description, return a single JSON object matching the schema. Parse exercises with their sets/reps/weight when provided (e.g. 'bench 4x8 @ 80kg' -> sets:4, reps:8, weight_kg:80). For runs, include distance_km. Estimate duration from context if not given. Always include at least one exercise. Return ONLY the JSON.";

async function parseWorkoutHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';
  const result = await parseWithGemini<ParsedWorkoutResponse>({
    systemPrompt: WORKOUT_SYSTEM_PROMPT,
    responseSchema: WORKOUT_SCHEMA,
    description,
    postProcess: (raw) => {
      const r = raw as ParsedWorkoutResponse;
      if ((r.notes as unknown) === '') r.notes = null;
      return r;
    },
  });
  return respondParseResult(res, result);
}
