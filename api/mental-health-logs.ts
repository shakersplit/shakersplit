/**
 * Mental health logs — single-file CRUD with ?id= dispatch + AI parser.
 *   GET    /api/mental-health-logs                       list
 *   POST   /api/mental-health-logs                       create
 *   GET    /api/mental-health-logs?id=:id                detail
 *   PUT    /api/mental-health-logs?id=:id                update
 *   DELETE /api/mental-health-logs?id=:id                delete
 *   POST   /api/mental-health-logs?action=parse-ai       parse plain-English description
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createMentalHealthLogSchema } from './_lib/validators/mental-health-log.validator';
import { supabaseAdmin } from './_lib/config/supabase.config';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';
import { parseWithGemini, respondParseResult } from './_lib/utils/gemini.util';

export default createHandler({
  async GET(req, res, user) {
    const id = req.query.id as string | undefined;
    if (id) {
      const { data, error: dbErr } = await supabaseAdmin
        .from('mental_health_logs')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (dbErr || !data) return error(res, 404, 'NOT_FOUND', 'Mental health log not found');
      return success(res, data);
    }

    const pagination = parsePagination(req);
    let query = supabaseAdmin
      .from('mental_health_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    if (from) query = query.gte('logged_at', from);
    if (to) query = query.lte('logged_at', to);

    const { data, count, error: dbErr } = await query;
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
  },

  async POST(req, res, user) {
    if (req.query.action === 'parse-ai') return parseMentalHandler(req, res);

    const body = validateBody(req, res, createMentalHealthLogSchema);
    if (!body) return;
    const { data, error: dbErr } = await supabaseAdmin
      .from('mental_health_logs')
      .insert({
        user_id: user.id,
        logged_at: body.logged_at || new Date().toISOString(),
        mood_score: body.mood_score,
        sleep_hours: body.sleep_hours,
        sleep_quality: body.sleep_quality,
        journal_entry: body.journal_entry,
        tags: body.tags ?? [],
      })
      .select()
      .single();
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return success(res, data, 201);
  },

  async PUT(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const body = validateBody(req, res, createMentalHealthLogSchema);
    if (!body) return;
    const { data, error: dbErr } = await supabaseAdmin
      .from('mental_health_logs')
      .update({
        logged_at: body.logged_at || new Date().toISOString(),
        mood_score: body.mood_score,
        sleep_hours: body.sleep_hours,
        sleep_quality: body.sleep_quality,
        journal_entry: body.journal_entry,
        tags: body.tags ?? [],
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (dbErr || !data) return error(res, 404, 'NOT_FOUND', 'Mental health log not found');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const id = req.query.id as string | undefined;
    if (!id) return error(res, 400, 'VALIDATION_ERROR', 'Missing id query param');
    const { error: dbErr } = await supabaseAdmin
      .from('mental_health_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (dbErr) return error(res, 404, 'NOT_FOUND', 'Mental health log not found');
    return success(res, { deleted: true });
  },
});

// ── AI parser ───────────────────────────────────────────────────────────────

interface ParsedMentalResponse {
  mood_score: number;
  sleep_hours?: number;
  sleep_quality?: number;
  journal_entry: string | null;
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
}

const MENTAL_SCHEMA = {
  type: 'object',
  properties: {
    mood_score: {
      type: 'number',
      description:
        '1-10 scale. 1=very low (suicidal ideation, despair), 3=down, 5=neutral, 7=good, 10=amazing. Map sentiment carefully — "feeling okay" should be 5-6, "great day" 8, "terrible morning" 3.',
    },
    sleep_hours: { type: 'number', description: 'Hours of sleep last night, 0-24. Convert ranges to midpoint (e.g. "7-8 hours" -> 7.5).' },
    sleep_quality: { type: 'number', description: '1-5 scale. 1=terrible (kept waking), 3=okay, 5=excellent (deep, refreshed).' },
    journal_entry: {
      type: 'string',
      description: 'Verbatim main content of what the user said about how they\'re feeling — this is what they\'ll see saved as their journal. Keep it conversational and first-person.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short single-word emotion/state labels: "anxious", "focused", "grateful", "tired", "energized". Up to 5.',
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['mood_score', 'journal_entry', 'tags', 'confidence'],
} as const;

const MENTAL_SYSTEM_PROMPT =
  "You are an empathetic mental-health-logging assistant. Given a user's plain-English description of how they're feeling and how they slept, return a single JSON object matching the schema. Treat them with compassion. journal_entry should be the user's own words, lightly normalized (fix typos, complete fragments). Do not add advice or invent content. Return ONLY the JSON.";

async function parseMentalHandler(req: VercelRequest, res: VercelResponse) {
  const description = ((req.body ?? {}) as { description?: string }).description ?? '';
  const result = await parseWithGemini<ParsedMentalResponse>({
    systemPrompt: MENTAL_SYSTEM_PROMPT,
    responseSchema: MENTAL_SCHEMA,
    description,
    postProcess: (raw) => {
      const r = raw as ParsedMentalResponse;
      if ((r.journal_entry as unknown) === '') r.journal_entry = null;
      if (!Array.isArray(r.tags)) r.tags = [];
      // Cap mood at 1-10 in case Gemini drifts.
      r.mood_score = Math.min(10, Math.max(1, Math.round(r.mood_score)));
      return r;
    },
  });
  return respondParseResult(res, result);
}
