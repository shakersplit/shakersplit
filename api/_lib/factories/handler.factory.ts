import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../middleware/cors.middleware';
import { verifyAuth } from '../middleware/auth.middleware';
import { error } from '../utils/response.util';
import type { AuthUser } from '../types';

type Handler = (req: VercelRequest, res: VercelResponse, user: AuthUser) => Promise<void>;

interface HandlerConfig {
  GET?: Handler;
  POST?: Handler;
  PUT?: Handler;
  PATCH?: Handler;
  DELETE?: Handler;
}

export function createHandler(config: HandlerConfig) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // CORS
      if (cors(req, res)) return;

      // Auth
      const user = await verifyAuth(req, res);
      if (!user) return;

      // Route to method
      const method = req.method?.toUpperCase() as keyof HandlerConfig;
      const handler = config[method];

      if (!handler) {
        return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`);
      }

      await handler(req, res, user);
    } catch (err) {
      console.error('Unhandled API error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  };
}
