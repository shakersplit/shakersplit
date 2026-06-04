import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.VITE_APP_URL,
].filter((s): s is string => Boolean(s));

/**
 * CORS gate. Returns true if the request is OPTIONS (and we've already responded with 204);
 * the caller should bail out in that case.
 *
 * Origin policy: only emit Access-Control-Allow-Origin when the request origin is on the
 * allow-list. Unknown origins get no CORS header at all, which causes the browser to block
 * the response — much safer than the previous behavior of pinning unknown origins to the
 * first allowed entry (a silent permission escalation).
 *
 * Same-origin requests (no Origin header, e.g. curl, server-to-server) still work fine
 * because the browser doesn't enforce CORS on those.
 */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (origin) {
    // Origin present but not allowed — log so we can spot misconfigured deploys, then
    // simply omit the CORS header. The browser's CORS check will fail downstream.
    console.warn(`[cors] blocked request from origin ${origin}`);
  }
  // No origin header (same-origin / non-browser caller) — proceed normally.

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
