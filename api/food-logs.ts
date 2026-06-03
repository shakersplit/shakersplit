/**
 * Food logs — single-file CRUD handler with AI parser. Dispatches on req.query.id and ?action=:
 *   GET    /api/food-logs                       list (paginated, filterable)
 *   POST   /api/food-logs                       create
 *   GET    /api/food-logs?id=:id                detail
 *   PUT    /api/food-logs?id=:id                update
 *   DELETE /api/food-logs?id=:id                delete
 *   POST   /api/food-logs?action=parse-ai       AI: parse plain-English description into structured items + macros
 *
 * Single file because Vercel Hobby plan limits us to 12 serverless functions total.
 *
 * AI parser calls Gemini's REST API directly (not the @google/generative-ai SDK) so it works
 * with both legacy AIzaSy* keys AND the newer AQ.Ab* short-lived keys from AI Studio. Uses
 * gemini-flash-latest with a strict response schema for reliable JSON output. Set
 * GEMINI_API_KEY to enable; without it the endpoint returns 503 gracefully and the form
 * falls back to manual entry.
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
    if (req.query.action === 'parse-ai') return parseAIHandler(req, res);

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
      share_with_friends: body.share_with_friends ?? false,
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
      share_with_friends: body.share_with_friends ?? false,
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

// ── AI parser ───────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseWithGemini, respondParseResult } from './_lib/utils/gemini.util';

interface ParsedFoodResponse {
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'PRE_GAME';
  items: { name: string; quantity: string; calories?: number; protein_g?: number }[];
  total_calories: number;
  total_protein_g: number;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/** Strict JSON schema. Properties match food_logs columns so the frontend can drop the result straight into the form. */
const FOOD_SCHEMA = {
  type: 'object',
  properties: {
    meal_type: {
      type: 'string',
      enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_GAME'],
      description:
        'Best inference from time-of-day language (morning -> BREAKFAST, midday -> LUNCH, evening -> DINNER, between -> SNACK, before-night-out -> PRE_GAME). Default to SNACK if unclear.',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Food/dish name, capitalized.' },
          quantity: { type: 'string', description: 'Human-readable amount: "1 cup", "200g", "2 slices".' },
          calories: { type: 'number', description: 'Estimated kcal for THIS item.' },
          protein_g: { type: 'number', description: 'Estimated protein grams for THIS item.' },
        },
        required: ['name', 'quantity'],
      },
    },
    total_calories: { type: 'number' },
    total_protein_g: { type: 'number' },
    notes: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['meal_type', 'items', 'total_calories', 'total_protein_g', 'confidence'],
} as const;

const FOOD_SYSTEM_PROMPT =
  "You are a nutrition-logging assistant. Given a user's plain-English meal description, return a single JSON object matching the schema. Use round numbers for calories and protein. If the user gives specific quantities (e.g. \"200g chicken\"), use them; otherwise estimate based on standard restaurant/home portion sizes. Always include at least one item. Return ONLY the JSON, no prose.";

async function parseAIHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';

  const result = await parseWithGemini<ParsedFoodResponse>({
    systemPrompt: FOOD_SYSTEM_PROMPT,
    responseSchema: FOOD_SCHEMA,
    description,
    postProcess: (raw) => {
      const r = raw as ParsedFoodResponse;
      // Empty-string notes -> null so the frontend can use truthy checks.
      if ((r.notes as unknown) === '') r.notes = null;
      return r;
    },
  });

  return respondParseResult(res, result);
}
