import type { VercelRequest } from '@vercel/node';
import type { PaginationParams } from '../types';

export function parsePagination(req: VercelRequest): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page)) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
