/**
 * Plans catch-all — single Vercel function dispatches across all /api/plans/* routes.
 * This keeps us under Hobby's 12-function limit.
 *
 * Path matrix:
 *   GET    /api/plans                          → list
 *   POST   /api/plans                          → create (idempotent on week_start_date)
 *   GET    /api/plans/:id                      → detail (with entries)
 *   PUT    /api/plans/:id                      → update name/is_template
 *   DELETE /api/plans/:id                      → delete plan + cascade entries
 *   GET    /api/plans/:id/entries              → list entries
 *   POST   /api/plans/:id/entries              → create entry
 *   PUT    /api/plans/:id/entries/:entryId     → update entry
 *   DELETE /api/plans/:id/entries/:entryId     → delete entry
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/middleware/cors.middleware';
import { verifyAuth } from '../_lib/middleware/auth.middleware';
import { validateBody } from '../_lib/middleware/validate.middleware';
import {
  createPlanSchema,
  updatePlanSchema,
  createPlanEntrySchema,
  updatePlanEntrySchema,
} from '../_lib/validators/plan.validator';
import { planRepository } from '../_lib/repositories/plan.repository';
import { parsePagination } from '../_lib/utils/pagination.util';
import { success, paginated, error } from '../_lib/utils/response.util';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const user = await verifyAuth(req, res);
  if (!user) return;

  // Vercel passes the catch-all segments as req.query.path (array) when configured as
  // [...path].ts, OR as a single string when there's only one segment. Normalize.
  const rawPath = req.query.path;
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const method = req.method?.toUpperCase();

  try {
    // /api/plans
    if (segments.length === 0) {
      if (method === 'GET') {
        const pagination = parsePagination(req);
        const isTemplateRaw = req.query.is_template as string | undefined;
        const filters = {
          userId: user.id,
          isTemplate: isTemplateRaw === undefined ? undefined : isTemplateRaw === 'true',
          weekStartDate: req.query.week_start_date as string | undefined,
        };
        const { data, count, error: dbErr } = await planRepository.findAll(filters, pagination);
        if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
        return paginated(res, data ?? [], { page: pagination.page, limit: pagination.limit, total: count ?? 0 });
      }
      if (method === 'POST') {
        const body = validateBody(req, res, createPlanSchema);
        if (!body) return;
        const existing = await planRepository.findByWeek(user.id, body.week_start_date);
        if (existing.data) return success(res, existing.data, 200);
        const { data, error: dbErr } = await planRepository.create({
          user_id: user.id,
          week_start_date: body.week_start_date,
          name: body.name,
          is_template: body.is_template ?? false,
        });
        if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
        return success(res, data, 201);
      }
      return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
    }

    // /api/plans/:id
    if (segments.length === 1) {
      const planId = segments[0]!;
      if (method === 'GET') {
        const { data, error: dbErr } = await planRepository.findByIdWithEntries(planId, user.id);
        if (dbErr || !data) return error(res, 404, 'NOT_FOUND', 'Plan not found');
        return success(res, data);
      }
      if (method === 'PUT') {
        const body = validateBody(req, res, updatePlanSchema);
        if (!body) return;
        const { data, error: dbErr } = await planRepository.update(planId, user.id, body);
        if (dbErr || !data) return error(res, 404, 'NOT_FOUND', 'Plan not found');
        return success(res, data);
      }
      if (method === 'DELETE') {
        const { error: dbErr } = await planRepository.delete(planId, user.id);
        if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
        return success(res, { deleted: true });
      }
      return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
    }

    // /api/plans/:id/entries
    if (segments.length === 2 && segments[1] === 'entries') {
      const planId = segments[0]!;
      if (method === 'GET') {
        const dayOfWeekParam = req.query.day_of_week as string | undefined;
        const category = req.query.category as string | undefined;
        const filters: { day_of_week?: number; category?: string } = {};
        if (dayOfWeekParam !== undefined) filters.day_of_week = Number(dayOfWeekParam);
        if (category) filters.category = category;
        const { data, error: dbErr } = await planRepository.findEntries(planId, user.id, filters);
        if (dbErr) return error(res, 404, 'NOT_FOUND', dbErr.message ?? 'Plan not found');
        return success(res, data ?? []);
      }
      if (method === 'POST') {
        const owns = await planRepository.ensurePlanOwnership(planId, user.id);
        if (!owns) return error(res, 404, 'NOT_FOUND', 'Plan not found');
        const body = validateBody(req, res, createPlanEntrySchema);
        if (!body) return;
        const { data, error: dbErr } = await planRepository.createEntry(planId, body);
        if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
        return success(res, data, 201);
      }
      return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
    }

    // /api/plans/:id/entries/:entryId
    if (segments.length === 3 && segments[1] === 'entries') {
      const entryId = segments[2]!;
      const owned = await planRepository.findEntryWithPlanOwner(entryId, user.id);
      if (!owned.data) return error(res, 404, 'NOT_FOUND', 'Entry not found');
      if (method === 'PUT') {
        const body = validateBody(req, res, updatePlanEntrySchema);
        if (!body) return;
        const { data, error: dbErr } = await planRepository.updateEntry(entryId, body);
        if (dbErr || !data) return error(res, 500, 'INTERNAL_ERROR', dbErr?.message ?? 'Update failed');
        return success(res, data);
      }
      if (method === 'DELETE') {
        const { error: dbErr } = await planRepository.deleteEntry(entryId);
        if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
        return success(res, { deleted: true });
      }
      return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} not allowed`);
    }

    return error(res, 404, 'NOT_FOUND', `No route for /api/plans/${segments.join('/')}`);
  } catch (err) {
    console.error('Unhandled /api/plans/* error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}
