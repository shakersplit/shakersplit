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
import { parseWithGemini, respondParseResult, makeShapeValidator } from './_lib/utils/gemini.util';

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
      share_with_friends: body.share_with_friends ?? false,
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
      share_with_friends: body.share_with_friends ?? false,
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
          sets: { type: 'number', description: 'Number of sets if a strength exercise. REQUIRED for any strength exercise (bench, squat, row, etc.).' },
          reps: { type: 'number', description: 'Reps per set if known. REQUIRED for any strength exercise. For "4x8" -> sets:4, reps:8. NEVER drop reps when the user gave them.' },
          weight_kg: { type: 'number', description: 'Weight in kg if user mentioned it. For bodyweight exercises (pull-ups, dips, push-ups), OMIT this field entirely instead of using 0.' },
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
  "You are a fitness-logging assistant. Given a user's plain-English workout description, return a single JSON object matching the schema. " +
  "PRESERVE EVERY NUMBER the user gave — if they said 'bench 4x8 @ 80kg', return sets:4 AND reps:8 AND weight_kg:80, NEVER drop reps. " +
  "For 'deadlift 3x5' -> sets:3, reps:5. For 'pull-ups 4x10' (bodyweight) -> sets:4, reps:10, omit weight_kg entirely (do NOT set 0). " +
  "BODYWEIGHT-ONLY SESSIONS: framing the workout as 'bodyweight' or 'calisthenics' does NOT exempt you from the per-exercise rules above. " +
  "Example: 'bodyweight workout, 3x10 push-ups, 3x10 pull-ups, 3x12 squats, 30 min' -> " +
  "exercises:[{name:'Push-up', sets:3, reps:10}, {name:'Pull-up', sets:3, reps:10}, {name:'Squat', sets:3, reps:12}], duration_minutes:30. " +
  "Notice: every exercise has reps populated, and weight_kg is OMITTED (not set to 0) on every entry. " +
  "For runs, include distance_km and infer duration from pace if given. Estimate duration from context if not stated. " +
  "Always include at least one exercise. Return ONLY the JSON.";

async function parseWorkoutHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';
  const result = await parseWithGemini<ParsedWorkoutResponse>({
    systemPrompt: WORKOUT_SYSTEM_PROMPT,
    responseSchema: WORKOUT_SCHEMA,
    description,
    validate: makeShapeValidator({
      required: ['workout_type', 'duration_minutes', 'exercises', 'confidence'],
      types: { workout_type: 'string', duration_minutes: 'number', exercises: 'array', confidence: 'string' },
    }),
    postProcess: (raw) => {
      const r = raw as ParsedWorkoutResponse;
      if ((r.notes as unknown) === '') r.notes = null;
      // Belt-and-suspenders: strip weight_kg=0 (model still leaks zero on calisthenics-only
      // sessions despite the prompt examples) AND attempt to recover dropped reps from the
      // user's raw input. If the user wrote "3x10 push-ups" but the model only returned
      // sets:3, look for the matching "<sets>x<reps>" pattern in the description and fill
      // in reps so we don't lose user data.
      if (Array.isArray(r.exercises)) {
        r.exercises = r.exercises.map((ex) => {
          const cleaned: typeof ex = { ...ex };
          if (cleaned.weight_kg !== undefined && cleaned.weight_kg <= 0) delete cleaned.weight_kg;
          // Try to recover dropped reps from the original description.
          if (cleaned.sets !== undefined && cleaned.reps === undefined) {
            const pattern = new RegExp(`${cleaned.sets}\\s*x\\s*(\\d+)`, 'i');
            const m = description.match(pattern);
            if (m) cleaned.reps = Number(m[1]);
          }
          return cleaned;
        });
      }
      return r;
    },
  });
  return respondParseResult(res, result);
}
