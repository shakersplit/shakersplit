import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodSchema } from 'zod';
import { error } from '../utils/response.util';

export function validateBody<T>(
  req: VercelRequest,
  res: VercelResponse,
  schema: ZodSchema<T>,
): T | null {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    });

    error(res, 400, 'VALIDATION_ERROR', 'Invalid request body', fieldErrors);
    return null;
  }

  return result.data;
}
