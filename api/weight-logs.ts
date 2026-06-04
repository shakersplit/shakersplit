/**
 * Weight logs — single-file CRUD handler with AI parser.
 *   GET/POST   /api/weight-logs
 *   PATCH/DELETE  /api/weight-logs?id=:id
 *   POST       /api/weight-logs?action=parse-ai
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createWeightLogSchema } from './_lib/validators/weight-log.validator';
import { weightLogRepository } from './_lib/repositories/weight-log.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';
import { parseWithGemini, respondParseResult, makeShapeValidator } from './_lib/utils/gemini.util';

export default createHandler({
  async GET(req, res, user) {
    const pagination = parsePagination(req);
    const filters = {
      userId: user.id,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };
    const { data, count, error: dbError } = await weightLogRepository.findAll(filters, pagination);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
  },

  async POST(req, res, user) {
    if (req.query.action === 'parse-ai') return parseWeightHandler(req, res);

    const body = validateBody(req, res, createWeightLogSchema);
    if (!body) return;
    const { data, error: dbError } = await weightLogRepository.create({
      user_id: user.id,
      logged_at: body.logged_at || new Date().toISOString(),
      weight_kg: body.weight_kg,
      body_fat_pct: body.body_fat_pct,
      notes: body.notes,
      share_with_friends: body.share_with_friends ?? false,
    });
    if (dbError) {
      if (dbError.code === '23505') {
        return error(res, 409, 'CONFLICT', 'A weight entry already exists for this date. Edit it instead.');
      }
      return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    }
    return success(res, data, 201);
  },

  async PATCH(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { weight_kg, body_fat_pct, notes, share_with_friends } = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (weight_kg !== undefined) updates.weight_kg = weight_kg;
    if (body_fat_pct !== undefined) updates.body_fat_pct = body_fat_pct;
    if (notes !== undefined) updates.notes = notes;
    if (share_with_friends !== undefined) updates.share_with_friends = !!share_with_friends;
    if (Object.keys(updates).length === 0) {
      return error(res, 400, 'VALIDATION_ERROR', 'No fields to update');
    }
    const { data, error: dbError } = await weightLogRepository.update(id, user.id, updates);
    if (dbError || !data) return error(res, 500, 'INTERNAL_ERROR', dbError?.message ?? 'Update failed');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { error: dbError } = await weightLogRepository.delete(id, user.id);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, { deleted: true });
  },
});

// ── AI parser ───────────────────────────────────────────────────────────────

interface ParsedWeightResponse {
  weight_kg: number;
  body_fat_pct?: number;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const WEIGHT_SCHEMA = {
  type: 'object',
  properties: {
    weight_kg: {
      type: 'number',
      description: 'Weight in kg. Convert from lbs (1 lb = 0.453592 kg) if needed. Reject anything outside 20-500.',
    },
    body_fat_pct: { type: 'number', description: 'Body fat percentage 0-100 if mentioned.' },
    notes: { type: 'string', description: "Time of day (morning/evening), context. Empty string if nothing relevant." },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['weight_kg', 'confidence'],
} as const;

const WEIGHT_SYSTEM_PROMPT =
  "You are a body-metrics-logging assistant. Given a user's plain-English weight description, return a single JSON object matching the schema. " +
  "Convert lbs/stones to kg (1 lb = 0.453592 kg, 1 stone = 6.35029 kg). " +
  "Confidence high ONLY when the user gave both a number AND an explicit unit AND no hedging language. " +
  "If the unit is missing (e.g. 'weighed in at 82.1'), default to kg but set confidence='medium' to flag the ambiguity. " +
  "If the user used HEDGED numeric phrasing — words like 'maybe', 'like', 'around', 'roughly', 'about', 'I think', 'or so' — set confidence='low' even if a number is present. " +
  "If the user gave a vague phrase with no number ('a bit lighter today'), also set confidence='low'. " +
  "Return ONLY the JSON.";

// Words that should drag confidence down to 'low' even if a number was given. Used as a
// belt-and-suspenders postProcess check because the model occasionally still picks 'medium'
// for hedged inputs.
const HEDGE_WORDS = ['maybe', 'like ', 'around', 'roughly', 'about', 'i think', 'or so', 'kinda', 'sorta'];

async function parseWeightHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';
  const result = await parseWithGemini<ParsedWeightResponse>({
    systemPrompt: WEIGHT_SYSTEM_PROMPT,
    responseSchema: WEIGHT_SCHEMA,
    description,
    validate: makeShapeValidator({
      required: ['weight_kg', 'confidence'],
      types: { weight_kg: 'number', confidence: 'string' },
    }),
    postProcess: (raw) => {
      const r = raw as ParsedWeightResponse;
      if ((r.notes as unknown) === '') r.notes = null;
      // If the user used hedged phrasing, force confidence down. The model sometimes still
      // picks 'medium' for "like 75 maybe" — always low here.
      const lower = description.toLowerCase();
      if (HEDGE_WORDS.some((word) => lower.includes(word))) {
        r.confidence = 'low';
      }
      return r;
    },
  });
  return respondParseResult(res, result);
}
