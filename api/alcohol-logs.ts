/**
 * Alcohol logs — single-file CRUD handler with AI parser.
 *   GET/POST   /api/alcohol-logs
 *   GET/PUT/DELETE  /api/alcohol-logs?id=:id
 *   POST       /api/alcohol-logs?action=parse-ai
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createAlcoholLogSchema } from './_lib/validators/alcohol-log.validator';
import { alcoholLogRepository } from './_lib/repositories/alcohol-log.repository';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';
import { parseWithGemini, respondParseResult, makeShapeValidator } from './_lib/utils/gemini.util';

export default createHandler({
  async GET(req, res, user) {
    const id = req.query.id as string | undefined;
    if (id) {
      const { data, error: dbError } = await alcoholLogRepository.findById(id, user.id);
      if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
      return success(res, data);
    }

    const pagination = parsePagination(req);
    const filters = {
      userId: user.id,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };
    const { data, count, error: dbError } = await alcoholLogRepository.findAll(filters, pagination);
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
  },

  async POST(req, res, user) {
    if (req.query.action === 'parse-ai') return parseAlcoholHandler(req, res);

    const body = validateBody(req, res, createAlcoholLogSchema);
    if (!body) return;
    const { data, error: dbError } = await alcoholLogRepository.create({
      user_id: user.id,
      logged_at: body.logged_at || new Date().toISOString(),
      spirit_type: body.spirit_type,
      quantity_ml: body.quantity_ml,
      mixer: body.mixer,
      pre_game_meal_eaten: body.pre_game_meal_eaten,
      water_consumed_ml: body.water_consumed_ml,
      intoxication_level: body.intoxication_level,
      hangover_severity: body.hangover_severity,
      notes: body.notes,
      share_with_friends: body.share_with_friends ?? false,
    });
    if (dbError) return error(res, 500, 'INTERNAL_ERROR', dbError.message);
    return success(res, data, 201);
  },

  async PUT(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const body = validateBody(req, res, createAlcoholLogSchema);
    if (!body) return;
    const { data, error: dbError } = await alcoholLogRepository.update(id, user.id, {
      logged_at: body.logged_at || new Date().toISOString(),
      spirit_type: body.spirit_type,
      quantity_ml: body.quantity_ml,
      mixer: body.mixer,
      pre_game_meal_eaten: body.pre_game_meal_eaten,
      water_consumed_ml: body.water_consumed_ml,
      intoxication_level: body.intoxication_level,
      hangover_severity: body.hangover_severity,
      notes: body.notes,
      share_with_friends: body.share_with_friends ?? false,
    });
    if (dbError || !data) return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { error: dbError } = await alcoholLogRepository.delete(id, user.id);
    if (dbError) return error(res, 404, 'NOT_FOUND', 'Alcohol log not found');
    return success(res, { deleted: true });
  },
});

// ── AI parser ───────────────────────────────────────────────────────────────

interface ParsedAlcoholResponse {
  spirit_type: string;
  quantity_ml: number;
  mixer: string | null;
  pre_game_meal_eaten: boolean;
  water_consumed_ml?: number;
  intoxication_level?: number;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const ALCOHOL_SCHEMA = {
  type: 'object',
  properties: {
    spirit_type: {
      type: 'string',
      description:
        "Lowercase canonical type: vodka, gin, tequila, rum, whiskey, beer, wine, cocktail, other. If user says a specific cocktail name (negroni, mojito), use 'cocktail'. If multiple drinks, pick the dominant one and note the others in notes.",
    },
    quantity_ml: {
      type: 'number',
      description:
        'Total ml. Standard pours: 1 shot/peg = 30ml, double = 60ml, beer pint = 500ml, beer can = 330ml, wine glass = 150ml, wine bottle = 750ml. Convert from oz: 1 oz = 30ml. If user says "2 vodka shots" -> 60.',
    },
    mixer: { type: 'string', description: "What it was mixed with (e.g. 'soda water', 'tonic'). Empty string if neat or no mixer." },
    pre_game_meal_eaten: { type: 'boolean', description: 'True if user mentioned eating beforehand (dinner, snack, food).' },
    water_consumed_ml: { type: 'number', description: 'Water alongside. Estimate ~250ml per glass mentioned.' },
    intoxication_level: { type: 'number', description: '1=sober, 2=buzzed, 3=tipsy, 4=drunk, 5=blackout. Inferred from context.' },
    notes: { type: 'string', description: "Occasion, who they were with, anything else. Empty string if nothing relevant." },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['spirit_type', 'quantity_ml', 'pre_game_meal_eaten', 'confidence'],
} as const;

const ALCOHOL_SYSTEM_PROMPT =
  "You are an alcohol-logging assistant. Given a user's plain-English drink description, return a single JSON object matching the schema. " +
  "CRITICAL — quantity_ml must be the AMOUNT OF PURE SPIRIT/BEER/WINE consumed, NOT total drink volume. " +
  "For mixed drinks, include only the alcoholic part: '2 vodka sodas' = 60ml (2 × 30ml shots), the soda is in mixer. " +
  "For cocktails like a negroni, sum only the alcoholic ingredients (gin + vermouth + campari = ~90ml total alcohol), and pick the dominant spirit as spirit_type. " +
  "Standard ml: shot/peg = 30ml, double = 60ml, beer can = 330ml, beer pint = 500ml, wine glass = 150ml, wine bottle = 750ml. " +
  "spirit_type must be lowercase: vodka, gin, tequila, rum, whiskey, beer, wine, cocktail, other. " +
  "Set pre_game_meal_eaten=true if any food was mentioned. Return ONLY the JSON.";

async function parseAlcoholHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';
  const result = await parseWithGemini<ParsedAlcoholResponse>({
    systemPrompt: ALCOHOL_SYSTEM_PROMPT,
    responseSchema: ALCOHOL_SCHEMA,
    description,
    validate: makeShapeValidator({
      required: ['spirit_type', 'quantity_ml', 'pre_game_meal_eaten', 'confidence'],
      types: { spirit_type: 'string', quantity_ml: 'number', pre_game_meal_eaten: 'boolean', confidence: 'string' },
    }),
    postProcess: (raw) => {
      const r = raw as ParsedAlcoholResponse;
      if ((r.notes as unknown) === '') r.notes = null;
      if ((r.mixer as unknown) === '') r.mixer = null;
      // Normalize: spirit_type to lowercase regardless of what Gemini returned.
      if (typeof r.spirit_type === 'string') r.spirit_type = r.spirit_type.toLowerCase();
      return r;
    },
  });
  return respondParseResult(res, result);
}
