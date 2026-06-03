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
 * Strict JSON schema we ask Gemini to produce. Properties match the food-logs database
 * shape so the frontend can drop the response straight into the form.
 */
const RESPONSE_SCHEMA = {
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
    total_calories: { type: 'number', description: 'Sum of per-item calorie estimates.' },
    total_protein_g: { type: 'number', description: 'Sum of per-item protein estimates.' },
    notes: { type: 'string', description: "Anything the user said that doesn't fit elsewhere. Empty string if nothing relevant." },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How sure you are about the macros. low = guessing, high = user gave specifics.',
    },
  },
  required: ['meal_type', 'items', 'total_calories', 'total_protein_g', 'confidence'],
} as const;

const SYSTEM_PROMPT =
  "You are a nutrition-logging assistant. Given a user's plain-English meal description, return a single JSON object matching the schema. Use round numbers for calories and protein. If the user gives specific quantities (e.g. \"200g chicken\"), use them; otherwise estimate based on standard restaurant/home portion sizes. Always include at least one item. Return ONLY the JSON, no prose.";

async function parseAIHandler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'AI parser is not configured on this server. Set GEMINI_API_KEY in Vercel env to enable.');
  }

  const description = ((req.body ?? {}) as { description?: string }).description?.trim();
  if (!description) {
    return error(res, 400, 'VALIDATION_ERROR', 'Body must include a non-empty `description` field.');
  }
  if (description.length > 2000) {
    return error(res, 400, 'VALIDATION_ERROR', 'Description too long (max 2000 chars).');
  }

  // Direct REST call — works for both legacy AIzaSy* keys and the newer AQ.Ab* short-lived keys.
  // The @google/generative-ai SDK rejects the new key format as of late 2026.
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
  const requestBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.error('Gemini fetch failed:', err);
    return error(res, 502, 'BAD_UPSTREAM', 'Could not reach Gemini. Try again or fill in manually.');
  }

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text();
    console.error('Gemini error response:', geminiResponse.status, text.slice(0, 500));
    if (geminiResponse.status === 429) {
      return error(res, 429, 'RATE_LIMITED', 'AI parser is busy. Try again in a few seconds, or fill in manually.');
    }
    if (geminiResponse.status === 401 || geminiResponse.status === 403) {
      return error(res, 502, 'BAD_UPSTREAM', 'AI key was rejected. Tell the developer.');
    }
    return error(res, 502, 'BAD_UPSTREAM', `Gemini returned ${geminiResponse.status}.`);
  }

  // Gemini's structured-output mode returns the JSON string in candidates[0].content.parts[0].text.
  let body: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  try {
    body = (await geminiResponse.json()) as typeof body;
  } catch {
    return error(res, 502, 'BAD_UPSTREAM', 'AI returned non-JSON envelope.');
  }

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return error(res, 502, 'BAD_UPSTREAM', 'AI returned empty response.');
  }

  let parsed: ParsedFoodResponse;
  try {
    parsed = JSON.parse(text) as ParsedFoodResponse;
  } catch {
    return error(res, 502, 'BAD_UPSTREAM', 'AI returned malformed JSON.');
  }

  // Empty-string notes -> null so the frontend can use truthy checks.
  if (parsed.notes === '') parsed.notes = null;
  return success(res, parsed);
}
