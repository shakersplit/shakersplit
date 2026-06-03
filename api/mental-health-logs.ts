/**
 * Mental health logs — single-file CRUD with ?id= dispatch.
 *   GET    /api/mental-health-logs                 list (paginated, optional from/to filters)
 *   POST   /api/mental-health-logs                 create
 *   GET    /api/mental-health-logs?id=:id          detail
 *   PUT    /api/mental-health-logs?id=:id          update
 *   DELETE /api/mental-health-logs?id=:id          delete
 */
import { createHandler } from './_lib/factories/handler.factory';
import { validateBody } from './_lib/middleware/validate.middleware';
import { createMentalHealthLogSchema } from './_lib/validators/mental-health-log.validator';
import { supabaseAdmin } from './_lib/config/supabase.config';
import { parsePagination } from './_lib/utils/pagination.util';
import { success, paginated, error } from './_lib/utils/response.util';

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
