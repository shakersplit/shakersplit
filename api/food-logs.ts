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
 * AI parser uses Google's Gemini Flash via the @google/generative-ai SDK. Gemini's free tier
 * (15 RPM, 1M tokens/day, no card required) is more than enough for 80 users averaging a
 * handful of parses per day. Set GEMINI_API_KEY to enable; without it the endpoint returns
 * 503 gracefully and the form falls back to manual entry.
 */
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
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

let genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

interface ParsedFoodItem {
  name: string;
  quantity: string;
  calories?: number;
  protein_g?: number;
}

interface ParsedFoodResponse {
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'PRE_GAME';
  items: ParsedFoodItem[];
  total_calories: number;
  total_protein_g: number;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Gemini's structured output schema. Same shape we want back as JSON; using SchemaType.OBJECT
 * with strict properties forces the model to return well-formed JSON we can parse without
 * brittle prose-extraction logic.
 */
const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    meal_type: {
      type: SchemaType.STRING,
      enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_GAME'],
      description:
        "Best inference from time-of-day language (morning -> BREAKFAST, midday -> LUNCH, evening -> DINNER, between -> SNACK, before-night-out -> PRE_GAME). Default to SNACK if unclear.",
    },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: 'Food/dish name, capitalized.' },
          quantity: { type: SchemaType.STRING, description: 'Human-readable amount: "1 cup", "200g", "2 slices".' },
          calories: { type: SchemaType.NUMBER, description: 'Estimated kcal for THIS item.' },
          protein_g: { type: SchemaType.NUMBER, description: 'Estimated protein grams for THIS item.' },
        },
        required: ['name', 'quantity'],
      },
    },
    total_calories: { type: SchemaType.NUMBER, description: 'Sum of per-item calorie estimates.' },
    total_protein_g: { type: SchemaType.NUMBER, description: 'Sum of per-item protein estimates.' },
    notes: { type: SchemaType.STRING, description: 'Anything the user said that doesn\'t fit elsewhere. Empty string if nothing relevant.' },
    confidence: {
      type: SchemaType.STRING,
      enum: ['high', 'medium', 'low'],
      description: 'How sure you are about the macros. low = guessing, high = user gave specifics.',
    },
  },
  required: ['meal_type', 'items', 'total_calories', 'total_protein_g', 'confidence'],
};

const SYSTEM_PROMPT =
  'You are a nutrition-logging assistant. Given a user\'s plain-English meal description, return a single JSON object matching the schema. Use round numbers for calories and protein. If the user gives specific quantities (e.g. "200g chicken"), use them; otherwise estimate based on standard restaurant/home portion sizes. Always include at least one item. Return ONLY the JSON, no prose.';

async function parseAIHandler(req: VercelRequest, res: VercelResponse) {
  const client = getGenAI();
  if (!client) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'AI parser is not configured on this server. Set GEMINI_API_KEY in Vercel env to enable.');
  }

  const description = ((req.body ?? {}) as { description?: string }).description?.trim();
  if (!description) {
    return error(res, 400, 'VALIDATION_ERROR', 'Body must include a non-empty `description` field.');
  }
  if (description.length > 2000) {
    return error(res, 400, 'VALIDATION_ERROR', 'Description too long (max 2000 chars).');
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(description);
    const text = result.response.text();

    // Gemini's structured-output mode guarantees parseable JSON, but be defensive.
    let parsed: ParsedFoodResponse;
    try {
      parsed = JSON.parse(text) as ParsedFoodResponse;
    } catch {
      return error(res, 502, 'BAD_UPSTREAM', 'AI returned non-JSON output. Try rephrasing your meal.');
    }

    // Empty-string notes -> null so the frontend can use truthy checks.
    if (parsed.notes === '') parsed.notes = null;
    return success(res, parsed);
  } catch (err) {
    console.error('AI parse error:', err);
    const msg = err instanceof Error ? err.message : 'AI request failed';
    // Common failure modes: rate limit (429), invalid key (401), upstream issue.
    if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
      return error(res, 429, 'RATE_LIMITED', 'AI parser is busy. Try again in a few seconds, or fill in manually.');
    }
    return error(res, 502, 'BAD_UPSTREAM', msg);
  }
}
