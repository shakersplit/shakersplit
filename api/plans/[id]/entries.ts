/**
 * Plan entries — list/create/update/delete via query-param dispatch.
 *   GET    /api/plans/:id/entries                          list entries
 *   POST   /api/plans/:id/entries                          create entry
 *   PUT    /api/plans/:id/entries?entryId=:entryId         update entry
 *   DELETE /api/plans/:id/entries?entryId=:entryId         delete entry
 *
 * Single file because Vercel Hobby has a 12-function limit; collapsing the entry detail
 * route into this file via ?entryId= keeps us under the cap.
 */
import { createHandler } from '../../_lib/factories/handler.factory';
import { validateBody } from '../../_lib/middleware/validate.middleware';
import { createPlanEntrySchema, updatePlanEntrySchema } from '../../_lib/validators/plan.validator';
import { planRepository } from '../../_lib/repositories/plan.repository';
import { success, error } from '../../_lib/utils/response.util';

export default createHandler({
  async GET(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');
    const dayOfWeekParam = req.query.day_of_week as string | undefined;
    const category = req.query.category as string | undefined;
    const filters: { day_of_week?: number; category?: string } = {};
    if (dayOfWeekParam !== undefined) filters.day_of_week = Number(dayOfWeekParam);
    if (category) filters.category = category;
    const { data, error: dbErr } = await planRepository.findEntries(planId, user.id, filters);
    if (dbErr) return error(res, 404, 'NOT_FOUND', dbErr.message ?? 'Plan not found');
    return success(res, data ?? []);
  },

  async POST(req, res, user) {
    const planId = req.query.id as string;
    if (!planId) return error(res, 400, 'VALIDATION_ERROR', 'Missing plan id');
    const owns = await planRepository.ensurePlanOwnership(planId, user.id);
    if (!owns) return error(res, 404, 'NOT_FOUND', 'Plan not found');
    const body = validateBody(req, res, createPlanEntrySchema);
    if (!body) return;
    const { data, error: dbErr } = await planRepository.createEntry(planId, body);
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return success(res, data, 201);
  },

  async PUT(req, res, user) {
    const entryId = req.query.entryId as string | undefined;
    if (!entryId) return error(res, 400, 'VALIDATION_ERROR', 'Missing entryId query param');
    const owned = await planRepository.findEntryWithPlanOwner(entryId, user.id);
    if (!owned.data) return error(res, 404, 'NOT_FOUND', 'Entry not found');
    const body = validateBody(req, res, updatePlanEntrySchema);
    if (!body) return;
    const { data, error: dbErr } = await planRepository.updateEntry(entryId, body);
    if (dbErr || !data) return error(res, 500, 'INTERNAL_ERROR', dbErr?.message ?? 'Update failed');
    return success(res, data);
  },

  async DELETE(req, res, user) {
    const entryId = req.query.entryId as string | undefined;
    if (!entryId) return error(res, 400, 'VALIDATION_ERROR', 'Missing entryId query param');
    const owned = await planRepository.findEntryWithPlanOwner(entryId, user.id);
    if (!owned.data) return error(res, 404, 'NOT_FOUND', 'Entry not found');
    const { error: dbErr } = await planRepository.deleteEntry(entryId);
    if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
    return success(res, { deleted: true });
  },
});
