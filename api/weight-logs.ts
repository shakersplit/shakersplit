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
import { parseWithGemini, respondParseResult } from './_lib/utils/gemini.util';

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
    const { weight_kg, body_fat_pct, notes } = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (weight_kg !== undefined) updates.weight_kg = weight_kg;
    if (body_fat_pct !== undefined) updates.body_fat_pct = body_fat_pct;
    if (notes !== undefined) updates.notes = notes;
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
  "You are a body-metrics-logging assistant. Given a user's plain-English weight description, return a single JSON object matching the schema. Convert lbs/stones to kg. Confidence high if user gave a specific number, low if vague. Return ONLY the JSON.";

async function parseWeightHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';
  const result = await parseWithGemini<ParsedWeightResponse>({
    systemPrompt: WEIGHT_SYSTEM_PROMPT,
    responseSchema: WEIGHT_SCHEMA,
    description,
    postProcess: (raw) => {
      const r = raw as ParsedWeightResponse;
      if ((r.notes as unknown) === '') r.notes = null;
      return r;
    },
  });
  return respondParseResult(res, result);
}
